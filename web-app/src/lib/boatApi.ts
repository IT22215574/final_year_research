import { apiFetch } from "@/lib/api";

export type Boat = {
  _id: string;
  userId: string;
  boatName: string;
  boatType: string;
  engineHorsePower: number;
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

export type BoatPayload = {
  boatName: string;
  boatType: string;
  engineHorsePower: number | string;
  boatLength?: number | string;
  boatWidth?: number | string;
  boatValue?: number | string;
  fuelEfficiencyFactor?: number | string;
  engineDegradationFactor?: number | string;
  averageFuelPredictionError?: number | string;
  mode?: string;
  boatImage?: File | null;
};

export type BoatLearningInsightsResponse = {
  boatInfo: {
    _id: string;
    boatName: string;
    boatType: string;
    engineHorsePower: number;
  };
  learningInsights: unknown;
  currentCoefficients?: {
    fuelEfficiencyFactor?: number;
    engineDegradationFactor?: number;
    averageFuelPredictionError?: number;
  };
  mlServiceError?: boolean;
};

export type BoatPredictionHistoryResponse = {
  boatId: string;
  days: number;
  history: unknown[];
  totalEntries: number;
  message?: string;
  mlServiceError?: boolean;
};

function buildBoatFormData(data: Partial<BoatPayload>): FormData {
  const formData = new FormData();

  if (data.boatName !== undefined) {
    formData.append("boatName", String(data.boatName));
  }

  if (data.boatType !== undefined) {
    formData.append("boatType", String(data.boatType));
  }

  if (data.engineHorsePower !== undefined) {
    formData.append("engineHorsePower", String(data.engineHorsePower));
  }

  if (data.boatLength !== undefined && data.boatLength !== "") {
    formData.append("boatLength", String(data.boatLength));
  }

  if (data.boatWidth !== undefined && data.boatWidth !== "") {
    formData.append("boatWidth", String(data.boatWidth));
  }

  if (data.boatValue !== undefined && data.boatValue !== "") {
    formData.append("boatValue", String(data.boatValue));
  }

  if (
    data.fuelEfficiencyFactor !== undefined &&
    data.fuelEfficiencyFactor !== ""
  ) {
    formData.append(
      "fuelEfficiencyFactor",
      String(data.fuelEfficiencyFactor),
    );
  }

  if (
    data.engineDegradationFactor !== undefined &&
    data.engineDegradationFactor !== ""
  ) {
    formData.append(
      "engineDegradationFactor",
      String(data.engineDegradationFactor),
    );
  }

  if (
    data.averageFuelPredictionError !== undefined &&
    data.averageFuelPredictionError !== ""
  ) {
    formData.append(
      "averageFuelPredictionError",
      String(data.averageFuelPredictionError),
    );
  }

  if (data.mode !== undefined && data.mode !== "") {
    formData.append("mode", String(data.mode));
  }

  if (data.boatImage) {
    formData.append("boatImage", data.boatImage);
  }

  return formData;
}

export function getMyBoats(): Promise<Boat[]> {
  return apiFetch<Boat[]>("/boats/my");
}

export function getAllBoatsForAdmin(): Promise<Boat[]> {
  return apiFetch<Boat[]>("/boats/admin/all");
}

export function getBoatTypes(): Promise<string[]> {
  return apiFetch<string[]>("/boats/types");
}

export function getBoatById(id: string): Promise<Boat> {
  return apiFetch<Boat>(`/boats/${id}`);
}

export function createBoat(data: BoatPayload): Promise<Boat> {
  return apiFetch<Boat>("/boats", {
    method: "POST",
    body: buildBoatFormData(data),
  });
}

export function updateBoat(
  id: string,
  data: Partial<BoatPayload>,
): Promise<Boat> {
  return apiFetch<Boat>(`/boats/${id}`, {
    method: "PATCH",
    body: buildBoatFormData(data),
  });
}

export function deleteBoat(
  id: string,
): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>(`/boats/${id}`, {
    method: "DELETE",
  });
}

export function getBoatLearningInsights(
  id: string,
): Promise<BoatLearningInsightsResponse> {
  return apiFetch<BoatLearningInsightsResponse>(
    `/boats/${id}/learning-insights`,
  );
}

export function getBoatPredictionHistory(
  id: string,
): Promise<BoatPredictionHistoryResponse> {
  return apiFetch<BoatPredictionHistoryResponse>(
    `/boats/${id}/prediction-history`,
  );
} 
