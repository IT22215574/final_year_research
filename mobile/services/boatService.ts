import { apiFetch } from "@/utils/api";

export type Boat = {
  _id: string;
  boatName?: string;
  boatType?: string;
  engineHorsePower?: number;
  engineHP?: number;
  boatLength?: number;
  boatWidth?: number;
  boatValue?: number;
  fuelEfficiencyFactor?: number;
  engineDegradationFactor?: number;
  averageFuelPredictionError?: number;
  boatImage?: string;
  mode?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminBoatType = {
  _id: string;
  name: string;
  active: boolean;
  description?: string;
  fuelPerKm?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateBoatBody = {
  boatName: string;
  boatType: string;
  engineHorsePower: number;
  boatLength?: number;
  boatWidth?: number;
  boatValue?: number;
  fuelEfficiencyFactor?: number;
  engineDegradationFactor?: number;
  averageFuelPredictionError?: number;
  mode?: string;
};

export type UpdateBoatBody = Partial<CreateBoatBody>;

export const getMyBoats = async (): Promise<Boat[]> => {
  const response = await apiFetch("/api/v1/boats/my", {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch boats");
  }

  return await response.json();
};

export const getBoatTypes = async (): Promise<string[]> => {
  const response = await apiFetch("/api/v1/boats/types", {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch boat types");
  }

  return await response.json();
};

export const getAdminBoatTypes = async (): Promise<AdminBoatType[]> => {
  const response = await apiFetch("/api/v1/boats/admin/types", {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch admin boat types");
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
};

export const createAdminBoatType = async (body: {
  name: string;
  description?: string;
  fuelPerKm?: number;
}): Promise<AdminBoatType> => {
  const response = await apiFetch("/api/v1/boats/admin/types", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to create boat type");
  }

  return await response.json();
};

export const updateAdminBoatType = async (
  id: string,
  body: {
    name?: string;
    description?: string;
    fuelPerKm?: number;
    active?: boolean;
  },
): Promise<AdminBoatType> => {
  const response = await apiFetch(`/api/v1/boats/admin/types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to update boat type");
  }

  return await response.json();
};

export const deleteAdminBoatType = async (
  id: string,
): Promise<{ message?: string }> => {
  const response = await apiFetch(`/api/v1/boats/admin/types/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to delete boat type");
  }

  return await response.json();
};

export const getBoatById = async (id: string): Promise<Boat> => {
  const response = await apiFetch(`/api/v1/boats/${id}`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch boat");
  }

  return await response.json();
};

export const createBoat = async (body: CreateBoatBody): Promise<Boat> => {
  const response = await apiFetch("/api/v1/boats", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to create boat");
  }

  return await response.json();
};

export const createBoatWithImage = async (
  body: CreateBoatBody,
  imageUri?: string,
): Promise<Boat> => {
  const formData = new FormData();

  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  if (imageUri) {
    formData.append("boatImage", {
      uri: imageUri,
      name: "boat.jpg",
      type: "image/jpeg",
    } as any);
  }

  const response = await apiFetch("/api/v1/boats", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to create boat");
  }

  return await response.json();
};

export const updateBoat = async (
  id: string,
  body: UpdateBoatBody,
): Promise<Boat> => {
  const response = await apiFetch(`/api/v1/boats/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to update boat");
  }

  return await response.json();
};

export const updateBoatWithImage = async (
  id: string,
  body: UpdateBoatBody,
  imageUri?: string,
): Promise<Boat> => {
  const formData = new FormData();

  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  if (imageUri) {
    formData.append("boatImage", {
      uri: imageUri,
      name: "boat.jpg",
      type: "image/jpeg",
    } as any);
  }

  const response = await apiFetch(`/api/v1/boats/${id}`, {
    method: "PATCH",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to update boat");
  }

  return await response.json();
};

export const deleteBoat = async (id: string): Promise<{ message?: string }> => {
  const response = await apiFetch(`/api/v1/boats/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to delete boat");
  }

  return await response.json();
};

export const getBoatLearningInsights = async (id: string) => {
  const response = await apiFetch(`/api/v1/boats/${id}/learning-insights`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch learning insights");
  }

  return await response.json();
};

export const getBoatPredictionHistory = async (id: string, days = 30) => {
  const response = await apiFetch(
    `/api/v1/boats/${id}/prediction-history?days=${days}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch prediction history");
  }

  return await response.json();
};
