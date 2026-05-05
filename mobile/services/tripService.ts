import { apiFetch } from "@/utils/api";
import { Trip, DashboardStats } from "@/types/trip";

export type ExternalCostItem = {
  name: string;
  category: string;
  amount: number;
  source?: "manual" | "preference";
  description?: string;
};

export type DatciePredictBody = {
  boatId: string;
  // Coordinates (optional if distanceKm provided)
  startLat?: number;
  startLon?: number;
  endLat?: number;
  endLon?: number;
  // Manual distance (optional if coordinates provided)
  distanceKm?: number;
  windSpeed: number;
  waveHeight: number;
  rainMmPerHour?: number;
  fuelPrice: number;
  expectedCatch: number;
  marketPrice: number;
  fishingHours: number;
  numberOfDays: number;
  crewCount: number;
  engineHorsePower?: number;
  engineHP?: number;
  speed?: number; // Optional: backend tests multiple speeds if not provided
  mode?: "island" | "international";
  manualExternalCosts?: ExternalCostItem[];
};

export type PredictAndSaveTripBody = DatciePredictBody & {
  departureTime?: string;
  returnTime?: string;
  clientRequestId?: string;
};

export type DatcieLogActualBody = {
  actualFuelLiters: number;
  actualCatchKg: number;
  actualFuelCost?: number;
  actualOperationalCost?: number;
  actualExternalCosts?: Array<{
    name: string;
    category: string;
    amount: number;
    description?: string;
  }>;
  actualRevenue?: number;
  actualNotes?: string;
};

export type CreateTripDto = {
  departureTime: string;
  returnTime: string;
  boatId?: string;
  distanceKm?: number;
  engineHorsePower?: number;
  engineHP?: number;
  boatType?: string;
  windSpeed?: number;
  waveHeight?: number;
  rainMmPerHour?: number;
  weatherCondition?: string;
  fuelUsedLiters?: number;
  fuelPricePerLiter?: number;
  marketPrice?: number;
  iceCost?: number;
  crewCost?: number;
  foodCost?: number;
  maintenanceCost?: number;
  otherCost?: number;
  startLat?: number;
  startLon?: number;
  endLat?: number;
  endLon?: number;
  speed?: number;
  averageSpeed?: number;
  crewCount?: number;
  fishingHours?: number;
  numberOfDays?: number;
  mode?: "island" | "international";
  status?: "planned" | "completed" | "cancelled";
  predictedFuelLiters?: number;
  predictedTotalCost?: number;
  predictedDistanceKm?: number;
  weatherSeverityIndex?: number;
  economicStressIndex?: number;
  profitabilityProbability?: number;
  riskCategory?: "low" | "medium" | "high";
  carbonEmissionKg?: number;
  carbonPerKgCatch?: number;
  predictedFuelCost?: number;
  predictedCrewCost?: number;
  predictedOperationalCost?: number;
  predictedExternalCostTotal?: number;
  predictedExternalCosts?: ExternalCostItem[];
  optimizationRecommendations?: string[];
  clientRequestId?: string;
};

// Re-export types from centralized types file
export type { Trip, DashboardStats, LogActualDto } from "@/types/trip";

// Deprecated: Use DashboardStats instead
export type TripStats = DashboardStats;

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

export const getTripsForTraining = async (isAdmin: boolean): Promise<Trip[]> => {
  const endpoint = isAdmin ? "/api/v1/trips" : "/api/v1/trips/my-trips";

  const response = await apiFetch(endpoint, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch trips");
  }

  return await response.json();
};

export const getMyStats = async (): Promise<DashboardStats> => {
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
  tripData: Partial<CreateTripDto>,
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

export const deleteTrip = async (id: string): Promise<{ message?: string }> => {
  const response = await apiFetch(`/api/v1/trips/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to delete trip");
  }

  return await response.json();
};

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

export const predictAndSaveTripDatcie = async (
  body: PredictAndSaveTripBody,
) => {
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

export const logActualTripDatcie = async (
  tripId: string,
  body: DatcieLogActualBody,
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

export const getLearningSummary = async () => {
  const response = await apiFetch("/api/v1/trips/learning/summary", {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || error.detail || "Failed to fetch learning summary",
    );
  }

  return await response.json();
};

export const batchTrainTrips = async (tripIds: string[], boatId?: string) => {
  const response = await apiFetch("/api/v1/trips/batch-train", {
    method: "POST",
    body: JSON.stringify({ tripIds, boatId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || error.detail || "Failed to batch train trips",
    );
  }

  return await response.json();
};

/**
 * Export trips as CSV for Google Colab training
 * Returns CSV text content
 */
export const exportTripsCSV = async (
  dataType: "predicted" | "actual" | "mixed" = "mixed",
): Promise<string> => {
  const response = await apiFetch(
    `/api/v1/trips/export/csv?dataType=${dataType}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || error.detail || "Failed to export trips CSV",
    );
  }

  return await response.text();
};
