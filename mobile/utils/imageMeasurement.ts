// utils/imageMeasurement.ts
// Pixel-to-centimetre conversion helpers and fish length extraction.
//
// Two routes are provided:
//   1. Backend-assisted auto-measurement via POST /measure (preferred)
//   2. Heuristic estimate when no backend or calibration marker is available
//
// The caller always receives a FishLengthMeasurement that carries
// a `confidence` score so the UI can communicate uncertainty clearly.

import * as ImageManipulator from "expo-image-manipulator";

// ── Types ──────────────────────────────────────────────────────────────────────

/** A calibration factor derived from a known reference object in the image */
export interface CalibrationData {
  /** Number of pixels that span the reference object */
  referencePixelLength: number;
  /** Actual width / height of the reference object in centimetres */
  referenceCm: number;
  /** Derived pixels-per-centimetre factor */
  pixelsPerCm: number;
}

/** Result of measuring a fish's length (from either source) */
export interface FishLengthMeasurement {
  /** Estimated fish length in centimetres */
  lengthCm: number;
  /** Pixel span of the fish in the image */
  pixelLength: number;
  /** Reliability estimate: 0 (unreliable) to 1 (high confidence) */
  confidence: number;
  /** "auto" — came from a vision model;  "manual" — entered by the user */
  source: "auto" | "manual";
  /** Non-blocking advisory notes (e.g. "Image appears blurry") */
  warnings?: string[];
}

/** Raw size info returned after loading an image */
export interface ImageInfo {
  width: number;
  height: number;
}

// ── Built-in reference object sizes in centimetres ────────────────────────────

export const REFERENCE_OBJECTS = {
  A4_PAPER_WIDTH: 21.0,
  A4_PAPER_HEIGHT: 29.7,
  CREDIT_CARD_WIDTH: 8.56,
  CREDIT_CARD_HEIGHT: 5.4,
  RULER_10CM: 10.0,
  RULER_30CM: 30.0,
  /** Sri Lankan 1-rupee coin diameter ≈ 24 mm */
  COIN_1_RUPEE_DIAMETER: 2.4,
} as const;

export type ReferenceObjectKey = keyof typeof REFERENCE_OBJECTS;

// ── Calibration helpers ────────────────────────────────────────────────────────

/**
 * Build a {@link CalibrationData} from a measured pixel span and the known
 * real-world size of a reference object visible in the same image.
 *
 * @example
 * // A credit-card width spans 280 px in the photo:
 * const cal = buildCalibration(280, REFERENCE_OBJECTS.CREDIT_CARD_WIDTH);
 * // cal.pixelsPerCm ≈ 32.7
 */
export function buildCalibration(
  referencePixelLength: number,
  referenceCm: number
): CalibrationData {
  if (referencePixelLength <= 0)
    throw new Error("referencePixelLength must be a positive number.");
  if (referenceCm <= 0)
    throw new Error("referenceCm must be a positive number.");

  return {
    referencePixelLength,
    referenceCm,
    pixelsPerCm: referencePixelLength / referenceCm,
  };
}

/**
 * Convert a pixel distance to centimetres using a pre-built calibration.
 */
export function pixelToCm(
  pixels: number,
  calibration: CalibrationData
): number {
  if (calibration.pixelsPerCm <= 0)
    throw new Error("Calibration is invalid: pixelsPerCm must be > 0.");
  return pixels / calibration.pixelsPerCm;
}

/**
 * Build a *heuristic* calibration when no reference object is present.
 *
 * Assumes the fish fills `fractionOfWidth` of the image width and that
 * its length matches `expectedFishLengthCm`.  This is a fallback only —
 * confidence should be set low when using results from this calibration.
 *
 * @param imageWidth            - image width in pixels
 * @param expectedFishLengthCm  - rough expected length (default 40 cm)
 * @param fractionOfWidth       - estimated fraction of the image the fish spans (default 0.75)
 */
export function heuristicCalibration(
  imageWidth: number,
  expectedFishLengthCm = 40,
  fractionOfWidth = 0.75
): CalibrationData {
  const estimatedFishPixels = imageWidth * fractionOfWidth;
  return buildCalibration(estimatedFishPixels, expectedFishLengthCm);
}

// ── Image info ─────────────────────────────────────────────────────────────────

/**
 * Retrieve the pixel dimensions of a local image URI using
 * expo-image-manipulator (no network required).
 */
export async function getImageInfo(uri: string): Promise<ImageInfo> {
  const result = await ImageManipulator.manipulateAsync(uri, [], {
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { width: result.width, height: result.height };
}

// ── Backend-assisted measurement ───────────────────────────────────────────────

/**
 * Send a single image to POST `{apiBase}/measure` and extract the fish length.
 *
 * The endpoint is expected to return JSON in the shape:
 * ```json
 * {
 *   "length_cm": 48.2,
 *   "pixel_length": 920,
 *   "confidence": 0.87,
 *   "warnings": []
 * }
 * ```
 *
 * Returns `null` gracefully when the endpoint is unavailable so the caller
 * can fall back to manual input or the heuristic estimate.
 *
 * @param imageUri - local URI of the image to measure
 * @param apiBase  - base URL of the FastAPI backend (e.g., "http://192.168.1.100:8000")
 * @param side     - identifies whether this is the left or right image
 */
export async function extractFishLengthFromImage(
  imageUri: string,
  apiBase: string,
  side: "left" | "right" = "left"
): Promise<FishLengthMeasurement | null> {
  try {
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      name: `${side}_image.jpg`,
      type: "image/jpeg",
    } as any);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(`${apiBase}/measure`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(
        `[extractFishLengthFromImage] /measure returned HTTP ${res.status}`
      );
      return null;
    }

    const data = await res.json();

    return {
      lengthCm: data.length_cm as number,
      pixelLength: data.pixel_length as number,
      confidence: data.confidence ?? 0.7,
      source: "auto",
      warnings: data.warnings ?? [],
    };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("[extractFishLengthFromImage] Request timed out.");
    } else {
      console.warn("[extractFishLengthFromImage] Failed:", err?.message);
    }
    return null;
  }
}

// ── Averaging both images ──────────────────────────────────────────────────────

/**
 * Combine measurements from the left and right images into a single, more
 * robust estimate.
 *
 * Each measurement is weighted by its `confidence` score.  A warning is
 * appended when the two measurements differ by more than 5 cm, which may
 * indicate that the images are framed differently or show different fish.
 *
 * @param left  - measurement from the left image  (may be `null`)
 * @param right - measurement from the right image (may be `null`)
 * @returns averaged measurement, or `null` when both inputs are `null`
 */
export function averageLengthFromBothImages(
  left: FishLengthMeasurement | null,
  right: FishLengthMeasurement | null
): FishLengthMeasurement | null {
  if (!left && !right) return null;
  if (!left) return right;
  if (!right) return left;

  const totalConf = left.confidence + right.confidence;
  const wL = left.confidence / totalConf;
  const wR = right.confidence / totalConf;

  const avgLengthCm = wL * left.lengthCm + wR * right.lengthCm;
  const avgPixelLength = wL * left.pixelLength + wR * right.pixelLength;

  const warnings: string[] = [
    ...(left.warnings ?? []),
    ...(right.warnings ?? []),
  ];

  const diff = Math.abs(left.lengthCm - right.lengthCm);
  if (diff > 5) {
    warnings.push(
      `Measurement discrepancy of ${diff.toFixed(1)} cm between left and right images. ` +
        "Ensure both photos show the same fish from the same distance."
    );
  }

  return {
    lengthCm: parseFloat(avgLengthCm.toFixed(2)),
    pixelLength: parseFloat(avgPixelLength.toFixed(1)),
    confidence: Math.min(left.confidence, right.confidence),
    source: "auto",
    warnings,
  };
}

// ── Heuristic fallback measurement ────────────────────────────────────────────

/**
 * Produce a low-confidence length estimate purely from image dimensions.
 * Use only as a last resort when neither calibration nor a backend measurement
 * is available.
 *
 * @param imageWidth            - image width in pixels
 * @param expectedFishLengthCm  - rough expected fish length (default 40 cm)
 * @param fractionOfWidth       - fraction of the image that the fish spans (default 0.75)
 */
export function estimateLengthHeuristic(
  imageWidth: number,
  expectedFishLengthCm = 40,
  fractionOfWidth = 0.75
): FishLengthMeasurement {
  const cal = heuristicCalibration(
    imageWidth,
    expectedFishLengthCm,
    fractionOfWidth
  );
  const pixelLength = imageWidth * fractionOfWidth;
  return {
    lengthCm: parseFloat(pixelToCm(pixelLength, cal).toFixed(2)),
    pixelLength,
    confidence: 0.3,
    source: "auto",
    warnings: [
      "Length estimated heuristically — for accurate results please enter the measurement manually.",
    ],
  };
}

// ── Manual measurement helper ─────────────────────────────────────────────────

/**
 * Wrap a user-entered length value in a {@link FishLengthMeasurement} so it
 * can flow through the same pipeline as auto-measured values.
 */
export function manualMeasurement(lengthCm: number): FishLengthMeasurement {
  if (!isFinite(lengthCm) || lengthCm <= 0)
    throw new Error("Length must be a positive number.");
  return {
    lengthCm,
    pixelLength: 0,
    confidence: 1.0,
    source: "manual",
  };
}
