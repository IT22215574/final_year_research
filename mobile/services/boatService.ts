import { apiFetch } from "@/utils/api";

export type Boat = {
  _id: string;

  // your backend may use any of these names
  boatName?: string;
  name?: string;

  boatType?: string;
  type?: string;

  engineHorsePower?: number;
  engineHP?: number;

  fuelEfficiencyFactor?: number;
  engineDegradationFactor?: number;

  createdAt?: string;
  updatedAt?: string;
};

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

export const createBoat = async (
  body: Partial<Boat>
): Promise<Boat> => {
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