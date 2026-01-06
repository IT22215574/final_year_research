import * as SecureStore from 'expo-secure-store';
import API_CONFIG, { getAuthApiBaseUrls } from '@/src/config/api';

const normalizeUrl = (baseUrl: string, endpoint: string) => {
  const base = String(baseUrl).replace(/\/$/, '');
  const ep = String(endpoint).startsWith('/') ? String(endpoint) : `/${endpoint}`;
  return `${base}${ep}`;
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrls = getAuthApiBaseUrls();

  const accessToken = await SecureStore.getItemAsync('access_token');
  const extraHeaders = (options.headers || {}) as Record<string, string>;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-client-type': 'mobile',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extraHeaders,
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
