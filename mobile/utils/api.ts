import * as SecureStore from 'expo-secure-store';
import API_CONFIG from '@/src/config/api';

const normalizeUrl = (baseUrl: string, endpoint: string) => {
  const base = String(baseUrl).replace(/\/$/, '');
  const ep = String(endpoint).startsWith('/') ? String(endpoint) : `/${endpoint}`;
  return `${base}${ep}`;
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const apiBaseUrl =
    API_CONFIG.AUTH_API ||
    process.env.EXPO_PUBLIC_AUTH_URL ||
    process.env.EXPO_PUBLIC_API_KEY ||
    'http://localhost:5000';

  const url = normalizeUrl(apiBaseUrl, endpoint);

  const accessToken = await SecureStore.getItemAsync('access_token');
  const extraHeaders = (options.headers || {}) as Record<string, string>;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-client-type': 'mobile',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extraHeaders,
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
};
