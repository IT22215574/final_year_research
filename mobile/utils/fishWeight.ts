// utils/fishWeight.ts
// Fish weight estimation using species-specific biological formulas.
//
// Research-paper formula (primary for Skipjack Tuna):
//   Skipjack Tuna  — W(g) = 0.036211 × L^2.79  (L = fork length in cm, W in grams)
//                    W(kg) = (0.036211 × L^2.79) / 1000
//   Source: Length-weight research paper for Katsuwonus pelamis
//
// Indian Scad    — W = 0.005975   × L^3.1680     (L  = total length in cm, W in kg)
//
// Note: Girth is accepted for Skipjack Tuna but only used for confidence
// adjustment / validation — the primary estimate always comes from the
// research-paper length-weight formula.

// ── Supported species ──────────────────────────────────────────────────────────

export type SupportedSpecies = "skipjack_tuna" | "indian_scad";

/** Metadata for each supported species */
export const SPECIES_INFO: Record<
  SupportedSpecies,
  { displayName: string; scientificName: string; modelLabel: string }
> = {
  skipjack_tuna: {
    displayName: "Skipjack Tuna",
    scientificName: "Katsuwonus pelamis",
    modelLabel: "tuna",
  },
  indian_scad: {
    displayName: "Indian Scad",
    scientificName: "Decapterus russelli",
    modelLabel: "makerel",
  },
};

/** Map from model output label (e.g. "tuna") to the SupportedSpecies key */
export const MODEL_LABEL_TO_SPECIES: Record<string, SupportedSpecies> = {
  tuna: "skipjack_tuna",
  makerel: "indian_scad",
};

// ── Core formula ───────────────────────────────────────────────────────────────

/**
 * Calculate fish weight using a species-specific length–weight relationship.
 *
 * @param species  - species identifier ("skipjack_tuna" | "indian_scad")
 * @param lengthCm - measured length in centimetres (fork length for tuna,
 *                   total length for Indian scad)
 * @param girthCm  - optional girth (circumference) in centimetres; for
 *                   Skipjack Tuna it is accepted but NOT used in the primary
 *                   formula — only for confidence / validation purposes.
 * @returns estimated weight in **kilograms**, or `null` if inputs are invalid.
 */
export function calculateFishWeight(
  species: SupportedSpecies,
  lengthCm: number,
  girthCm?: number
): number | null {
  if (!isFinite(lengthCm) || lengthCm <= 0) return null;

  switch (species) {
    case "skipjack_tuna":
      // Research-paper formula: W(g) = 0.036211 × L^2.79
      // Convert grams → kilograms
      // Girth is NOT used for the primary calculation (only for confidence).
      return (0.036211 * Math.pow(lengthCm, 2.79)) / 1000;

    case "indian_scad":
      // W = 0.005975 × L^3.1680
      return 0.005975 * Math.pow(lengthCm, 3.168);

    default:
      return null;
  }
}

// ── Helper: resolve species from a model label ─────────────────────────────────

/**
 * Resolve the internal species key from a model output label.
 * Returns `null` when the label is not in the supported-species map.
 */
export function resolveSpecies(modelLabel?: string | null): SupportedSpecies | null {
  if (!modelLabel) return null;
  const key = modelLabel.toLowerCase().trim();
  return MODEL_LABEL_TO_SPECIES[key] ?? null;
}

// ── Structured result type ─────────────────────────────────────────────────────

export interface WeightEstimate {
  species: SupportedSpecies;
  speciesDisplayName: string;
  scientificName: string;
  /** Measured (or entered) fish length used for the calculation */
  lengthCm: number;
  /** Optional girth provided (used only for confidence/validation, NOT formula) */
  girthCm?: number;
  /** Estimated weight in kilograms, rounded to 3 decimal places */
  weightKg: number;
  /** Same value expressed in grams (rounded to 1 decimal place) */
  weightGrams: number;
  /** Formula method used */
  method: "research-length-weight" | "length-only";
  /** Human-readable formula string */
  formula: string;
  /** Confidence score (0–1) */
  confidence: number;
  /**
   * Size category — only populated for Skipjack Tuna.
   * Based on estimated weight thresholds: >3 kg → large, 1–3 kg → medium, <1 kg → small.
   * null for non-skipjack species or invalid weight.
   */
  sizeCategory: SkipjackSizeCategory | null;
}

/**
 * Full estimation pipeline: validates inputs, computes the formula, and
 * returns a structured {@link WeightEstimate}.
 *
 * For Skipjack Tuna the research-paper formula is always used:
 *   W(g) = 0.036211 × L^2.79
 * Girth, when provided, only boosts the confidence score.
 *
 * @param modelLabel - raw label from the grading model (e.g. "tuna", "makerel")
 * @param lengthCm   - fish length in centimetres
 * @param girthCm    - optional girth in centimetres (validation / confidence only)
 * @returns {@link WeightEstimate} or `null` when the species is unsupported or
 *          the length is invalid.
 */
export function estimateFishWeight(
  modelLabel: string,
  lengthCm: number,
  girthCm?: number
): WeightEstimate | null {
  const species = resolveSpecies(modelLabel);
  if (!species) return null;

  const weightKg = calculateFishWeight(species, lengthCm);
  if (weightKg === null) return null;

  const hasGirth = !!(girthCm && isFinite(girthCm) && girthCm > 0);

  // Confidence: base 0.75 for research formula, +0.10 if girth is available
  // for validation (capped at 0.90)
  let confidence: number;
  let method: "research-length-weight" | "length-only";
  let formula: string;

  if (species === "skipjack_tuna") {
    method = "research-length-weight";
    formula = "W = 0.036211 × L^2.79";
    confidence = hasGirth ? 0.85 : 0.75;
  } else {
    // Indian Scad — standard length-only
    method = "length-only";
    formula = "W = 0.005975 × L^3.168";
    confidence = 0.70;
  }

  const roundedKg = parseFloat(weightKg.toFixed(3));

  return {
    species,
    speciesDisplayName: SPECIES_INFO[species].displayName,
    scientificName: SPECIES_INFO[species].scientificName,
    lengthCm,
    girthCm: hasGirth ? girthCm : undefined,
    weightKg: roundedKg,
    weightGrams: parseFloat((weightKg * 1000).toFixed(1)),
    method,
    formula,
    confidence,
    // Size category is only for Skipjack Tuna — based on estimated weight thresholds
    sizeCategory: getSizeCategoryForSpecies(species, roundedKg),
  };
}

// ── Skipjack Tuna size classification ───────────────────────────────────────
// Size categories are ONLY for Skipjack Tuna, based on estimated weight:
//   > 3 kg  → "large"
//   1–3 kg  → "medium"
//   < 1 kg  → "small"
// These thresholds are used for market grading and reporting/analytics.

export type SkipjackSizeCategory = "small" | "medium" | "large";

/**
 * Classify a Skipjack Tuna by weight into a size category.
 *
 * @param weightKg - estimated weight in kilograms
 * @returns size category, or `null` if the weight is invalid (null, NaN, ≤ 0)
 *
 * Rules:
 *   - > 3 kg  → "large"
 *   - ≥ 1 kg and ≤ 3 kg → "medium"
 *   - < 1 kg  → "small"
 *
 * This function does NOT check species — the caller is responsible for
 * ensuring it is only applied to Skipjack Tuna.
 */
export function getSkipjackSizeCategory(
  weightKg: number | null | undefined,
): SkipjackSizeCategory | null {
  // Safely handle null, undefined, NaN, zero, and negative values
  if (weightKg == null || !isFinite(weightKg) || weightKg <= 0) return null;

  if (weightKg > 3) return "large";
  if (weightKg >= 1) return "medium";
  return "small";
}

/**
 * Convenience wrapper: resolves size category only for Skipjack Tuna.
 * Returns `null` for any other species or invalid weight.
 *
 * @param species - the resolved species key
 * @param weightKg - estimated weight in kg
 */
export function getSizeCategoryForSpecies(
  species: SupportedSpecies | null,
  weightKg: number | null | undefined,
): SkipjackSizeCategory | null {
  // Size classification is ONLY for Skipjack Tuna
  if (species !== "skipjack_tuna") return null;
  return getSkipjackSizeCategory(weightKg);
}

// ── Typical length range guard ─────────────────────────────────────────────────

/** Biologically plausible fork / total length ranges (cm) per species */
const LENGTH_RANGES: Record<SupportedSpecies, { min: number; max: number }> = {
  skipjack_tuna: { min: 15, max: 110 },
  indian_scad: { min: 8, max: 45 },
};

/**
 * Returns a warning string when `lengthCm` falls outside the expected
 * biological range for the given species, or `null` when the length is valid.
 */
export function lengthRangeWarning(
  species: SupportedSpecies,
  lengthCm: number
): string | null {
  const range = LENGTH_RANGES[species];
  if (lengthCm < range.min)
    return `${SPECIES_INFO[species].displayName} length (${lengthCm} cm) is below the expected minimum of ${range.min} cm.`;
  if (lengthCm > range.max)
    return `${SPECIES_INFO[species].displayName} length (${lengthCm} cm) exceeds the expected maximum of ${range.max} cm.`;
  return null;
}
