import { CreateTripDto, MLPrediction, Trip, TripStats } from "@/types/type";
import { apiFetch } from "@/utils/api";

// ========================================
// Trip CRUD Operations
// ========================================

export const createTrip = async (tripData: CreateTripDto): Promise<Trip> => {
  const response = await apiFetch("/api/v1/trips", {
    method: "POST",
    body: JSON.stringify(tripData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to create trip");
  }

  return await response.json();
};

export const getMyTrips = async (): Promise<Trip[]> => {
  const response = await apiFetch("/api/v1/trips/my-trips", {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch trips");
  }

  return await response.json();
};

export const getMyStats = async (): Promise<TripStats> => {
  const response = await apiFetch("/api/v1/trips/my-stats", {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch stats");
  }

  return await response.json();
};

export const getTripById = async (id: string): Promise<Trip> => {
  const response = await apiFetch(`/api/v1/trips/${id}`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch trip");
  }

  return await response.json();
};

export const updateTrip = async (
  id: string,
  tripData: Partial<CreateTripDto>
): Promise<Trip> => {
  const response = await apiFetch(`/api/v1/trips/${id}`, {
    method: "PATCH",
    body: JSON.stringify(tripData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to update trip");
  }

  return await response.json();
};

export const deleteTrip = async (id: string): Promise<void> => {
  const response = await apiFetch(`/api/v1/trips/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to delete trip");
  }
};

// ========================================
// OLD ML ENDPOINTS (optional - keep if still used)
// ========================================

export const predictFuelCost = async (data: {
  distanceKm: number;
  engineHorsePower: number;
  windSpeed: number;
  waveHeight: number;
  tripDurationHours: number;
}): Promise<{ predictedFuelLiters: number }> => {
  const response = await apiFetch("/api/v1/ml/predict-fuel", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "ML service unavailable");
  }

  return await response.json();
};

export const predictTripCost = async (data: {
  distanceKm: number;
  engineHorsePower: number;
  windSpeed: number;
  waveHeight: number;
  tripDurationHours: number;
  fuelPricePerLiter: number;
}): Promise<{ predictedCost: number }> => {
  const response = await apiFetch("/api/v1/ml/predict-cost", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "ML service unavailable");
  }

  return await response.json();
};

export const getOptimizationRecommendations = async (
  tripData: any
): Promise<MLPrediction> => {
  const response = await apiFetch("/api/v1/ml/optimize", {
    method: "POST",
    body: JSON.stringify(tripData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Optimization service unavailable");
  }

  return await response.json();
};

// ========================================
// DATCIE Cost Engine Operations (USE THESE)
// ========================================

export type DatciePredictBody = {
  boatId: string;

  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;

  windSpeed: number;
  waveHeight: number;

  fuelPrice: number;

  expectedCatch: number;
  marketPrice: number;

  fishingHours: number;
  crewCount: number;

  speed?: number; // optional
  mode?: "island" | "international";
};

export type DatcieLogActualBody = {
  // ✅ MUST match backend LogActualDto
  actualFuelLiters: number;
  actualCatchKg: number;
};

/**
 * POST /api/v1/cost-engine/predict
 * Public (no token)
 */
export const predictTripDatcie = async (body: DatciePredictBody) => {
  const response = await apiFetch("/api/v1/cost-engine/predict", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "DATCIE predict failed");
  }

  return await response.json();
};

/**
 * POST /api/v1/cost-engine/optimize
 * Public (no token)
 */
export const optimizeTripDatcie = async (body: DatciePredictBody) => {
  const response = await apiFetch("/api/v1/cost-engine/optimize", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "DATCIE optimize failed");
  }

  return await response.json();
};

/**
 * POST /api/v1/cost-engine/predict-and-save
 * Protected (token required)
 */
export const predictAndSaveTripDatcie = async (body: DatciePredictBody) => {
  const response = await apiFetch("/api/v1/cost-engine/predict-and-save", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "DATCIE predict-and-save failed");
  }

  return await response.json();
};

/**
 * POST /api/v1/trips/:id/log-actual
 * Protected (token required)
 */
export const logActualTripDatcie = async (
  tripId: string,
  body: DatcieLogActualBody
) => {
  const response = await apiFetch(`/api/v1/trips/${tripId}/log-actual`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Log actual failed");
  }

  return await response.json();
};