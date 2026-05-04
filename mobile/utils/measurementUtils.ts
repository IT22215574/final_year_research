// utils/measurementUtils.ts
// Pure-function utilities for fish measurement: calibration, px→cm conversion,
// distance calculations, outlier detection, and confidence scoring.

import type {
  Point,
  LineSegment,
  CalibrationData,
  LinearMeasurement,
  MeasurementConfidence,
  WeightEstimate,
  WeightMethod,
  FishMeasurements,
} from "@/types/measurement";
import { SPECIES_GUIDES } from "@/types/measurement";
import type { SupportedSpecies } from "@/utils/fishWeight";
import { getSizeCategoryForSpecies } from "@/utils/fishWeight";

// ── Geometry helpers ───────────────────────────────────────────────────────────

/** Euclidean distance between two points. */
export function distance(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

/** Length of a line segment in pixels. */
export function lineLength(seg: LineSegment): number {
  return distance(seg.start, seg.end);
}

/** Midpoint of a line segment. */
export function midpoint(seg: LineSegment): Point {
  return {
    x: (seg.start.x + seg.end.x) / 2,
    y: (seg.start.y + seg.end.y) / 2,
  };
}

/** Angle of line segment in degrees (0° = horizontal right). */
export function lineAngle(seg: LineSegment): number {
  return (
    Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x) *
    (180 / Math.PI)
  );
}

// ── Calibration ────────────────────────────────────────────────────────────────

/**
 * Build a calibration from two reference points and a known real-world size.
 * @param points - The two points the user marked on the reference object.
 * @param realSizeCm - Real-world size of the reference object in cm.
 * @param objectType - Optional identifier for the reference object.
 */
export function buildCalibration(
  points: [Point, Point],
  realSizeCm: number,
  objectType?: string
): CalibrationData {
  const pxLen = distance(points[0], points[1]);
  if (pxLen <= 0) throw new Error("Reference points must not overlap.");
  if (realSizeCm <= 0) throw new Error("Reference size must be positive.");

  return {
    referenceObjectSizeCm: realSizeCm,
    pixelsPerCm: pxLen / realSizeCm,
    referencePoints: points,
    referencePixelLength: pxLen,
    referenceObjectType: objectType,
  };
}

/** Convert a pixel distance to centimetres using calibration. */
export function pixelsToCm(
  pixelDistance: number,
  calibration: CalibrationData
): number {
  if (calibration.pixelsPerCm <= 0)
    throw new Error("Invalid calibration: pixelsPerCm must be > 0.");
  return pixelDistance / calibration.pixelsPerCm;
}

/** Convert centimetres to pixels using calibration. */
export function cmToPixels(
  cm: number,
  calibration: CalibrationData
): number {
  return cm * calibration.pixelsPerCm;
}

// ── Measurement creation ──────────────────────────────────────────────────────

/**
 * Create a LinearMeasurement from a drawn line and calibration.
 * Includes confidence scoring based on pixel length and angle.
 */
export function createMeasurement(
  line: LineSegment,
  calibration: CalibrationData,
  expectedRange?: { min: number; max: number }
): LinearMeasurement {
  const pxLen = lineLength(line);
  const valueCm = pixelsToCm(pxLen, calibration);
  const confidence = scoreMeasurementConfidence(pxLen, valueCm, expectedRange);

  return {
    points: line,
    valueCm: parseFloat(valueCm.toFixed(2)),
    pixelLength: parseFloat(pxLen.toFixed(1)),
    confidence,
  };
}

/**
 * Create a manual measurement (no image points) from a user-entered cm value.
 */
export function createManualMeasurement(
  valueCm: number,
  expectedRange?: { min: number; max: number }
): LinearMeasurement {
  const confidence = expectedRange
    ? valueCm >= expectedRange.min && valueCm <= expectedRange.max
      ? "high"
      : "low"
    : "medium";

  return {
    points: { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } },
    valueCm,
    pixelLength: 0,
    confidence,
  };
}

// ── Confidence scoring ─────────────────────────────────────────────────────────

/**
 * Score measurement confidence based on pixel length and expected range.
 *
 * High confidence: ≥ 100 px span AND within expected range
 * Medium: ≥ 50 px span OR within range
 * Low: very short span OR far outside range
 */
export function scoreMeasurementConfidence(
  pixelLength: number,
  valueCm: number,
  expectedRange?: { min: number; max: number }
): MeasurementConfidence {
  let score = 0;

  // Pixel span scoring (longer = more precise)
  if (pixelLength >= 200) score += 3;
  else if (pixelLength >= 100) score += 2;
  else if (pixelLength >= 50) score += 1;

  // Range scoring
  if (expectedRange) {
    if (valueCm >= expectedRange.min && valueCm <= expectedRange.max) {
      score += 2;
    } else {
      const margin = (expectedRange.max - expectedRange.min) * 0.2;
      if (
        valueCm >= expectedRange.min - margin &&
        valueCm <= expectedRange.max + margin
      ) {
        score += 1;
      }
      // Outside with margin → no points
    }
  } else {
    score += 1; // neutral if no range given
  }

  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

// ── Outlier detection ──────────────────────────────────────────────────────────

/**
 * Check whether a measurement is biologically plausible for the given species.
 * Returns a warning string, or `null` if the value is acceptable.
 */
export function validateMeasurement(
  type: "length" | "girth",
  valueCm: number,
  speciesKey: string
): string | null {
  const guide = SPECIES_GUIDES[speciesKey];
  if (!guide) return null;

  const range =
    type === "length" ? guide.typicalLengthRange : guide.typicalGirthRange;

  if (valueCm < range.min * 0.5) {
    return `${valueCm.toFixed(1)} cm seems too small for ${guide.species} (expected ${range.min}–${range.max} cm). Check your calibration.`;
  }
  if (valueCm > range.max * 1.5) {
    return `${valueCm.toFixed(1)} cm seems too large for ${guide.species} (expected ${range.min}–${range.max} cm). Check your calibration.`;
  }
  if (valueCm < range.min || valueCm > range.max) {
    return `${valueCm.toFixed(1)} cm is outside the typical range for ${guide.species} (${range.min}–${range.max} cm).`;
  }
  return null;
}

// ── Multiple measurement averaging ────────────────────────────────────────────

/**
 * Average several measurements of the same metric, discarding outliers
 * that differ from the median by more than 2 × MAD (median absolute deviation).
 */
export function averageMeasurements(
  measurements: LinearMeasurement[]
): LinearMeasurement | null {
  if (measurements.length === 0) return null;
  if (measurements.length === 1) return measurements[0];

  const values = measurements.map((m) => m.valueCm).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];
  const deviations = values.map((v) => Math.abs(v - median));
  const mad =
    [...deviations].sort((a, b) => a - b)[Math.floor(deviations.length / 2)] ||
    1;

  // Keep only values within 2 × MAD of the median
  const filtered = measurements.filter(
    (m) => Math.abs(m.valueCm - median) <= 2 * mad
  );

  if (filtered.length === 0) return measurements[0]; // fallback

  const avgCm =
    filtered.reduce((s, m) => s + m.valueCm, 0) / filtered.length;
  const avgPx =
    filtered.reduce((s, m) => s + m.pixelLength, 0) / filtered.length;

  // Confidence is highest when multiple consistent readings are averaged
  const spread = Math.max(...filtered.map((m) => m.valueCm)) -
    Math.min(...filtered.map((m) => m.valueCm));
  let confidence: MeasurementConfidence = "high";
  if (spread > 5) confidence = "low";
  else if (spread > 2) confidence = "medium";

  return {
    points: filtered[0].points,
    valueCm: parseFloat(avgCm.toFixed(2)),
    pixelLength: parseFloat(avgPx.toFixed(1)),
    confidence,
  };
}

// ── Weight estimation (research-paper formula) ──────────────────────────────

/**
 * Estimate fish weight using the best available formula.
 *
 * Skipjack Tuna (research paper): W(g) = 0.036211 × L^2.79
 *   → girth is accepted but only used for confidence adjustment, NOT the formula.
 * Indian Scad (length-only):      W = 0.005975 × L^3.168  (kg)
 */
export function estimateWeight(
  species: SupportedSpecies,
  lengthCm: number,
  girthCm?: number
): WeightEstimate {
  if (!isFinite(lengthCm) || lengthCm <= 0) {
    return { valueKg: 0, method: "length-only", confidence: 0 };
  }

  let valueKg: number;
  let method: WeightMethod;
  let formula: string;
  let confidence: number;

  const hasGirth = !!(girthCm && isFinite(girthCm) && girthCm > 0);

  if (species === "skipjack_tuna") {
    // Research-paper formula: W(g) = 0.036211 × L^2.79  →  kg = g / 1000
    // Girth is NOT used in the formula — only boosts confidence.
    valueKg = (0.036211 * Math.pow(lengthCm, 2.79)) / 1000;
    method = "research-length-weight";
    formula = "W = 0.036211 × L^2.79";
    confidence = hasGirth ? 0.85 : 0.75;
  } else if (species === "indian_scad") {
    valueKg = 0.005975 * Math.pow(lengthCm, 3.168);
    method = "length-only";
    formula = `W = 0.005975 × L^3.168 = 0.005975 × ${lengthCm.toFixed(1)}^3.168`;
    confidence = 0.7;
  } else {
    return { valueKg: 0, method: "length-only", confidence: 0 };
  }

  const roundedKg = parseFloat(valueKg.toFixed(3));

  return {
    valueKg: roundedKg,
    method,
    confidence,
    formula,
    // Size category is only for Skipjack Tuna — based on estimated weight thresholds
    sizeCategory: getSizeCategoryForSpecies(species, roundedKg),
  };
}

// ── Coordinate transforms (image ↔ view) ──────────────────────────────────────

/**
 * Convert a touch coordinate on the view to the corresponding pixel in
 * the original image, accounting for image scaling and offset.
 */
export function viewToImageCoords(
  touchX: number,
  touchY: number,
  imageLayout: { x: number; y: number; width: number; height: number },
  imageNatural: { width: number; height: number },
  zoomScale: number = 1,
  panOffset: Point = { x: 0, y: 0 }
): Point {
  const relX = (touchX - imageLayout.x - panOffset.x) / zoomScale;
  const relY = (touchY - imageLayout.y - panOffset.y) / zoomScale;

  const scaleX = imageNatural.width / imageLayout.width;
  const scaleY = imageNatural.height / imageLayout.height;

  return {
    x: Math.round(relX * scaleX),
    y: Math.round(relY * scaleY),
  };
}

/**
 * Convert an image-pixel coordinate to view coordinates for rendering overlays.
 */
export function imageToViewCoords(
  imgX: number,
  imgY: number,
  imageLayout: { x: number; y: number; width: number; height: number },
  imageNatural: { width: number; height: number },
  zoomScale: number = 1,
  panOffset: Point = { x: 0, y: 0 }
): Point {
  const scaleX = imageLayout.width / imageNatural.width;
  const scaleY = imageLayout.height / imageNatural.height;

  return {
    x: imgX * scaleX * zoomScale + imageLayout.x + panOffset.x,
    y: imgY * scaleY * zoomScale + imageLayout.y + panOffset.y,
  };
}

// ── Build full FishMeasurements record ─────────────────────────────────────────

export function buildFishMeasurements(
  calibration: CalibrationData,
  length: LinearMeasurement,
  species: SupportedSpecies,
  girth?: LinearMeasurement
): FishMeasurements {
  const weightEstimate = estimateWeight(
    species,
    length.valueCm,
    girth?.valueCm
  );

  return {
    calibration,
    length,
    girth: girth ?? undefined,
    weightEstimate,
    measuredAt: new Date().toISOString(),
  };
}
