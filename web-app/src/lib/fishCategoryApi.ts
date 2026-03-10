import { apiFetch } from "@/lib/api";

export type FishCategory = {
  _id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

/** GET /api/v1/fish-categories?search= (public endpoint) */
export function getFishCategories(search?: string): Promise<FishCategory[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<FishCategory[]>(`/fish-categories${qs}`);
}

/** POST /api/v1/fish-categories (admin) */
export function createFishCategory(name: string): Promise<FishCategory> {
  return apiFetch<FishCategory>("/fish-categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

/** PATCH /api/v1/fish-categories/:id (admin) */
export function updateFishCategory(
  id: string,
  name: string,
): Promise<FishCategory> {
  return apiFetch<FishCategory>(`/fish-categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

/** DELETE /api/v1/fish-categories/:id (admin) */
export function deleteFishCategory(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/fish-categories/${id}`, { method: "DELETE" });
}
