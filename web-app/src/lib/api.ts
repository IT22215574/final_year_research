import { env } from "@/lib/env";

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

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem("auth-storage");
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      state?: { user?: { access_token?: string; token?: string } };
    };

    return parsed.state?.user?.access_token ?? parsed.state?.user?.token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> },
): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;
  const accessToken = getStoredAccessToken();

  const res = await fetch(joinUrl(env.apiBaseUrl, path), {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
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

    const message = messageFromPayload || res.statusText || "Request failed";

    const err: ApiError = {
      status: res.status,
      message,
      field: fieldFromPayload,
      details: payload,
    };

    throw err;
  }

  return payload as T;
}
