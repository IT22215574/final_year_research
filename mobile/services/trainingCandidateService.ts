import { apiFetch } from "@/utils/api";

const unwrapPayload = <T>(payload: any): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
};

export type TrainingCandidate = {
  _id: string;
  sourceTripId: string;
  boatId: string;
  boatType: string;
  featuresSnapshot: any;
  labelSnapshot: any;
  status: string;
  createdAt: string;
};

export type DatasetCsvFileInfo = {
  filename: string;
  scope: "ALL" | "BOAT_TYPE";
  boatTypeSlug: string | null;
  sizeBytes: number;
  rowCount: number;
  updatedAt: string;
};

export const getPendingCandidates = async (): Promise<TrainingCandidate[]> => {
  // Try sending it with /api/v1 if you have a global prefix, else just /api/v1/training-candidates/pending
  const response = await apiFetch("/api/v1/training-candidates/pending", {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch pending candidates");
  }

  const payload = await response.json();
  const data = unwrapPayload<TrainingCandidate[]>(payload);
  return Array.isArray(data) ? data : [];
};

export const approveCandidate = async (id: string) => {
  const response = await apiFetch(`/api/v1/training-candidates/${id}/approve`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to approve");
  return await response.json();
};

export const rejectCandidate = async (id: string, reason: string) => {
  const response = await apiFetch(`/api/v1/training-candidates/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error("Failed to reject");
  return await response.json();
};

export const triggerModelTraining = async (options?: {
  scope?: "GLOBAL" | "BOAT_TYPE";
  boatType?: string;
}) => {
  const response = await apiFetch("/api/v1/training-jobs/trigger", {
    method: "POST",
    body: JSON.stringify(options ?? {}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to trigger training");
  }
  return await response.json();
};

export const getTrainingHistory = async () => {
  const response = await apiFetch("/api/v1/training-jobs/history", {
    method: "GET",
  });
  if (!response.ok) throw new Error("Failed to fetch training history");
  const payload = await response.json();
  return unwrapPayload<any[]>(payload);
};

export const getBoatTypeTrainingAnalytics = async () => {
  const response = await apiFetch(
    "/api/v1/training-jobs/analytics/boat-types",
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch boat type analytics");
  }

  const payload = await response.json();
  return unwrapPayload<any>(payload);
};

export const getDatasetCsvFiles = async (): Promise<DatasetCsvFileInfo[]> => {
  const response = await apiFetch(
    "/api/v1/training-candidates/datasets/files",
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch dataset files");
  }

  const payload = await response.json();
  const data = unwrapPayload<DatasetCsvFileInfo[]>(payload);
  return Array.isArray(data) ? data : [];
};

export const refreshDatasetCsvFiles = async (boatType?: string) => {
  const endpoint = boatType
    ? `/api/v1/training-candidates/datasets/refresh/${encodeURIComponent(boatType)}`
    : "/api/v1/training-candidates/datasets/refresh";

  const response = await apiFetch(endpoint, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to refresh dataset files");
  }

  return await response.json();
};

export const getDatasetCsvContent = async (filename: string) => {
  const response = await apiFetch(
    `/api/v1/training-candidates/datasets/files/${encodeURIComponent(filename)}/content`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch dataset content");
  }

  return await response.json();
};

export const getModelVersions = async () => {
  const response = await apiFetch("/api/v1/model-registry/versions", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch model versions");
  }

  const payload = await response.json();
  const data = unwrapPayload<any[]>(payload);
  return Array.isArray(data) ? data : [];
};

export const getActiveModel = async () => {
  const response = await apiFetch("/api/v1/model-registry/active", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch active model");
  }

  const payload = await response.json();
  return unwrapPayload<any>(payload);
};

export const promoteModel = async (versionId: string) => {
  const response = await apiFetch(
    `/api/v1/model-registry/versions/${versionId}/promote`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to promote model");
  }

  return await response.json();
};

export const rollbackModel = async () => {
  const response = await apiFetch("/api/v1/model-registry/rollback", {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to rollback model");
  }

  return await response.json();
};
