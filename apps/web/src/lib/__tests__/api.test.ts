import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFromApi, fetchFromAiService } from '../api';

vi.mock('../supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-jwt-token',
          },
        },
      }),
    },
  }),
}));

describe('Web API Utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchFromApi', () => {
    it('should inject authorization header and fetch correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [1, 2, 3] }),
      });
      global.fetch = mockFetch;

      const result = await fetchFromApi('/customers');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
      expect(calledUrl).toContain('/api/customers');
      expect(calledOptions.headers).toHaveProperty('Authorization', 'Bearer mock-jwt-token');
      expect(calledOptions.headers).toHaveProperty('Content-Type', 'application/json');
      expect(result).toEqual({ success: true, data: [1, 2, 3] });
    });

    it('should throw error when api returns non-ok status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(fetchFromApi('/error-route')).rejects.toThrow('API error: 500');
    });
  });

  describe('fetchFromAiService', () => {
    it('should call ai-service proxy endpoint correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });
      global.fetch = mockFetch;

      const result = await fetchFromAiService('/health');

      expect(mockFetch).toHaveBeenCalledWith('/ai-service/health', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual({ status: 'healthy' });
    });

    it('should throw error when ai service returns non-ok status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });

      await expect(fetchFromAiService('/unavailable')).rejects.toThrow('AI Service error: 503');
    });
  });
});
