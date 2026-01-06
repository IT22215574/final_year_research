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

export async function apiFetch<T>(
  path: string,
  options?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> },
): Promise<T> {
  const res = await fetch(joinUrl(env.apiBaseUrl, path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
