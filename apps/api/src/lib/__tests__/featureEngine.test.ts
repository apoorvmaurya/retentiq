import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DB
vi.mock('../db.js', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
  };
  const mockSchema = {
    customers: { id: 'customers.id' },
    events: {
      customerId: 'events.customerId',
      orgId: 'events.orgId',
      occurredAt: 'events.occurredAt',
      eventType: 'events.eventType',
    },
    healthScores: {},
  };
  return { db: mockDb, schema: mockSchema };
});

import { db } from '../db.js';
import { computeFeatures, computeAndTriggerRescore } from '../featureEngine.js';

describe('Feature Engine Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('computes expected default feature dictionary when no events exist', async () => {
    // Mock customer query
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 'cust-1',
              planTier: 'Enterprise',
              createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
            },
          ]),
        }),
      }),
    });

    // Mock 30d events query (empty)
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    // Mock first event query (null)
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      }),
    });

    // Mock crm sync events query (null)
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      }),
    });

    const features = await computeFeatures('cust-1', 'org-1');
    expect(features.plan_tier).toBe('Enterprise');
    expect(features.login_frequency_30d).toBe(0);
    expect(features.days_since_last_login).toBe(999);
    expect(features.support_ticket_volume).toBe(0);
    expect(features.billing_events).toBe(0);
    expect(features.nps_csat_score).toBe(8);
  });

  it('computes metrics from rich event history', async () => {
    const now = new Date();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000);

    // Customer
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue([{ id: 'cust-2', planTier: 'Pro', createdAt: tenDaysAgo }]),
        }),
      }),
    });

    // Events
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { eventType: 'login', occurredAt: twoDaysAgo, payload: {} },
          { eventType: 'login', occurredAt: tenDaysAgo, payload: {} },
          { eventType: 'feature_use', occurredAt: twoDaysAgo, payload: { feature: 'export_csv' } },
          { eventType: 'feature_use', occurredAt: twoDaysAgo, payload: { feature: 'analytics' } },
          { eventType: 'support_ticket', occurredAt: twoDaysAgo, payload: {} },
          { eventType: 'csat_response', occurredAt: twoDaysAgo, payload: { rating: 5 } },
          { eventType: 'payment_failed', occurredAt: twoDaysAgo, payload: {} },
        ]),
      }),
    });

    // First event for onboarding time
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue({ occurredAt: tenDaysAgo }),
            }),
          }),
        }),
      }),
    });

    // CRM sync event
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue({
                payload: {
                  nps_score: 9,
                  renewal_date: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
                },
              }),
            }),
          }),
        }),
      }),
    });

    const features = await computeFeatures('cust-2', 'org-1');
    expect(features.plan_tier).toBe('Pro');
    expect(features.support_ticket_volume).toBe(1);
    expect(features.billing_events).toBe(1);
    expect(features.nps_csat_score).toBe(9);
    expect(features.renewal_proximity).toBeGreaterThan(40);
    expect(features.feature_adoption_score).toBeCloseTo(2 / 12, 2);
  });

  it('triggers AI rescoring and inserts score into DB', async () => {
    // Customer
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'cust-3', planTier: 'Starter' }]),
        }),
      }),
    });

    // Events
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    // First event
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      }),
    });

    // CRM sync
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      }),
    });

    // Mock fetch to AI service
    const mockAiResponse = {
      score: 78,
      churn_probability: 0.22,
      risk_tier: 'low',
      top_risk_factors: ['Low login activity'],
      recommended_action: 'Send check-in email',
      confidence: 0.89,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockAiResponse),
    } as any);

    // Mock insert
    const insertedRecord = { id: 'score-1', customerId: 'cust-3', score: 78 };
    (db.insert as any).mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([insertedRecord]),
      }),
    });

    const result = await computeAndTriggerRescore('cust-3', 'org-1');
    expect(result).toEqual(insertedRecord);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});
