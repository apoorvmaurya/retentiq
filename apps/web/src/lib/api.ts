import { createClient } from './supabase/client';

/**
 * Centrally managed and optimized fetch utility for calling the Express API.
 * Automatically injects the Supabase JWT access token for authentication.
 */
export async function fetchFromApi(endpoint: string, options: RequestInit = {}) {
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

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}
