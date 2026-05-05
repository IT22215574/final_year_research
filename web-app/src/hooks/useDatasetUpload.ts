import { useState } from 'react';
import { apiFetch, type ApiError } from '@/lib/api';

function isApiError(error: unknown): error is ApiError {
  return (
    !!error &&
    typeof error === 'object' &&
    'status' in error &&
    'message' in error
  );
}

export interface UploadResponse {
  message: string;
  dataset: {
    id: string;
    filename: string;
    boatType: string;
    uploadSource: 'csv' | 'json';
    status: string;
    rowCount: number;
    processedCount: number;
    errorCount: number;
    validationErrors: string[];
    createdAt: string;
  };
}

export function useDatasetUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadResponse | null>(null);

  const uploadDataset = async (
    file: File,
    boatType: string,
  ): Promise<UploadResponse | null> => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate file
      if (!file) {
        throw new Error('No file selected');
      }

      const validExtensions = ['.csv', '.json'];
      const hasValidExt = validExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext),
      );

      if (!hasValidExt) {
        throw new Error('File must be CSV or JSON format');
      }

      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File size must be less than 50MB');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('boatType', boatType);

      // Upload using apiFetch which handles baseUrl and auth
      const data = await apiFetch<UploadResponse>('training-uploads/upload', {
        method: 'POST',
        body: formData,
      });

      setSuccess(data);
      return data;
    } catch (err) {
      const message = isApiError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Upload failed';
      setError(message);
      console.error('Upload error:', err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    error,
    success,
    uploadDataset,
  };
}
