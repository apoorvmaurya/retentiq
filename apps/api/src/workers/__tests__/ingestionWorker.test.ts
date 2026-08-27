import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  processIngestionJobs,
  handleStripeJob,
  handleCsvJob,
  handleIntercomJob,
  handleMixpanelJob,
  startIngestionWorker,
  stopIngestionWorker,
} from '../ingestionWorker.js';
import { db } from '../../lib/db.js';

vi.mock('../../lib/featureEngine.js', () => ({
  computeAndTriggerRescore: vi.fn().mockResolvedValue({ score: 85 }),
}));

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
        returning: vi.fn().mockResolvedValue([{ id: 'cust-new' }]),
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
  };

  return {
    db: mockDb,
    schema: {
      jobs: { id: 'job_id', status: 'status' },
      customers: { id: 'cust_id', orgId: 'org_id', email: 'email' },
      events: {
        customerId: 'cust_id',
        orgId: 'org_id',
        occurredAt: 'occurred_at',
        eventType: 'event_type',
      },
      organizations: { id: 'org_id' },
      integrations: { id: 'int_id', orgId: 'org_id', provider: 'provider', status: 'status' },
    },
  };
});

describe('Ingestion Worker Suite', () => {
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
    stopIngestionWorker();
  });

  describe('startIngestionWorker and stopIngestionWorker', () => {
    it('should start and stop poller interval without error', () => {
      expect(() => startIngestionWorker()).not.toThrow();
      expect(() => stopIngestionWorker()).not.toThrow();
    });

    it('should respect DISABLE_BACKGROUND_WORKERS environment variable', () => {
      const orig = process.env.DISABLE_BACKGROUND_WORKERS;
      process.env.DISABLE_BACKGROUND_WORKERS = 'true';
      expect(() => startIngestionWorker()).not.toThrow();
      process.env.DISABLE_BACKGROUND_WORKERS = orig;
    });
  });

  describe('processIngestionJobs', () => {
    it('should return early when no queued jobs exist', async () => {
      (db.select as any).mockReturnValue(createMockChain([]));
      await processIngestionJobs();
      expect(db.update).not.toHaveBeenCalled();
    });

    it('should process stripe job and mark completed', async () => {
      const mockJob = {
        id: 'job-1',
        orgId: 'org-1',
        type: 'stripe',
        payload: {
          type: 'customer.subscription.updated',
          data: {
            object: {
              customer_email: 'user@example.com',
              items: { data: [{ price: { unit_amount: 5000, nickname: 'Pro' } }] },
            },
          },
        },
      };

      let call = 0;
      (db.select as any).mockImplementation(() => {
        call++;
        if (call === 1) return createMockChain([mockJob]);
        return createMockChain([
          { id: 'cust-1', orgId: 'org-1', email: 'user@example.com', planTier: 'Basic' },
        ]);
      });

      await processIngestionJobs();
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('handleStripeJob', () => {
    it('should handle subscription deleted and payment failed events', async () => {
      const mockCustomer = {
        id: 'cust-1',
        orgId: 'org-1',
        email: 'user@example.com',
        planTier: 'Pro',
      };
      (db.select as any).mockReturnValue(createMockChain([mockCustomer]));

      const deletedEvent = {
        type: 'customer.subscription.deleted',
        data: { object: { customer_email: 'user@example.com' } },
      };

      await handleStripeJob(deletedEvent, 'org-1');
      expect(db.update).toHaveBeenCalled();

      const failedEvent = {
        type: 'invoice.payment_failed',
        data: { object: { customer_email: 'user@example.com', amount_due: 1000 } },
      };

      await handleStripeJob(failedEvent, 'org-1');
      expect(db.insert).toHaveBeenCalled();
    });

    it('should auto-create customer for stripe event when email is present', async () => {
      let call = 0;
      (db.select as any).mockImplementation(() => {
        call++;
        if (call === 1) return createMockChain([]); // customer not found
        if (call === 2) return createMockChain([{ id: 'org-1' }]); // org exists
        return createMockChain([]);
      });

      const updatedEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer_email: 'newuser@example.com',
            items: { data: [{ price: { unit_amount: 2000, nickname: 'Starter' } }] },
          },
        },
      };

      await handleStripeJob(updatedEvent, 'org-1');
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('handleCsvJob', () => {
    it('should validate and insert csv events and auto-create new customers', async () => {
      const validUuid = '11111111-1111-4111-8111-111111111111';
      const csv = `customer_id,event_type,occurred_at,feature,payload\n${validUuid},feature_use,2026-08-25T12:00:00Z,analytics,"{\\"tab\\":\\"overview\\"}"`;

      (db.select as any).mockReturnValue(createMockChain([]));

      await handleCsvJob({ csvContent: csv }, 'org-1');
      expect(db.insert).toHaveBeenCalled();
    });

    it('should throw validation error for invalid csv formatted rows', async () => {
      const invalidCsv = `customer_id,event_type,occurred_at\ninvalid-uuid,login,not-a-date`;
      await expect(handleCsvJob({ csvContent: invalidCsv }, 'org-1')).rejects.toThrow();
    });
  });

  describe('handleIntercomJob', () => {
    it('should record ticket creation and csat responses', async () => {
      const mockCustomer = { id: 'cust-1', orgId: 'org-1', email: 'user@example.com' };
      (db.select as any).mockReturnValue(createMockChain([mockCustomer]));

      const ticketPayload = {
        topic: 'conversation.created',
        data: {
          item: {
            id: 'conv-1',
            title: 'Need help with feature',
            user: { email: 'user@example.com' },
          },
        },
      };

      await handleIntercomJob(ticketPayload, 'org-1');
      expect(db.insert).toHaveBeenCalled();

      const ratingPayload = {
        topic: 'conversation.rated',
        data: {
          item: {
            user: { email: 'user@example.com' },
            conversation_rating: { rating: 5, remark: 'Great!' },
          },
        },
      };

      await handleIntercomJob(ratingPayload, 'org-1');
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('handleMixpanelJob', () => {
    it('should throw when mixpanel integration is not found', async () => {
      (db.select as any).mockReturnValue(createMockChain([]));
      await expect(handleMixpanelJob({}, 'org-1')).rejects.toThrow();
    });

    it('should process mixpanel exported events when integration credentials are valid', async () => {
      const mockIntegration = {
        id: 'mix-1',
        orgId: 'org-1',
        provider: 'mixpanel',
        status: 'active',
        config: {
          mixpanelServiceAccountUsername: 'svc_user',
          mixpanelServiceAccountSecret: 'svc_sec',
        },
      };

      let call = 0;
      (db.select as any).mockImplementation(() => {
        call++;
        if (call === 1) return createMockChain([mockIntegration]);
        if (call === 2) return createMockChain([{ id: 'cust-1', orgId: 'org-1' }]);
        return createMockChain([]);
      });

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '{"event":"$login","properties":{"distinct_id":"cust-1","time":1700000000}}\n',
      } as Response);

      await handleMixpanelJob({}, 'org-1');
      expect(fetchSpy).toHaveBeenCalled();
    });
  });
});
