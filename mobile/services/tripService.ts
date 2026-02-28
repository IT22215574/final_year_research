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
    const error = await response.json();
    throw new Error(error.message || "Failed to create trip");
  }
  
  return await response.json();
};

export const getMyTrips = async (): Promise<Trip[]> => {
  const response = await apiFetch("/api/v1/trips/my-trips", {
    method: "GET",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch trips");
  }
  
  return await response.json();
};

export const getMyStats = async (): Promise<TripStats> => {
  const response = await apiFetch("/api/v1/trips/my-stats", {
    method: "GET",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch stats");
  }
  
  return await response.json();
};

export const getTripById = async (id: string): Promise<Trip> => {
  const response = await apiFetch(`/api/v1/trips/${id}`, {
    method: "GET",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch trip");
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
    const error = await response.json();
    throw new Error(error.message || "Failed to update trip");
  }
  
  return await response.json();
};

export const deleteTrip = async (id: string): Promise<void> => {
  const response = await apiFetch(`/api/v1/trips/${id}`, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    throw new Error("Failed to delete trip");
  }
};

// ========================================
// ML Prediction Operations
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
    throw new Error("ML service unavailable");
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
    throw new Error("ML service unavailable");
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
    throw new Error("Optimization service unavailable");
  }
  
  return await response.json();
};