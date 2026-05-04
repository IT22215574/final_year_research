import { apiFetch } from '@/utils/api';

export interface UploadedDatasetRecord {
  _id?: string;
  boatType: string;
  boatId: string;
  featuresSnapshot: Record<string, any>;
  labelSnapshot: Record<string, any>;
  validationStatus: 'VALID' | 'INVALID';
  validationMessage?: string;
}

export interface UploadedDatasetItem {
  id: string;
  filename: string;
  boatType: string;
  uploadSource: 'csv' | 'json';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'TRAINED';
  rowCount: number;
  processedCount: number;
  errorCount: number;
  validationErrors: string[];
  uploaderId: string;
  reviewerId?: string;
  reviewReason?: string;
  createdAt: string;
  reviewedAt?: string;
  syncedAt?: string;
  records: UploadedDatasetRecord[];
}

export const getPendingUploads = async (): Promise<UploadedDatasetItem[]> => {
  const response = await apiFetch('/api/v1/training-uploads/pending');
  if (!response.ok) {
    throw new Error('Failed to fetch pending uploads');
  }
  const data = await response.json();
  return data.datasets || [];
};

export const getApprovedUploads = async (): Promise<UploadedDatasetItem[]> => {
  const response = await apiFetch('/api/v1/training-uploads/approved');
  if (!response.ok) {
    throw new Error('Failed to fetch approved uploads');
  }
  const data = await response.json();
  return data.datasets || [];
};

export const getUploadsByBoatType = async (
  boatType: string,
): Promise<UploadedDatasetItem[]> => {
  const response = await apiFetch(
    `/api/v1/training-uploads/boat-type/${encodeURIComponent(boatType)}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch uploads for ${boatType}`);
  }
  const data = await response.json();
  return data.datasets || [];
};

export const getUploadById = async (id: string): Promise<UploadedDatasetItem> => {
  const response = await apiFetch(`/api/v1/training-uploads/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch upload details');
  }
  return await response.json();
};

export const approveUpload = async (
  id: string,
  reason?: string,
): Promise<any> => {
  const response = await apiFetch(`/api/v1/training-uploads/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    throw new Error('Failed to approve upload');
  }
  return await response.json();
};

export const rejectUpload = async (
  id: string,
  reason: string,
): Promise<any> => {
  const response = await apiFetch(`/api/v1/training-uploads/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    throw new Error('Failed to reject upload');
  }
  return await response.json();
};

export const getUploadStats = async (): Promise<any> => {
  const response = await apiFetch('/api/v1/training-uploads/stats/all');
  if (!response.ok) {
    throw new Error('Failed to fetch upload statistics');
  }
  return await response.json();
};
