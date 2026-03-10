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
  /** Measured fish length in centimetres (stored for reporting & analytics) */
  measuredLengthCm?: number;
  /** Estimated weight in kilograms */
  estimatedWeightKg?: number;
  /** Estimated weight in grams */
  estimatedWeightGrams?: number;
  /**
   * Size category — only for Skipjack Tuna.
   * Based on estimated weight: >3 kg → large, 1–3 kg → medium, <1 kg → small.
   */
  sizeCategory?: 'small' | 'medium' | 'large' | null;
  /** Method used for weight estimation (e.g. "research-length-weight") */
  measurementMethod?: string;
  /** Confidence score (0–1) for the measurement */
  measurementConfidence?: number;
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
  // ── Measurement & size classification fields ────────────────────────────
  // Stored for future reporting and analytics.
  /** Measured fish length in centimetres */
  measuredLengthCm?: number;
  /** Estimated weight in kilograms */
  estimatedWeightKg?: number;
  /** Estimated weight in grams */
  estimatedWeightGrams?: number;
  /**
   * Size category (Skipjack Tuna only).
   * >3 kg → large, 1–3 kg → medium, <1 kg → small.
   */
  sizeCategory?: 'small' | 'medium' | 'large' | null;
  /** Method used (e.g. "research-length-weight", "length-only") */
  measurementMethod?: string;
  /** Measurement confidence 0–1 */
  measurementConfidence?: number;
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

  // ── Measurement & size classification fields ───────────────────────────
  // These are stored for future reporting and analytics.
  if (payload.measuredLengthCm != null)
    form.append('measuredLengthCm', String(payload.measuredLengthCm));
  if (payload.estimatedWeightKg != null)
    form.append('estimatedWeightKg', String(payload.estimatedWeightKg));
  if (payload.estimatedWeightGrams != null)
    form.append('estimatedWeightGrams', String(payload.estimatedWeightGrams));
  if (payload.sizeCategory)
    form.append('sizeCategory', payload.sizeCategory);
  if (payload.measurementMethod)
    form.append('measurementMethod', payload.measurementMethod);
  if (payload.measurementConfidence != null)
    form.append('measurementConfidence', String(payload.measurementConfidence));

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
