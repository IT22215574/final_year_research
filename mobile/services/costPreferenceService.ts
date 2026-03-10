import { apiFetch } from "@/utils/api";

export type CostPreference = {
  _id: string;
  name: string;
  category: string;
  icon?: string;
  quantity: number;
  pricePerUnit: number;
  amount: number;
  description?: string;
  autoApply?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCostPreferenceBody = {
  name: string;
  category: string;
  icon?: string;
  quantity: number;
  pricePerUnit: number;
  amount: number;
  description?: string;
  autoApply?: boolean;
  isActive?: boolean;
};

export type UpdateCostPreferenceBody = Partial<CreateCostPreferenceBody>;

export const getCostPreferences = async (): Promise<CostPreference[]> => {
  const response = await apiFetch("/api/v1/cost-preferences", {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch cost preferences");
  }

  return await response.json();
};

export const getActiveAutoApplyCostPreferences = async (): Promise<
  CostPreference[]
> => {
  const response = await apiFetch(
    "/api/v1/cost-preferences/active-auto-apply",
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || "Failed to fetch active auto-apply cost preferences",
    );
  }

  return await response.json();
};

export const getCostPreferenceById = async (
  id: string,
): Promise<CostPreference> => {
  const response = await apiFetch(`/api/v1/cost-preferences/${id}`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch cost preference");
  }

  return await response.json();
};

export const createCostPreference = async (
  body: CreateCostPreferenceBody,
): Promise<CostPreference> => {
  const response = await apiFetch("/api/v1/cost-preferences", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to create cost preference");
  }

  return await response.json();
};

export const updateCostPreference = async (
  id: string,
  body: UpdateCostPreferenceBody,
): Promise<CostPreference> => {
  const response = await apiFetch(`/api/v1/cost-preferences/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to update cost preference");
  }

  return await response.json();
};

export const toggleCostPreference = async (
  id: string,
): Promise<CostPreference> => {
  const response = await apiFetch(`/api/v1/cost-preferences/${id}/toggle`, {
    method: "PATCH",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to toggle cost preference");
  }

  return await response.json();
};

export const deleteCostPreference = async (id: string): Promise<void> => {
  const response = await apiFetch(`/api/v1/cost-preferences/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to delete cost preference");
  }
};
