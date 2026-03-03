// utils/fish_quality_utils/runFishPipeline.ts
// Backend-based mobile pipeline compatible with Expo Go.

import { prepareImageForUpload } from '@/utils/fish_quality_utils/preprocessImage';
import {
  type PredictionResult,
  type RunFishPipelineOptions,
} from '@/utils/fish_quality_utils/fishTypes';

const FISH_API_BASE = process.env.EXPO_PUBLIC_FISH_API_URL ?? 'http://localhost:8000';

export async function loadModels(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${FISH_API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Health check returned ${res.status}`);
    }

    const json = await res.json();
    if (!json.models_loaded) {
      throw new Error('Backend is reachable but models are not loaded yet');
    }

    console.log('[runFishPipeline] Backend ready:', json);
    return true;
  } catch (err: any) {
    clearTimeout(timeout);

    if (err?.name === 'AbortError') {
      throw new Error(
        `Timed out connecting to ${FISH_API_BASE}\n\n` +
        'Make sure the Python backend is running and your phone is connected to the same cable hotspot/network.'
      );
    }

    if (
      err?.name === 'TypeError' ||
      err?.message?.includes('Network request failed') ||
      err?.message?.includes('fetch')
    ) {
      throw new Error(
        `Cannot connect to ${FISH_API_BASE}\n\n` +
        'Check that the FastAPI server is running on port 8000 and EXPO_PUBLIC_FISH_API_URL is correct.'
      );
    }

    throw err;
  }
}

export async function runFishPipeline(
  leftUri: string,
  rightUri: string,
  options?: RunFishPipelineOptions
): Promise<PredictionResult> {
  const onProgress = options?.onProgress ?? (() => undefined);

  onProgress('Checking backend status...');
  await loadModels();

  onProgress('Preparing left image...');
  const leftImage = await prepareImageForUpload(leftUri, 'left_image');

  onProgress('Preparing right image...');
  const rightImage = await prepareImageForUpload(rightUri, 'right_image');

  const formData = new FormData();
  formData.append('left_image', leftImage as any);
  formData.append('right_image', rightImage as any);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res: Response;
  try {
    onProgress('Uploading images to backend...');
    res = await fetch(`${FISH_API_BASE}/predict`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out — backend took too long.');
    }
    throw new Error(`Network error: ${err.message}`);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    let detail = `Server error ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch (_) {
      // keep generic fallback
    }
    throw new Error(detail);
  }

  const data = await res.json();
  console.log('[runFishPipeline] Prediction response:', JSON.stringify(data));

  const stage1 = data.stage1;
  const stage2 = data.stage2 ?? null;
  const stage3 = data.stage3 ?? null;

  const isFish = stage1?.label === 'fish' && !!stage1?.threshold_met;

  const result: PredictionResult = {
    isFish,
    fishLabel: stage1?.label ?? 'unknown',
    fishConfidence: stage1?.confidence ?? 0,
    fishProbabilities: stage1?.probabilities ?? {},
    allProbabilities: {
      fish: stage1?.probabilities ?? {},
      species: stage2?.probabilities ?? {},
      grade: stage3?.probabilities ?? {},
    },
    warnings: data.warnings ?? [],
  };

  if (isFish && stage2 && stage3) {
    result.species = stage2.label;
    result.speciesConfidence = stage2.confidence;
    result.speciesProbabilities = stage2.probabilities ?? {};
    result.grade = stage3.label;
    result.gradeConfidence = stage3.confidence;
    result.gradeProbabilities = stage3.probabilities ?? {};
    result.finalLabel = data.final_result !== 'NOT FISH' ? data.final_result : undefined;
  }

  return result;
}

export default { loadModels, runFishPipeline };
