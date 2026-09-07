import { createClient } from './supabase/client';

/**
 * Centrally managed and optimized fetch utility for calling the Express API.
 * Automatically injects the Supabase JWT access token for authentication.
 * Includes cold-start event broadcasting and transient retry capability.
 */
export async function fetchFromApi(
  endpoint: string,
  options: RequestInit = {},
  retries = 0,
): Promise<any> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  if (!baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
    baseUrl = baseUrl.replace(/\/$/, '') + '/api';
  }

  let slowTimer: NodeJS.Timeout | null = null;
  if (typeof window !== 'undefined') {
    slowTimer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('retentiq-db-slow-query', { detail: { endpoint } }));
    }, 2500);
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // In non-test environments, retry gateway cold-start errors once (502/503/504)
      if (
        (response.status === 502 || response.status === 503 || response.status === 504) &&
        retries < 1 &&
        process.env.NODE_ENV !== 'test'
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return fetchFromApi(endpoint, options, retries + 1);
      }
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  } catch (err: any) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('retentiq-db-query-error', { detail: { endpoint, error: err.message } }),
      );
    }
    throw err;
  } finally {
    if (slowTimer) {
      clearTimeout(slowTimer);
    }
  }
}

/**
 * Centrally managed and optimized fetch utility for calling the AI service (FastAPI) via Proxy.
 */
export async function fetchFromAiService(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`/ai-service${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`AI Service error: ${response.status}`);
  }
  return response.json();
}
