import * as SecureStore from 'expo-secure-store';
import { getAuthApiBaseUrls } from '@/src/config/api';

const normalizeUrl = (baseUrl: string, endpoint: string) => {
  const base = String(baseUrl).replace(/\/$/, '');
  const ep = String(endpoint).startsWith('/') ? String(endpoint) : `/${endpoint}`;
  return `${base}${ep}`;
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrls = getAuthApiBaseUrls();

  // Get token from SecureStore
  const accessToken = await SecureStore.getItemAsync("access_token");
  
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    'x-client-type': 'mobile',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }), // CRITICAL: Add token
    ...options.headers as Record<string, string>,
  };

  let lastError: unknown;
  for (const baseUrl of baseUrls) {
    const url = normalizeUrl(baseUrl, endpoint);
    try {
      return await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (err: any) {
      lastError = err;
      const message = String(err?.message || err || '');
      const isNetwork =
        err instanceof TypeError ||
        /Network request failed|Failed to fetch|network/i.test(message);

      if (!isNetwork) throw err;
    }
  }

  const tried = baseUrls.join(', ');
  const message = String((lastError as any)?.message || lastError || 'Network request failed');
  throw new Error(`${message}. Tried: ${tried}`);
};
