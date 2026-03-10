// types/measurement.ts
// Data models for the fish length & weight estimation system.

/** A 2D point in image pixel coordinates. */
export interface Point {
  x: number;
  y: number;
}

/** A line segment defined by start and end points. */
export interface LineSegment {
  start: Point;
  end: Point;
}

/** Confidence tier for a measurement. */
export type MeasurementConfidence = "high" | "medium" | "low";

/** Calibration data derived from a known-size reference object. */
export interface CalibrationData {
  /** Real-world size of the reference object (cm). */
  referenceObjectSizeCm: number;
  /** Computed pixels-per-centimetre ratio. */
  pixelsPerCm: number;
  /** The two points the user placed on the reference object. */
  referencePoints: Point[];
  /** Pixel distance between the reference points. */
  referencePixelLength: number;
  /** Label of the reference object chosen (e.g. "ruler_30cm"). */
  referenceObjectType?: string;
}

/** A single linear measurement (length or girth). */
export interface LinearMeasurement {
  /** Start and end points drawn by the user. */
  points: LineSegment;
  /** Converted real-world value in centimetres. */
  valueCm: number;
  /** Pixel distance between the two points. */
  pixelLength: number;
  /** Confidence tier based on measurement precision. */
  confidence: MeasurementConfidence;
}

/** Weight estimation method used. */
export type WeightMethod = "research-length-weight" | "length-only";

/** Weight estimate computed from measurements. */
export interface WeightEstimate {
  /** Estimated weight in kilograms. */
  valueKg: number;
  /** Which formula method was applied. */
  method: WeightMethod;
  /** Numerical confidence 0–1. */
  confidence: number;
  /** Human-readable formula description. */
  formula?: string;
  /**
   * Size category — only for Skipjack Tuna.
   * >3 kg → large, 1–3 kg → medium, <1 kg → small.
   */
  sizeCategory?: "small" | "medium" | "large" | null;
}

/** Complete measurement record for a single fish. */
export interface FishMeasurements {
  /** Calibration context used for px → cm conversion. */
  calibration: CalibrationData;
  /** Fork-length measurement or total-length depending on species. */
  length: LinearMeasurement;
  /** Optional girth/circumference measurement. */
  girth?: LinearMeasurement;
  /** Computed weight estimate. */
  weightEstimate: WeightEstimate;
  /** ISO timestamp of when the measurement was taken. */
  measuredAt?: string;
}

/** Undo/redo history entry for the measurement drawing. */
export interface MeasurementAction {
  type: "add-point" | "complete-line" | "clear";
  target: "calibration" | "length" | "girth";
  point?: Point;
  timestamp: number;
}

/** Reference objects with known real-world sizes. */
export const REFERENCE_OBJECTS: {
  key: string;
  label: string;
  sizeCm: number;
  description: string;
  icon: string; // MaterialIcons name
}[] = [
  {
    key: "ruler_30cm",
    label: "30 cm Ruler",
    sizeCm: 30,
    description: "Standard 30 cm ruler",
    icon: "straighten",
  },
  {
    key: "ruler_15cm",
    label: "15 cm Ruler",
    sizeCm: 15,
    description: "Half-size ruler",
    icon: "straighten",
  },
  {
    key: "a4_width",
    label: "A4 Paper (width)",
    sizeCm: 21.0,
    description: "Width of A4 paper",
    icon: "description",
  },
  {
    key: "a4_height",
    label: "A4 Paper (height)",
    sizeCm: 29.7,
    description: "Height of A4 paper",
    icon: "description",
  },
  {
    key: "credit_card_width",
    label: "Credit Card (width)",
    sizeCm: 8.56,
    description: "Standard credit/debit card width",
    icon: "credit-card",
  },
  {
    key: "coin_10_rupee",
    label: "10 Rupee Coin",
    sizeCm: 2.7,
    description: "Sri Lankan 10 rupee coin diameter",
    icon: "monetization-on",
  },
  {
    key: "fishing_crate",
    label: "Standard Fish Crate",
    sizeCm: 60,
    description: "Standard fishing crate length (~60 cm)",
    icon: "inventory-2",
  },
  {
    key: "custom",
    label: "Custom Size",
    sizeCm: 0,
    description: "Enter your own reference size",
    icon: "edit",
  },
];

/** Species-specific measurement guide information. */
export interface SpeciesMeasurementGuide {
  species: string;
  lengthType: "fork" | "total";
  lengthInstruction: string;
  girthInstruction: string;
  typicalLengthRange: { min: number; max: number };
  typicalGirthRange: { min: number; max: number };
  notes: string[];
}

export const SPECIES_GUIDES: Record<string, SpeciesMeasurementGuide> = {
  skipjack_tuna: {
    species: "Skipjack Tuna",
    lengthType: "fork",
    lengthInstruction:
      "Measure from the tip of the snout to the fork (center) of the tail.",
    girthInstruction:
      "Measure the circumference at the widest part of the body, just in front of the dorsal fin.",
    typicalLengthRange: { min: 15, max: 110 },
    typicalGirthRange: { min: 10, max: 75 },
    notes: [
      "Fork length is preferred for tuna species.",
      "Research-paper formula: W(g) = 0.036211 × L^2.79",
      "Girth is optional — used for validation and confidence only.",
    ],
  },
  indian_scad: {
    species: "Indian Scad (Shortfin Scad)",
    lengthType: "total",
    lengthInstruction:
      "Measure from the tip of the snout to the tip of the longest tail lobe.",
    girthInstruction:
      "Measure the circumference at the deepest part of the body.",
    typicalLengthRange: { min: 8, max: 45 },
    typicalGirthRange: { min: 5, max: 25 },
    notes: [
      "Total length is used for Indian Scad.",
      "Girth is optional — the length-only formula is well-established for this species.",
    ],
  },
};
