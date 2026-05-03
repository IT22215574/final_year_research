import { env } from "@/lib/env";
import { getStoredAccessToken } from "@/lib/api";
import type { ApiError } from "@/lib/api";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type FishMarketCategory = { _id: string; name: string };

export type FishMarketEntry = {
  _id: string;
  categoryId: FishMarketCategory | string;
  grade: string;
  wholesalePrice: number;
  price: number;
  numberOfKilos: number;
  catchingAreaName: string;
  images: string[];
  marketDate: string; // ISO string, UTC midnight
  createdAt?: string;
  updatedAt?: string;
};

export type CreateFishMarketPayload = {
  categoryId: string;
  grade: string;
  wholesalePrice: number;
  price: number;
  numberOfKilos: number;
  catchingAreaName: string;
  marketDate?: string; // YYYY-MM-DD
  imageFiles?: File[];
};

export type UpdateFishMarketPayload = Partial<CreateFishMarketPayload> & {
  replaceImages?: boolean;
};

export type FishMarketFilters = {
  date?: string;   // YYYY-MM-DD
  from?: string;
  to?: string;
  categoryId?: string;
};

/* ─── Internal fetch (multipart-safe — no forced Content-Type) ───────────── */

function joinUrl(base: string, p: string) {
  return `${base.replace(/\/+$/, "")}${p.startsWith("/") ? p : `/${p}`}`;
}

async function apiFetchForm<T>(path: string, options: RequestInit): Promise<T> {
  const accessToken = getStoredAccessToken();

  const res = await fetch(joinUrl(env.apiBaseUrl, path), {
    ...options,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await res.json().catch(() => undefined)
    : undefined;

  if (!res.ok) {
    const raw =
      payload && typeof payload === "object" && "message" in payload
        ? (payload as { message?: unknown }).message
        : undefined;
    const message = Array.isArray(raw)
      ? raw.join(", ")
      : typeof raw === "string"
      ? raw
      : res.statusText ?? "Request failed";
    const err: ApiError = { status: res.status, message };
    throw err;
  }

  return payload as T;
}

/* ─── Public API ─────────────────────────────────────────────────────────── */

/** GET /admin/fish-market — filter by date / date-range / categoryId */
export function getFishMarketEntries(
  filters?: FishMarketFilters,
): Promise<FishMarketEntry[]> {
  const params = new URLSearchParams();
  if (filters?.date) params.set("date", filters.date);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.categoryId) params.set("categoryId", filters.categoryId);
  const qs = params.toString() ? `?${params}` : "";
  return apiFetchForm(`/admin/fish-market${qs}`, { method: "GET" });
}

/** GET /admin/fish-market/dates — distinct marketDates sorted desc */
export function getFishMarketDates(): Promise<string[]> {
  return apiFetchForm("/admin/fish-market/dates", { method: "GET" });
}

/** POST /admin/fish-market (multipart) */
export function createFishMarketEntry(
  payload: CreateFishMarketPayload,
): Promise<FishMarketEntry> {
  return apiFetchForm("/admin/fish-market", {
    method: "POST",
    body: buildForm(payload),
  });
}

/** PATCH /admin/fish-market/:id (multipart) */
export function updateFishMarketEntry(
  id: string,
  payload: UpdateFishMarketPayload,
): Promise<FishMarketEntry> {
  const { replaceImages, ...rest } = payload;
  const qs = replaceImages ? "?replaceImages=true" : "";
  return apiFetchForm(`/admin/fish-market/${id}${qs}`, {
    method: "PATCH",
    body: buildForm(rest),
  });
}

/** DELETE /admin/fish-market/:id */
export function deleteFishMarketEntry(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiFetchForm(`/admin/fish-market/${id}`, { method: "DELETE" });
}

/* ─── Helper ─────────────────────────────────────────────────────────────── */

function buildForm(payload: Partial<CreateFishMarketPayload>): FormData {
  const f = new FormData();
  if (payload.categoryId) f.append("categoryId", payload.categoryId);
  if (payload.grade !== undefined) f.append("grade", payload.grade);
  if (payload.wholesalePrice !== undefined)
    f.append("wholesalePrice", String(payload.wholesalePrice));
  if (payload.price !== undefined) f.append("price", String(payload.price));
  if (payload.numberOfKilos !== undefined)
    f.append("numberOfKilos", String(payload.numberOfKilos));
  if (payload.catchingAreaName !== undefined)
    f.append("catchingAreaName", payload.catchingAreaName);
  if (payload.marketDate) f.append("marketDate", payload.marketDate);
  for (const file of payload.imageFiles ?? []) {
    f.append("images", file);
  }
  return f;
}
