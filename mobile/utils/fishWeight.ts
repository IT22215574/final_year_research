// utils/fishWeight.ts
// Fish weight estimation using species-specific biological formulas.
//
// Formulas:
//   Skipjack Tuna  — W = 0.00000497 × FL^3.39292  (FL = fork length in cm, W in kg)
//   Indian Scad    — W = 0.005975   × L^3.1680     (L  = total length in cm, W in kg)

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
 * @returns estimated weight in **kilograms**, or `null` if inputs are invalid.
 */
export function calculateFishWeight(
  species: SupportedSpecies,
  lengthCm: number
): number | null {
  if (!isFinite(lengthCm) || lengthCm <= 0) return null;

  switch (species) {
    case "skipjack_tuna":
      // W = 0.00000497 × FL^3.39292  (Froese & Pauly, FishBase)
      return 0.00000497 * Math.pow(lengthCm, 3.39292);

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
  /** Estimated weight in kilograms, rounded to 3 decimal places */
  weightKg: number;
  /** Same value expressed in grams (rounded to 1 decimal place) */
  weightGrams: number;
}

/**
 * Full estimation pipeline: validates inputs, computes the formula, and
 * returns a structured {@link WeightEstimate}.
 *
 * @param modelLabel - raw label from the grading model (e.g. "tuna", "makerel")
 * @param lengthCm   - fish length in centimetres
 * @returns {@link WeightEstimate} or `null` when the species is unsupported or
 *          the length is invalid.
 */
export function estimateFishWeight(
  modelLabel: string,
  lengthCm: number
): WeightEstimate | null {
  const species = resolveSpecies(modelLabel);
  if (!species) return null;

  const weightKg = calculateFishWeight(species, lengthCm);
  if (weightKg === null) return null;

  return {
    species,
    speciesDisplayName: SPECIES_INFO[species].displayName,
    scientificName: SPECIES_INFO[species].scientificName,
    lengthCm,
    weightKg: parseFloat(weightKg.toFixed(3)),
    weightGrams: parseFloat((weightKg * 1000).toFixed(1)),
  };
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
