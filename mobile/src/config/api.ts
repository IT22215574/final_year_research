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

/**
 * Build an ordered list of base URLs to try for a given service port.
 *
 * Priority (highest → lowest):
 *  1. Expo dev-server auto-detected LAN host  (changes automatically on new WiFi)
 *  2. Value from .env / EXPO_PUBLIC_* variable (manual override / fallback)
 *  3. Android-emulator gateway              (10.0.2.2)
 *  4. localhost
 *
 * Because Expo's hostUri always reflects the *current* WiFi IP, the app
 * connects correctly on any network without touching .env.
 */
const buildUrlList = (port: number, envValue?: string | null): string[] => {
  const expoHost = getExpoDevHost();
  // Pull just the hostname out of the .env URL so we can rebuild it with the
  // correct port (in case someone put a wrong port in .env).
  const envHostOnly = envValue ? tryGetHostname(envValue) : null;

  return uniq([
    // 1️⃣  Always try Expo auto-detected host first
    expoHost ? buildHttpBaseUrl(expoHost, port) : null,
    // 2️⃣  .env value as-is (useful when Expo detection is unavailable, e.g. prod build)
    envValue ?? null,
    // 2b) also rebuild .env host with the target port in case the URL had a different port
    envHostOnly && envHostOnly !== expoHost ? buildHttpBaseUrl(envHostOnly, port) : null,
    // 3️⃣  Android emulator gateway
    Platform.OS === 'android' ? buildHttpBaseUrl('10.0.2.2', port) : null,
    // 4️⃣  localhost last resort
    buildHttpBaseUrl('localhost', port),
  ]);
};

export const getAuthApiBaseUrls = () =>
  buildUrlList(3000, process.env.EXPO_PUBLIC_AUTH_URL || process.env.EXPO_PUBLIC_API_KEY);

export const getPredictionApiBaseUrls = () =>
  buildUrlList(8000, process.env.EXPO_PUBLIC_PREDICTION_API_URL || process.env.EXPO_PUBLIC_API_URL);

export const API_CONFIG = {
  // Fish Price Prediction API (Python/FastAPI)
  PREDICTION_API: getPredictionApiBaseUrls()[0],
  
  // User Authentication API (NestJS)
  AUTH_API: getAuthApiBaseUrls()[0],
};

export default API_CONFIG;
