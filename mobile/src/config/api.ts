// API Configuration for Mobile App
// Set these in your environment or use defaults

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const normalizeBaseUrl = (value: string) => String(value).trim().replace(/\/+$/, '');

const uniq = (values: Array<string | undefined | null>) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    const norm = normalizeBaseUrl(v);
    if (!norm) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
};

const getExpoDevHost = (): string | null => {
  const hostUri = Constants.expoConfig?.hostUri;
  const expoGoDebuggerHost = (Constants as any)?.expoGoConfig?.debuggerHost;
  const manifestDebuggerHost = (Constants as any)?.manifest?.debuggerHost;

  const raw = hostUri || expoGoDebuggerHost || manifestDebuggerHost;
  if (!raw) return null;

  const host = String(raw).split(':')[0];
  return host || null;
};

const buildHttpBaseUrl = (host: string, port: number) => `http://${host}:${port}`;

const tryGetHostname = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

const isLikelyLanHost = (host: string) => {
  // RFC1918 ranges + localhost
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const m = host.match(/^172\.(\d+)\./);
  if (m) {
    const second = Number(m[1]);
    return second >= 16 && second <= 31;
  }
  return false;
};

export const getAuthApiBaseUrls = () => {
  const env = process.env.EXPO_PUBLIC_AUTH_URL || process.env.EXPO_PUBLIC_API_KEY;
  const expoHost = getExpoDevHost();

  const envHost = env ? tryGetHostname(env) : null;
  const preferExpoOverEnv =
    !!expoHost &&
    !!env &&
    !!envHost &&
    isLikelyLanHost(envHost) &&
    envHost !== expoHost;

  return uniq([
    preferExpoOverEnv && expoHost ? buildHttpBaseUrl(expoHost, 5000) : null,
    preferExpoOverEnv ? env : null,
    !preferExpoOverEnv ? env : null,
    !preferExpoOverEnv && expoHost ? buildHttpBaseUrl(expoHost, 5000) : null,
    Platform.OS === 'android' ? buildHttpBaseUrl('10.0.2.2', 5000) : null,
    buildHttpBaseUrl('localhost', 5000),
  ]);
};

export const getPredictionApiBaseUrls = () => {
  const env = process.env.EXPO_PUBLIC_PREDICTION_API_URL || process.env.EXPO_PUBLIC_API_URL;
  const expoHost = getExpoDevHost();

  const envHost = env ? tryGetHostname(env) : null;
  const preferExpoOverEnv =
    !!expoHost &&
    !!env &&
    !!envHost &&
    isLikelyLanHost(envHost) &&
    envHost !== expoHost;

  return uniq([
    preferExpoOverEnv && expoHost ? buildHttpBaseUrl(expoHost, 8000) : null,
    preferExpoOverEnv ? env : null,
    !preferExpoOverEnv ? env : null,
    !preferExpoOverEnv && expoHost ? buildHttpBaseUrl(expoHost, 8000) : null,
    Platform.OS === 'android' ? buildHttpBaseUrl('10.0.2.2', 8000) : null,
    buildHttpBaseUrl('localhost', 8000),
  ]);
};

export const API_CONFIG = {
  // Fish Price Prediction API (Python/FastAPI)
  PREDICTION_API: getPredictionApiBaseUrls()[0],
  
  // User Authentication API (NestJS)
  AUTH_API: getAuthApiBaseUrls()[0],
};

export default API_CONFIG;
