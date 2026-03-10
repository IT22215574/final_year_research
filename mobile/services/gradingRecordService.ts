// services/gradingRecordService.ts
import { apiFetch } from '@/utils/api';

export type GradingRecord = {
  _id: string;
  userId: string;
  fishSpecies?: string;
  fishName?: string;
  predictedGrade?: string;
  gradeConfidence?: number;
  speciesConfidence?: number;
  imagePaths: string[];
  notes?: string;
  marketStatus: 'saved' | 'used_in_market';
  createdAt: string;
  updatedAt?: string;
};

export type SaveGradingPayload = {
  fishSpecies?: string;
  fishName?: string;
  predictedGrade?: string;
  gradeConfidence?: number;
  speciesConfidence?: number;
  notes?: string;
  /** optional: left and/or right image local URIs to upload */
  imageUris?: string[];
};

/** Build a FormData body — avoids Content-Type collision for multipart */
function buildForm(payload: SaveGradingPayload): FormData {
  const form = new FormData();
  if (payload.fishSpecies)
    form.append('fishSpecies', payload.fishSpecies);
  if (payload.fishName)
    form.append('fishName', payload.fishName);
  if (payload.predictedGrade)
    form.append('predictedGrade', payload.predictedGrade);
  if (payload.gradeConfidence != null)
    form.append('gradeConfidence', String(payload.gradeConfidence));
  if (payload.speciesConfidence != null)
    form.append('speciesConfidence', String(payload.speciesConfidence));
  if (payload.notes)
    form.append('notes', payload.notes);

  for (const uri of payload.imageUris ?? []) {
    const filename = uri.split('/').pop() ?? 'image.jpg';
    const match = /\.([^.]+)$/.exec(filename);
    const ext = (match?.[1] ?? 'jpeg').toLowerCase();
    // Map extension to a valid MIME type the backend accepts
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    const type = mimeMap[ext] ?? 'image/jpeg';
    form.append('images', { uri, name: filename, type } as any);
  }

  return form;
}

/** POST /api/v1/quality-grading-records */
export async function saveGradingRecord(
  payload: SaveGradingPayload,
): Promise<GradingRecord> {
  const res = await apiFetch('/api/v1/quality-grading-records', {
    method: 'POST',
    body: buildForm(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message ?? `Error ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

/** GET /api/v1/quality-grading-records/my-history */
export async function fetchGradingHistory(
  limit = 20,
  skip = 0,
): Promise<GradingRecord[]> {
  const res = await apiFetch(
    `/api/v1/quality-grading-records/my-history?limit=${limit}&skip=${skip}`,
  );
  if (!res.ok) throw new Error(`Failed to load history (${res.status})`);
  return res.json();
}

/** GET /api/v1/quality-grading-records/:id */
export async function fetchGradingRecord(id: string): Promise<GradingRecord> {
  const res = await apiFetch(`/api/v1/quality-grading-records/${id}`);
  if (!res.ok) throw new Error(`Failed to load record (${res.status})`);
  return res.json();
}

/** DELETE /api/v1/quality-grading-records/:id */
export async function deleteGradingRecord(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`/api/v1/quality-grading-records/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete record (${res.status})`);
  return res.json();
}
