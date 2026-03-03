// utils/fishTypes.ts
export interface PredictionResult {
  isFish: boolean;
  fishLabel: string;
  fishConfidence: number;
  fishProbabilities: Record<string, number>;
  species?: string;
  speciesConfidence?: number;
  speciesProbabilities?: Record<string, number>;
  grade?: string;
  gradeConfidence?: number;
  gradeProbabilities?: Record<string, number>;
  finalLabel?: string;
  allProbabilities?: {
    fish: Record<string, number>;
    species: Record<string, number>;
    grade: Record<string, number>;
  };
  pairValidation?: {
    matched: boolean;
    leftLabel: string;
    leftConfidence: number;
    rightLabel: string;
    rightConfidence: number;
  };
  warnings?: string[];
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
}

export const FISH_THRESHOLD = 0.70;
export const SPECIES_THRESHOLD = 0.50;
export const GRADE_THRESHOLD = 0.50;

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