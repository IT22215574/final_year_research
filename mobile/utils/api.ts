import * as SecureStore from "expo-secure-store";

export type ApiError = {
  status: number;
  message: string;
  field?: string;
  details?: unknown;
};

function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * API fetch wrapper for mobile app
 * Returns a Response object with ok, status, and json() method
 * to maintain compatibility with existing code patterns
 */
export async function apiFetch(
  path: string,
  options?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> }
): Promise<Response> {
  const API = process.env.EXPO_PUBLIC_API_KEY;
  
  if (!API) {
    throw new Error("EXPO_PUBLIC_API_KEY is not defined in environment variables");
  }

  // Get access token from secure storage
  const accessToken = await SecureStore.getItemAsync("access_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-client-type": "mobile",
    ...(options?.headers ?? {}),
  };

  // Add authorization header if token exists
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(joinUrl(API, path), {
    ...options,
    headers,
    credentials: "include",
  });

  return response;
}

/**
 * API fetch wrapper that returns parsed JSON data
 * and throws on error responses
 */
export async function apiFetchJson<T>(
  path: string,
  options?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> }
): Promise<T> {
  const response = await apiFetch(path, options);
  
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    const messageFromPayload =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof (payload as Record<string, unknown>).message === "string"
        ? ((payload as Record<string, unknown>).message as string)
        : null;

    const fieldFromPayload =
      payload &&
      typeof payload === "object" &&
      "field" in payload &&
      typeof (payload as Record<string, unknown>).field === "string"
        ? ((payload as Record<string, unknown>).field as string)
        : undefined;

    const message = messageFromPayload || response.statusText || "Request failed";
    const err: ApiError = {
      status: response.status,
      message,
      field: fieldFromPayload,
      details: payload,
    };
    throw err;
  }

  return payload as T;
}
