import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from './server.js';
import { db } from './lib/db.js';
import * as schema from '@retentiq/db';
import cronRouter from './routes/cron.js';

const TEST_ORG_ID = 'fb4efd62-dcbe-41a9-b9de-ab5c79a0a313';
const TEST_USER_ID = '07898715-c17c-4e76-9d0a-35acb50be73e';
const TEST_CUSTOMER_ID = 'fb4efd62-dcbe-41a9-b9de-ab5c79a01111';

// Mock getUser function to control JWT auth tests
const mockGetUser = vi.fn();

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      auth: {
        getUser: (...args: any[]) => mockGetUser(...args),
      },
    }),
  };
});

// Register test routes dynamically on app
cronRouter.get('/test-error', (req, res, next) => {
  next(new Error('Global error handler test'));
});

cronRouter.get('/test-error-400', (req, res, next) => {
  const err: any = new Error('Bad Request test');
  err.status = 400;
  next(err);
});

cronRouter.get('/test-error-req', (req: any, res, next) => {
  req.requestId = 'custom-request-id-123';
  req.startTime = Date.now() - 500;
  next(new Error('Request properties test'));
});

app.post('/api/stripe/webhook', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/invites/accept/test', (req, res) => {
  res.json({ user: req.user });
});

describe('RetentIQ API Routes & Middleware Tests', () => {
  beforeAll(async () => {
    // Seed test org, user and customer so that database constraints and authentication succeeded
    await db
      .insert(schema.organizations)
      .values({
        id: TEST_ORG_ID,
        name: 'Test Org',
        slug: 'test-org-slug-test',
      })
      .onConflictDoNothing();

    await db
      .insert(schema.users)
      .values({
        id: TEST_USER_ID,
        orgId: TEST_ORG_ID,
        email: 'test_confirmed_user@retentiq.com',
        role: 'member',
        name: 'Test User',
      })
      .onConflictDoNothing();

    await db
      .insert(schema.customers)
      .values({
        id: TEST_CUSTOMER_ID,
        orgId: TEST_ORG_ID,
        name: 'Test Customer',
        email: 'customer@test.com',
        company: 'Test Company',
        planTier: 'enterprise',
      })
      .onConflictDoNothing();
  });

  describe('GET /health', () => {
    it('should return 200 and db status ok if connection is healthy', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('db', 'ok');
    });

    it('should return 500 if database health check fails', async () => {
      const spy = vi
        .spyOn(db, 'execute')
        .mockRejectedValueOnce(new Error('Mocked connection failure'));
      const response = await request(app).get('/health');
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('db', 'error');
      spy.mockRestore();
    });
  });

  describe('Authentication Middleware (verifySupabaseJWT)', () => {
    it('should bypass auth for public stripe webhook', async () => {
      const response = await request(app).post('/api/stripe/webhook').send({});
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    it('should return 401 when NODE_ENV is production and no token is provided', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const response = await request(app).post('/api/events/ingest').send({});
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Authentication required');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should fail token verification in production if getUser returns error', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Token expired'),
      });
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const response = await request(app)
          .post('/api/events/ingest')
          .set('Authorization', 'Bearer invalid-token')
          .send({});
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Invalid or expired token');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should authenticate correctly in production if valid token with profile is provided', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: TEST_USER_ID, email: 'test_confirmed_user@retentiq.com' } },
        error: null,
      });
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const response = await request(app)
          .post('/api/events/ingest')
          .set('Authorization', 'Bearer valid-token')
          .send({});
        // Should bypass auth and fail at Zod validation (422) instead of 401
        expect(response.status).toBe(422);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should authenticate correctly for accept invite routes in production even if profile is missing in DB', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: '07898715-c17c-4e76-9d0a-35acb50be73f', email: 'invited@test.com' } },
        error: null,
      });
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const response = await request(app)
          .get('/api/invites/accept/test')
          .set('Authorization', 'Bearer invite-token');
        expect(response.status).toBe(200);
        expect(response.body.user).toHaveProperty('id', '07898715-c17c-4e76-9d0a-35acb50be73f');
        expect(response.body.user).toHaveProperty('org_id', '');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Global Error Handler Middleware', () => {
    it('should route errors to global error handler and return 500 with stack trace in test mode', async () => {
      const cronSecret = process.env.CRON_SECRET || '';
      const response = await request(app)
        .get('/cron/test-error')
        .set('Authorization', `Bearer ${cronSecret}`);
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Global error handler test');
      expect(response.body).toHaveProperty('code', 'INTERNAL_ERROR');
      expect(response.body).toHaveProperty('stack');
    });

    it('should not leak stack trace in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const cronSecret = process.env.CRON_SECRET || '';
      try {
        const response = await request(app)
          .get('/cron/test-error')
          .set('Authorization', `Bearer ${cronSecret}`);
        expect(response.status).toBe(500);
        expect(response.body).not.toHaveProperty('stack');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle custom status code error in error handler', async () => {
      const cronSecret = process.env.CRON_SECRET || '';
      const response = await request(app)
        .get('/cron/test-error-400')
        .set('Authorization', `Bearer ${cronSecret}`);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Bad Request test');
    });

    it('should handle custom requestId and startTime in error handler', async () => {
      const cronSecret = process.env.CRON_SECRET || '';
      const response = await request(app)
        .get('/cron/test-error-req')
        .set('Authorization', `Bearer ${cronSecret}`);
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Request properties test');
      expect(response.body).toHaveProperty('requestId', 'custom-request-id-123');
    });
  });

  describe('POST /api/events/ingest (Validation & Ingestion)', () => {
    it('should return 422 for invalid body structure', async () => {
      const response = await request(app).post('/api/events/ingest').send({ events: [] });
      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.fields).toBeInstanceOf(Array);
      expect(response.body.fields[0]).toHaveProperty('field');
    });

    it('should return 422 for missing events field', async () => {
      const response = await request(app).post('/api/events/ingest').send({});
      expect(response.status).toBe(422);
    });

    it('should skip ingestion and return 200 for event with non-existent customer', async () => {
      const response = await request(app)
        .post('/api/events/ingest')
        .send({
          events: [
            {
              customer_id: 'fb4efd62-dcbe-41a9-b9de-ab5c79a00000',
              event_type: 'login',
              source: 'web',
            },
          ],
        });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ inserted: 0, skipped: 1 });
    });

    it('should successfully ingest event for existing customer and trigger rescore fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      try {
        const response = await request(app)
          .post('/api/events/ingest')
          .send({
            events: [
              {
                customer_id: TEST_CUSTOMER_ID,
                event_type: 'login',
                source: 'web',
                occurred_at: new Date().toISOString(),
                payload: { metadata: 'test-metadata' },
              },
            ],
          });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ inserted: 1, skipped: 0 });
        expect(mockFetch).toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('should handle background rescore fetch failures gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Rescore fetch failed'));
      vi.stubGlobal('fetch', mockFetch);

      try {
        const response = await request(app)
          .post('/api/events/ingest')
          .send({
            events: [
              {
                customer_id: TEST_CUSTOMER_ID,
                event_type: 'login',
                source: 'web',
              },
            ],
          });
        expect(response.status).toBe(200);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('should propagate database errors to next() in POST ingest', async () => {
      const originalSelect = db.select.bind(db);
      const spy = vi.spyOn(db, 'select').mockImplementation((() => {
        return {
          from: (table: any) => {
            if (table === schema.customers) {
              throw new Error('Database select failed');
            }
            return originalSelect().from(table);
          },
        };
      }) as any);

      try {
        const response = await request(app)
          .post('/api/events/ingest')
          .send({
            events: [
              {
                customer_id: TEST_CUSTOMER_ID,
                event_type: 'login',
                source: 'web',
              },
            ],
          });
        expect(response.status).toBe(500);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('GET /api/events/:customer_id', () => {
    it('should return 200 and query successfully with limit and before_cursor', async () => {
      const response = await request(app)
        .get(`/api/events/${TEST_CUSTOMER_ID}`)
        .query({ limit: 10, before_cursor: new Date().toISOString() });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should propagate database errors to next() in GET events', async () => {
      const originalSelect = db.select.bind(db);
      const spy = vi.spyOn(db, 'select').mockImplementation((() => {
        return {
          from: (table: any) => {
            if (table === schema.events) {
              throw new Error('Database select failed');
            }
            return originalSelect().from(table);
          },
        };
      }) as any);

      try {
        const response = await request(app).get(`/api/events/${TEST_CUSTOMER_ID}`);
        expect(response.status).toBe(500);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('Webhook Bypass & Security & Refresh Tests', () => {
    it('should bypass auth for segment webhook in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const response = await request(app).post('/api/integrations/segment/webhook').send({});
        expect(response.status).not.toBe(401);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should return 404 when trying to resolve an alert belonging to a different organization', async () => {
      const anotherOrgId = 'fb4efd62-dcbe-41a9-b9de-ab5c79a0b000';
      await db
        .insert(schema.organizations)
        .values({
          id: anotherOrgId,
          name: 'Another Org',
          slug: 'another-org-slug',
        })
        .onConflictDoNothing();

      const anotherCustomerId = 'fb4efd62-dcbe-41a9-b9de-ab5c79a0b111';
      await db
        .insert(schema.customers)
        .values({
          id: anotherCustomerId,
          orgId: anotherOrgId,
          name: 'Another Customer',
          email: 'another@customer.com',
          company: 'Another Company',
          planTier: 'starter',
        })
        .onConflictDoNothing();

      const alertId = 'fb4efd62-dcbe-41a9-b9de-ab5c79a0a444';
      await db
        .insert(schema.alerts)
        .values({
          id: alertId,
          orgId: anotherOrgId,
          customerId: anotherCustomerId,
          scoreAtTrigger: 35,
        })
        .onConflictDoNothing();

      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: TEST_USER_ID, email: 'test_confirmed_user@retentiq.com' } },
        error: null,
      });

      const response = await request(app)
        .put(`/api/alerts/${alertId}/resolve`)
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(404);
    });

    it('should trigger bulk scoring via refresh endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ job_id: 'mock-bulk-job', total: 1 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      try {
        mockGetUser.mockResolvedValueOnce({
          data: { user: { id: TEST_USER_ID, email: 'test_confirmed_user@retentiq.com' } },
          error: null,
        });

        const response = await request(app)
          .post('/api/health-scores/refresh')
          .set('Authorization', 'Bearer valid-token')
          .send({});

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('job_id', 'mock-bulk-job');
        expect(response.body).toHaveProperty('customer_count', 1);
        expect(mockFetch).toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });
});
