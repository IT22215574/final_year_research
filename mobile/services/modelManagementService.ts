/**
 * Model Management Service
 * 
 * Supports research lifecycle management:
 * - Reset boat models (cold-start demonstration)
 * - Retrain from historical data (algorithm improvement)
 * - Backup/restore coefficients (reproducibility)
 */

import { apiFetch } from '@/utils/api';

export interface ResetModelResponse {
  success: boolean;
  message: string;
  resetCoefficients: any;
  previousDataPoints: number;
  previousConfidence: number;
  backupCreated: boolean;
  backupFile?: string;
}

export interface RetrainModelResponse {
  success: boolean;
  message: string;
  tripsUsed: number;
  tripsFiltered: number;
  tripsAvailable: number;
  oldCoefficients: {
    confidence: number;
    dataPoints: number;
    avgPredictionError: number;
  };
  newCoefficients: {
    confidence: number;
    dataPoints: number;
    avgPredictionError: number;
    fuelEfficiencyFactor: number;
    engineDegradationFactor: number;
  };
  improvement: {
    errorReduction: number;
    confidenceChange: number;
    dataPointsChange: number;
  };
}

export interface BackupInfo {
  filename: string;
  timestamp: string;
  reason: string;
  dataPoints: number;
  confidence: number;
}

export interface BackupsResponse {
  boatId: string;
  backups: BackupInfo[];
  totalBackups: number;
}

/**
 * Reset boat's learned coefficients to defaults
 * 
 * Research use: Demonstrate cold-start learning vs mature model
 * Production use: Reset after boat engine replacement or bad data
 */
export const resetBoatModel = async (
  boatId: string,
  token: string
): Promise<ResetModelResponse> => {
  const response = await apiFetch(`/api/v1/trips/boats/${boatId}/reset-model`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return await response.json();
};

/**
 * Retrain boat model from historical trip data
 * 
 * Research value: Shows adaptive learning algorithm rebuilding from data
 * 
 * @param boatId - Boat to retrain
 * @param options - errorThreshold: filter outliers, maxDays: limit history
 * @param token - Auth token
 */
export const retrainBoatModel = async (
  boatId: string,
  options: { errorThreshold?: number; maxDays?: number },
  token: string
): Promise<RetrainModelResponse> => {
  const response = await apiFetch(`/api/v1/trips/boats/${boatId}/retrain`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(options),
  });
  return await response.json();
};

/**
 * Get list of coefficient backups for a boat
 * 
 * Supports research reproducibility - view backup history
 */
export const getBoatBackups = async (
  boatId: string,
  token: string
): Promise<BackupsResponse> => {
  const response = await apiFetch(`/api/v1/trips/boats/${boatId}/backups`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return await response.json();
};

/**
 * Admin only: Reset all boat models
 */
export const resetAllModels = async (token: string): Promise<any> => {
  const response = await apiFetch('/api/v1/trips/boats/reset-all', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return await response.json();
};
