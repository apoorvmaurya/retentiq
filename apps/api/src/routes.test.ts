import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './server.js';

describe('RetentIQ API Routes', () => {
  describe('GET /health', () => {
    it('should return 200 and db status ok if connection is healthy', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('db', 'ok');
    });
  });

  describe('POST /api/events/ingest (Auth / Validation fallback)', () => {
    it('should return 422 for invalid body structure', async () => {
      const response = await request(app)
        .post('/api/events/ingest')
        .send({ events: [] }); // events cannot be empty

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.fields).toBeInstanceOf(Array);
      expect(response.body.fields[0]).toHaveProperty('field');
      expect(response.body.fields[0]).toHaveProperty('message');
    });

    it('should return 422 for missing events field', async () => {
      const response = await request(app)
        .post('/api/events/ingest')
        .send({}); // events is required

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.fields[0]).toHaveProperty('field', 'events');
    });
  });
});
