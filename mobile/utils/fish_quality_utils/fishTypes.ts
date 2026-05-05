// utils/fishTypes.ts

export interface ImageQualityInfo {
  width: number;
  height: number;
  aspect_ratio: number;
  sharpness: number;
  brightness: number;
  contrast: number;
  is_screenshot: boolean;
  quality_issues: string[];
}

/**
 * Status codes returned by the per-image validation pipeline.
 * The backend validates each image independently before running the
 * dual-image prediction, returning one of these status strings.
 */
export type PredictionStatus =
  | 'success'
  | 'success_no_grade'
  | 'invalid_pair'
  | 'no_fish'
  | 'species_mismatch'
  | 'unknown_species'
  | 'unsupported_species'
  | 'low_confidence'
  | 'rejected_at_stage1';

export interface PredictionResult {
  // Basic info
  isFish: boolean;
  fishLabel: string;
  fishConfidence: number;
  fishProbabilities: Record<string, number>;
  
  // Stage 2 (species)
  species?: string;
  speciesConfidence?: number;
  speciesProbabilities?: Record<string, number>;
  
  // Stage 3 (grade)
  grade?: string;
  gradeConfidence?: number;
  gradeProbabilities?: Record<string, number>;
  
  // Final combined result
  finalLabel?: string;
  
  // All probabilities for details
  allProbabilities?: {
    fish: Record<string, number>;
    species: Record<string, number>;
    grade: Record<string, number>;
  };
  
  // Validation if using two models
  pairValidation?: {
    matched: boolean;
    leftLabel: string;
    leftConfidence: number;
    rightLabel: string;
    rightConfidence: number;
  };
  
  // Image quality info
  imageQuality?: {
    left: ImageQualityInfo;
    right: ImageQualityInfo;
  };
  
  // Uncertainty metrics
  uncertainty?: number;
  
  // Warnings
  warnings?: string[];

  // ── Per-image validation (populated by the backend pipeline) ──────────
  /** Pipeline validation status (e.g. "success", "species_mismatch") */
  validationStatus?: PredictionStatus;
  /** Human-readable validation message from the backend */
  validationMessage?: string;
  /** Per-image fish detection & species prediction details */
  perImageValidation?: {
    leftFishDetected: boolean;
    leftFishConfidence: number;
    rightFishDetected: boolean;
    rightFishConfidence: number;
    leftSpecies?: string;
    leftSpeciesConfidence?: number;
    rightSpecies?: string;
    rightSpeciesConfidence?: number;
  };
}

export interface SpeciesPrediction {
  label: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface FishPairValidationResult {
  isValid: boolean;
  agreedLabel?: string;
  reason?: string;
  left: SpeciesPrediction;
  right: SpeciesPrediction;
}

export interface GradePrediction {
  label: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface FishPrediction {
  label: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface RunFishPipelineOptions {
  onProgress?: (message: string) => void;
  useTTA?: boolean; // Test-time augmentation
  enhancedPreprocessing?: boolean; // Apply enhancements for internet images
}

// LOWER THRESHOLDS for internet images
// Internet fish images often have different lighting, angles, and compression
// These thresholds are tuned to accept real-world fish photos while avoiding false positives
export const FISH_THRESHOLD = 0.55;       // ← Lowered to accept marginal fish detections (~55%)
export const SPECIES_THRESHOLD = 0.40;    // ← Lowered for internet images
export const GRADE_THRESHOLD = 0.45;
export const UNKNOWN_THRESHOLD = 0.25;    // ← Species unrecognized if below this

export const BINARY_LABELS = {
  0: "fish",
  1: "non_fish"
};

export const SPECIES_LABELS = {
  0: "flyingfish",
  1: "graymullet",
  2: "makerel",
  3: "tuna",
  4: "whitemullet",
  5: "yellowfintrevally"
};

export const GRADE_LABELS = {
  0: "A",
  1: "B",
  2: "C"
};