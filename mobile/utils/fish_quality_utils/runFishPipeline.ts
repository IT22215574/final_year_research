// utils/fish_quality_utils/runFishPipeline.ts

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { prepareImageForUpload, assessImageQuality } from '@/utils/fish_quality_utils/preprocessImage';
import {
  type PredictionResult,
  type RunFishPipelineOptions,
  FISH_THRESHOLD,
  SPECIES_THRESHOLD,
  GRADE_THRESHOLD,
  UNKNOWN_THRESHOLD,
} from '@/utils/fish_quality_utils/fishTypes';

// Get the appropriate API base URL for different platforms
const getApiBase = (): string => {
  // Use environment variable if configured
  const configured = process.env.EXPO_PUBLIC_FISH_API_URL;
  if (configured) {
    return configured;
  }
  
  // Fallback defaults for different platforms in development
  if (__DEV__) {
    // Android emulator
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000';
    }
    // iOS simulator or physical iOS device on same network
    if (Platform.OS === 'ios') {
      return 'http://localhost:8000';
    }
  }
  
  // Production fallback
  throw new Error(
    'EXPO_PUBLIC_FISH_API_URL is not configured. Please set it in your .env file.'
  );
};

const FISH_API_BASE = getApiBase();

/**
 * Check if backend server is available and models are loaded
 */
export async function loadModels(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    console.log(`[runFishPipeline] Checking backend at ${FISH_API_BASE}/health`);
    
    const res = await fetch(`${FISH_API_BASE}/health`, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Health check returned ${res.status}`);
    }

    const json = await res.json();
    console.log('[runFishPipeline] Backend response:', json);
    
    if (!json.models_loaded) {
      throw new Error('Backend is reachable but models are not loaded yet');
    }

    console.log('[runFishPipeline] Backend ready');
    return true;
  } catch (err: any) {
    clearTimeout(timeout);

    if (err?.name === 'AbortError') {
      throw new Error(
        `⏱️ Connection timeout\n\n` +
        `Could not reach ${FISH_API_BASE}\n\n` +
        `Make sure the Python backend is running and your phone is on the same network.\n\n` +
        `If using a physical device, use your computer's IP address (e.g., http://192.168.1.100:8000)`
      );
    }

    if (
      err?.name === 'TypeError' ||
      err?.message?.includes('Network request failed') ||
      err?.message?.includes('fetch')
    ) {
      throw new Error(
        `📡 Network error\n\n` +
        `Cannot connect to ${FISH_API_BASE}\n\n` +
        `Check that:\n` +
        `• FastAPI server is running on port 8000\n` +
        `• EXPO_PUBLIC_FISH_API_URL is correct\n` +
        `• Firewall allows the connection`
      );
    }

    throw err;
  }
}

/**
 * Main pipeline function to run fish classification
 */
export async function runFishPipeline(
  leftUri: string,
  rightUri: string,
  options?: RunFishPipelineOptions
): Promise<PredictionResult> {
  const onProgress = options?.onProgress ?? (() => undefined);
  const useTTA = options?.useTTA ?? true;
  const enhancedPreprocessing = options?.enhancedPreprocessing ?? true;

  onProgress('Checking backend status...');
  await loadModels();

  // Assess image quality
  onProgress('Analyzing image quality...');
  const [leftQuality, rightQuality] = await Promise.all([
    assessImageQuality(leftUri),
    assessImageQuality(rightUri),
  ]);

  // Check if images might be screenshots
  const isScreenshot = leftQuality.isScreenshot || rightQuality.isScreenshot;
  
  if (isScreenshot) {
    console.log('[runFishPipeline] Screenshot detected, applying enhancements');
    onProgress('Enhancing images for better results...');
  }

  onProgress('Preparing left image...');
  const leftImage = await prepareImageForUpload(leftUri, 'left_image', { 
    enhance: enhancedPreprocessing && isScreenshot 
  });

  onProgress('Preparing right image...');
  const rightImage = await prepareImageForUpload(rightUri, 'right_image', { 
    enhance: enhancedPreprocessing && isScreenshot 
  });

  const formData = new FormData();
  formData.append('left_image', leftImage as any);
  formData.append('right_image', rightImage as any);
  
  // Add TTA parameter
  formData.append('use_tta', String(useTTA));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res: Response;
  try {
    onProgress('Uploading images to backend...');
    console.log(`[runFishPipeline] Sending to ${FISH_API_BASE}/predict`);
    
    res = await fetch(`${FISH_API_BASE}/predict`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out — backend took too long to respond.');
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

  // ── Per-image validation: intercept failures before normal processing ──
  const backendStatus: string = data.status ?? '';
  const VALIDATION_FAILURES = [
    'no_fish', 'invalid_pair', 'species_mismatch',
    'unknown_species', 'unsupported_species',
  ];

  if (VALIDATION_FAILURES.includes(backendStatus)) {
    const piv = data.per_image_validation;

    const validationResult: PredictionResult = {
      isFish: backendStatus !== 'no_fish',
      fishLabel: data.stage1?.label ?? (piv?.left_fish_label ?? 'unknown'),
      fishConfidence: data.stage1?.confidence ??
        Math.max(piv?.left_fish_confidence ?? 0, piv?.right_fish_confidence ?? 0),
      fishProbabilities: data.stage1?.probabilities ?? {},
      validationStatus: backendStatus as PredictionResult['validationStatus'],
      validationMessage: data.message ?? 'Validation failed.',
      warnings: data.warnings ?? [],
      imageQuality: data.image_quality
        ? { left: data.image_quality.left, right: data.image_quality.right }
        : undefined,
      perImageValidation: piv
        ? {
            leftFishDetected: piv.left_fish_detected ?? false,
            leftFishConfidence: piv.left_fish_confidence ?? 0,
            rightFishDetected: piv.right_fish_detected ?? false,
            rightFishConfidence: piv.right_fish_confidence ?? 0,
            leftSpecies: piv.left_species,
            leftSpeciesConfidence: piv.left_species_confidence,
            rightSpecies: piv.right_species,
            rightSpeciesConfidence: piv.right_species_confidence,
          }
        : undefined,
    };

    // Attach pair validation for species_mismatch
    if (data.pair_validation) {
      validationResult.pairValidation = {
        matched: data.pair_validation.matched,
        leftLabel: data.pair_validation.left_label,
        leftConfidence: data.pair_validation.left_confidence,
        rightLabel: data.pair_validation.right_label,
        rightConfidence: data.pair_validation.right_confidence,
      };
    }

    return validationResult;
  }

  // ── Normal processing (success / success_no_grade / low_confidence) ────
  const stage1 = data.stage1;
  const stage2 = data.stage2 ?? null;
  const stage3 = data.stage3 ?? null;

  // Adjust threshold for screenshots
  let fishThreshold = FISH_THRESHOLD;
  if (isScreenshot) {
    fishThreshold = 0.40; // lowered for screenshots
  }

  // Stage 1: fish vs non_fish — use adjusted threshold
  const isFish = stage1?.label === 'fish' && stage1?.confidence >= fishThreshold;

  // Build warnings array
  const warnings: string[] = data.warnings ?? [];
  
  if (isScreenshot) {
    warnings.push('Image appears to be a screenshot - results may be less accurate');
  }
  
  if (leftQuality.qualityIssues.length > 0) {
    warnings.push(`Left image issues: ${leftQuality.qualityIssues.join(', ')}`);
  }
  
  if (rightQuality.qualityIssues.length > 0) {
    warnings.push(`Right image issues: ${rightQuality.qualityIssues.join(', ')}`);
  }

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
    imageQuality: {
      left: {
        width: leftQuality.width,
        height: leftQuality.height,
        aspect_ratio: leftQuality.aspectRatio,
        sharpness: 0,
        brightness: 0,
        contrast: 0,
        is_screenshot: leftQuality.isScreenshot,
        quality_issues: leftQuality.qualityIssues
      },
      right: {
        width: rightQuality.width,
        height: rightQuality.height,
        aspect_ratio: rightQuality.aspectRatio,
        sharpness: 0,
        brightness: 0,
        contrast: 0,
        is_screenshot: rightQuality.isScreenshot,
        quality_issues: rightQuality.qualityIssues
      }
    },
    uncertainty: data.stage1?.uncertainty || 0,
    warnings,
  };

  if (isFish && stage2) {
    const rawLabel = stage2.label as string;
    const conf = stage2.confidence as number;

    // If confidence is very low → unknown fish (still IS a fish, just unrecognised species)
    if (conf < UNKNOWN_THRESHOLD) {
      result.species = "unknown";
      result.speciesConfidence = conf;
      result.speciesProbabilities = stage2.probabilities ?? {};
      result.finalLabel = "Unknown Fish Species";
      result.warnings?.push("Species not recognised — may be outside supported species list");
    } else {
      result.species = rawLabel;
      result.speciesConfidence = conf;
      result.speciesProbabilities = stage2.probabilities ?? {};

      if (stage3 && stage3.label !== 'not_applicable') {
        result.grade = stage3.label;
        result.gradeConfidence = stage3.confidence;
        result.gradeProbabilities = stage3.probabilities ?? {};
        result.finalLabel = data.final_result !== 'NOT FISH' ? data.final_result : undefined;
      } else {
        result.finalLabel = rawLabel;
      }
    }
  }

  // Add pair validation if available
  if (data.pair_validation) {
    result.pairValidation = {
      matched: data.pair_validation.matched,
      leftLabel: data.pair_validation.left_label,
      leftConfidence: data.pair_validation.left_confidence,
      rightLabel: data.pair_validation.right_label,
      rightConfidence: data.pair_validation.right_confidence,
    };
  }

  // Pass through backend validation status & per-image details
  result.validationStatus =
    (data.status ?? 'success') as PredictionResult['validationStatus'];
  result.validationMessage = data.message;

  if (data.per_image_validation) {
    const piv = data.per_image_validation;
    result.perImageValidation = {
      leftFishDetected: piv.left_fish_detected ?? true,
      leftFishConfidence: piv.left_fish_confidence ?? 0,
      rightFishDetected: piv.right_fish_detected ?? true,
      rightFishConfidence: piv.right_fish_confidence ?? 0,
      leftSpecies: piv.left_species,
      leftSpeciesConfidence: piv.left_species_confidence,
      rightSpecies: piv.right_species,
      rightSpeciesConfidence: piv.right_species_confidence,
    };
  }

  return result;
}

export default { loadModels, runFishPipeline };