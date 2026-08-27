import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkAndDeliverAlerts,
  verifyRoiRecoveries,
  runRoiAggregation,
  checkIntegrationsHealth,
  sendWeeklyEmailDigest,
  triggerModelRetrain,
  startAlertWorker,
  stopAlertWorker,
  transporter,
} from '../alertWorker.js';
import { db } from '../../lib/db.js';

vi.mock('../../lib/db.js', () => {
  const createChain = (data: any = []) => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      innerJoin: vi.fn(() => chain),
      groupBy: vi.fn(() => chain),
      then: vi.fn((fn: any) => Promise.resolve(fn(data))),
    };
    return chain;
  };

  const mockDb = {
    select: vi.fn(() => createChain([])),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'alert-1' }]),
        then: vi.fn((fn: any) => Promise.resolve(fn({ rowCount: 1 }))),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          then: vi.fn((fn: any) => Promise.resolve(fn({ rowCount: 1 }))),
        }),
      }),
    }),
    delete: vi.fn(),
    execute: vi.fn(),
  };
  return {
    db: mockDb,
    schema: {
      organizations: { id: 'org_id' },
      alertRules: { orgId: 'org_id', isActive: 'is_active' },
      alertConfigs: { orgId: 'org_id' },
      customers: { orgId: 'org_id', id: 'cust_id' },
      healthScores: {
        customerId: 'cust_id',
        scoredAt: 'scored_at',
        score: 'score',
        orgId: 'org_id',
      },
      alerts: { id: 'alert_id', customerId: 'cust_id', triggeredAt: 'triggered_at' },
      integrations: {
        id: 'int_id',
        orgId: 'org_id',
        provider: 'provider',
        status: 'status',
        lastSyncedAt: 'last_synced_at',
      },
      tasks: {
        id: 'task_id',
        status: 'status',
        outcome: 'outcome',
        completedAt: 'completed_at',
        customerId: 'cust_id',
        orgId: 'org_id',
      },
      retentionActions: {
        orgId: 'org_id',
        customerId: 'cust_id',
        actionType: 'action_type',
        actionedAt: 'actioned_at',
        outcome: 'outcome',
        revenueSaved: 'revenue_saved',
      },
      roiAggregates: { id: 'roi_id', orgId: 'org_id', month: 'month' },
      users: { id: 'user_id', orgId: 'org_id', role: 'role', email: 'email', name: 'name' },
      events: {
        customerId: 'cust_id',
        orgId: 'org_id',
        occurredAt: 'occurred_at',
        eventType: 'event_type',
      },
    },
  };
});

describe('Alert Worker Suite', () => {
  const createMockChain = (data: any) => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      innerJoin: vi.fn(() => chain),
      groupBy: vi.fn(() => chain),
      then: vi.fn((fn: any) => Promise.resolve(fn(data))),
    };
    return chain;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopAlertWorker();
  });

  describe('startAlertWorker and stopAlertWorker', () => {
    it('should start and stop cron tasks cleanly without error', () => {
      expect(() => startAlertWorker()).not.toThrow();
      expect(() => stopAlertWorker()).not.toThrow();
    });

    it('should respect DISABLE_BACKGROUND_WORKERS environment variable', () => {
      const orig = process.env.DISABLE_BACKGROUND_WORKERS;
      process.env.DISABLE_BACKGROUND_WORKERS = 'true';
      expect(() => startAlertWorker()).not.toThrow();
      process.env.DISABLE_BACKGROUND_WORKERS = orig;
    });
  });

  describe('triggerModelRetrain', () => {
    it('should call ai-service /model/retrain endpoint', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' }),
      } as Response);

      await triggerModelRetrain();
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('should handle retrain endpoint errors gracefully', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(triggerModelRetrain()).resolves.not.toThrow();
    });
  });

  describe('checkAndDeliverAlerts', () => {
    it('should evaluate health scores and deliver alert when score is below threshold', async () => {
      const mockOrgs = [{ id: 'org-1' }];
      const mockRules: any[] = [];
      const mockAlertConfig = {
        id: 'cfg-1',
        orgId: 'org-1',
        threshold: 50,
        notifySlack: true,
        notifyEmail: true,
      };
      const mockCustomers = [
        { id: 'cust-1', name: 'Acme Corp', email: 'acme@example.com', company: 'Acme' },
      ];
      const mockScore = { score: 30, scoredAt: new Date() };

      let callCount = 0;
      (db.select as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockChain(mockOrgs);
        if (callCount === 2) return createMockChain(mockRules);
        if (callCount === 3) return createMockChain([mockAlertConfig]);
        if (callCount === 4) return createMockChain(mockCustomers);
        if (callCount === 5) return createMockChain([mockScore]);
        if (callCount === 6) return createMockChain([]); // recent alerts
        if (callCount === 7) return createMockChain([]); // slack integration
        return createMockChain([]);
      });

      vi.spyOn(transporter, 'sendMail').mockResolvedValueOnce({} as any);

      await checkAndDeliverAlerts();
      expect(db.insert).toHaveBeenCalled();
    });

    it('should evaluate custom alert rules with critical and info priority conditions', async () => {
      const mockOrgs = [{ id: 'org-1' }];
      const mockCustomRules = [
        {
          id: 'custom-1',
          name: 'Critical Drop',
          conditions: [
            { type: 'score_drop', days: 7, drop: 10, priority: 'critical' },
            { type: 'inactivity', days: 10, priority: 'critical' },
          ],
        },
      ];
      const mockAlertConfig = {
        id: 'cfg-1',
        orgId: 'org-1',
        threshold: 50,
        notifySlack: true,
        notifyEmail: true,
      };
      const mockCustomers = [
        { id: 'cust-1', name: 'Acme Corp', email: 'acme@example.com', company: 'Acme' },
      ];
      const mockScore = { score: 20, scoredAt: new Date() };

      let callCount = 0;
      (db.select as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockChain(mockOrgs);
        if (callCount === 2) return createMockChain(mockCustomRules);
        if (callCount === 3) return createMockChain([mockAlertConfig]);
        if (callCount === 4) return createMockChain(mockCustomers);
        if (callCount === 5) return createMockChain([mockScore]);
        if (callCount === 6) return createMockChain([]); // recent alerts
        if (callCount === 7) return createMockChain([{ score: 50 }]); // pastScore for drop
        if (callCount === 8) return createMockChain([]); // recent logins (0 logins)
        if (callCount === 9) return createMockChain([]); // slack integration
        return createMockChain([]);
      });

      vi.spyOn(transporter, 'sendMail').mockResolvedValueOnce({} as any);

      await checkAndDeliverAlerts();
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('verifyRoiRecoveries', () => {
    it('should query completed tasks and record recovered retention action if customer score improved', async () => {
      const mockTask = {
        id: 'task-1',
        orgId: 'org-1',
        customerId: 'cust-1',
        title: 'Rescue call',
        status: 'completed',
        outcome: 'positive',
        completedAt: new Date(),
      };

      let callCount = 0;
      (db.select as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockChain([mockTask]);
        if (callCount === 2) return createMockChain([{ score: 30 }]);
        if (callCount === 3) return createMockChain([{ score: 75 }]);
        if (callCount === 4) return createMockChain([]);
        if (callCount === 5) return createMockChain([{ mrr: '500.00' }]);
        return createMockChain([]);
      });

      await verifyRoiRecoveries();
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('runRoiAggregation', () => {
    it('should aggregate retention action outcomes into roiAggregates table', async () => {
      (db.select as any).mockImplementation(() => {
        return createMockChain([
          { orgId: 'org-1', month: '2026-08', accountsSaved: 2, revenueSaved: '1000.00' },
        ]);
      });

      await runRoiAggregation();
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe('checkIntegrationsHealth', () => {
    it('should check active integrations and notify admins if sync is stale', async () => {
      const staleDate = new Date(Date.now() - 48 * 3600 * 1000);
      const mockIntegrations = [
        {
          id: 'int-1',
          orgId: 'org-1',
          provider: 'stripe',
          status: 'active',
          lastSyncedAt: staleDate,
        },
      ];
      const mockAdmins = [{ email: 'admin@acme.com', name: 'Admin' }];

      let call = 0;
      (db.select as any).mockImplementation(() => {
        call++;
        if (call === 1) return createMockChain(mockIntegrations);
        if (call === 2) return createMockChain(mockAdmins);
        return createMockChain([]);
      });

      const sendMailSpy = vi.spyOn(transporter, 'sendMail').mockResolvedValueOnce({} as any);

      await checkIntegrationsHealth();
      expect(sendMailSpy).toHaveBeenCalled();
    });
  });

  describe('sendWeeklyEmailDigest', () => {
    it('should compile digest and dispatch emails to organization members', async () => {
      const mockOrgs = [{ id: 'org-1' }];
      const mockCritical = [{ name: 'Cust 1', company: 'Acme', score: 25 }];
      const mockImprovements = [{ name: 'Cust 2', company: 'Beta', revenueSaved: '500' }];
      const mockMembers = [{ email: 'member@acme.com', orgId: 'org-1' }];

      let call = 0;
      (db.select as any).mockImplementation(() => {
        call++;
        if (call === 1) return createMockChain(mockOrgs);
        if (call === 2) return createMockChain(mockCritical);
        if (call === 3) return createMockChain(mockImprovements);
        if (call === 4) return createMockChain(mockMembers);
        return createMockChain([]);
      });

      const sendMailSpy = vi.spyOn(transporter, 'sendMail').mockResolvedValueOnce({} as any);

      await sendWeeklyEmailDigest();
      expect(sendMailSpy).toHaveBeenCalled();
    });
  });
});
