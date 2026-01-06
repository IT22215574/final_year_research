export type FishZoneInputs = {
  sstC: number;
  chlorophyllMgM3: number;
  currentSpeedMS: number;
  currentDirectionDeg: number;
};

export type FishZoneLevel = "LOW" | "MEDIUM" | "HIGH";

export type ZoneCell = {
  id: string;
  level: FishZoneLevel;
  polygon: Array<{ latitude: number; longitude: number }>;
};

export type DemoZoneOptions = {
  /** Desired grid resolution (defaults to 4 km to match chlorophyll 4x4 km). */
  cellSizeKm?: number;
  /** Safety cap to prevent rendering too many polygons when zoomed out. */
  maxCells?: number;
};

// Lightweight land mask for the demo grid (avoids drawing zones over Sri Lanka land).
// This is a conservative, hand-traced outline (still approximate, not a coastline).
// Intention: better to hide a few nearshore sea cells than to show zones on land.
const SRI_LANKA_LAND_POLYGON: Array<{ latitude: number; longitude: number }> = [
  // Jaffna peninsula / north
  { latitude: 9.86, longitude: 80.00 },
  { latitude: 9.83, longitude: 80.35 },
  { latitude: 9.72, longitude: 80.62 },
  { latitude: 9.55, longitude: 80.86 },
  { latitude: 9.30, longitude: 81.05 },

  // North-east down to Trinco/Batticaloa
  { latitude: 9.05, longitude: 81.22 },
  { latitude: 8.75, longitude: 81.40 },
  { latitude: 8.35, longitude: 81.55 },
  { latitude: 7.95, longitude: 81.63 },
  { latitude: 7.55, longitude: 81.72 },
  { latitude: 7.05, longitude: 81.78 },
  { latitude: 6.55, longitude: 81.76 },
  { latitude: 6.10, longitude: 81.60 },
  { latitude: 5.72, longitude: 81.34 },
  { latitude: 5.45, longitude: 81.10 },

  // South coast
  { latitude: 5.30, longitude: 80.85 },
  { latitude: 5.22, longitude: 80.55 },
  { latitude: 5.16, longitude: 80.25 },
  { latitude: 5.18, longitude: 79.95 },

  // West coast up to Puttalam/Mannar
  { latitude: 5.35, longitude: 79.70 },
  { latitude: 5.55, longitude: 79.55 },
  { latitude: 5.90, longitude: 79.45 },
  { latitude: 6.35, longitude: 79.40 },
  { latitude: 6.85, longitude: 79.45 },
  { latitude: 7.35, longitude: 79.50 },
  { latitude: 7.85, longitude: 79.55 },
  { latitude: 8.35, longitude: 79.65 },
  { latitude: 8.85, longitude: 79.75 },
  { latitude: 9.25, longitude: 79.85 },
  { latitude: 9.55, longitude: 79.92 },
];

const pointInPolygon = (
  point: { latitude: number; longitude: number },
  polygon: Array<{ latitude: number; longitude: number }>,
): boolean => {
  // Ray-casting algorithm
  const x = point.longitude;
  const y = point.latitude;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect =
      (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Quick demo scoring (NOT the real trained model):
 * - Prefers moderate SST
 * - Higher chlorophyll increases score
 * - Moderate currents help
 */
export const scoreFishSuitability = (inputs: FishZoneInputs): number => {
  const sstIdeal = 27.5;
  const sstSpread = 4.5;
  const sstScore = 1 - Math.min(1, Math.abs(inputs.sstC - sstIdeal) / sstSpread);

  const chlScore = clamp01((inputs.chlorophyllMgM3 - 0.1) / 1.2);

  const currentIdeal = 0.8;
  const currentSpread = 1.2;
  const currentScore = 1 - Math.min(1, Math.abs(inputs.currentSpeedMS - currentIdeal) / currentSpread);

  // small directional variation so changing direction shows something visually
  const directionScore = 0.85 + 0.15 * Math.abs(Math.cos((inputs.currentDirectionDeg * Math.PI) / 180));

  return clamp01(0.45 * sstScore + 0.4 * chlScore + 0.15 * currentScore) * directionScore;
};

export const levelFromScore = (score: number): FishZoneLevel => {
  if (score >= 0.7) return "HIGH";
  if (score >= 0.45) return "MEDIUM";
  return "LOW";
};

const kmPerDegLat = 110.574;
const kmPerDegLonAtLat = (latDeg: number) => 111.32 * Math.cos((latDeg * Math.PI) / 180);

const degreesPerKmLat = 1 / kmPerDegLat;
const degreesPerKmLon = (latDeg: number) => 1 / Math.max(1e-6, kmPerDegLonAtLat(latDeg));

/**
 * Generates a simple grid of polygons over the Sri Lanka sea area for demo.
 * This is a visualization helper until the real inference pipeline is wired.
 */
export const generateSriLankaDemoZones = (
  inputs: FishZoneInputs,
  options: DemoZoneOptions = {},
): ZoneCell[] => {
  // Rough bounding box around Sri Lanka + nearshore sea
  const latMin = 5.0;
  const latMax = 10.2;
  const lonMin = 79.2;
  const lonMax = 82.3;

  const requestedCellKm = options.cellSizeKm ?? 4;
  const maxCells = options.maxCells ?? 12000;

  const midLat = (latMin + latMax) / 2;

  // Target degrees for ~4x4 km cells.
  let dLat = requestedCellKm * degreesPerKmLat;
  let dLon = requestedCellKm * degreesPerKmLon(midLat);

  // Safety: if the requested resolution would produce too many cells for a mobile map,
  // increase cell size proportionally.
  const estRows = Math.ceil((latMax - latMin) / dLat);
  const estCols = Math.ceil((lonMax - lonMin) / dLon);
  const estCells = estRows * estCols;
  if (estCells > maxCells) {
    const factor = Math.sqrt(estCells / maxCells);
    const adjustedKm = requestedCellKm * factor;
    dLat = adjustedKm * degreesPerKmLat;
    dLon = adjustedKm * degreesPerKmLon(midLat);
  }

  const base = scoreFishSuitability(inputs);

  const zones: ZoneCell[] = [];
  for (let lat0 = latMin; lat0 + dLat <= latMax + 1e-9; lat0 += dLat) {
    for (let lon0 = lonMin; lon0 + dLon <= lonMax + 1e-9; lon0 += dLon) {
      // Add deterministic variation per cell
      const r = Math.floor((lat0 - latMin) / dLat);
      const c = Math.floor((lon0 - lonMin) / dLon);
      const wave = 0.10 * Math.sin((r + 1) * 1.7 + (c + 1) * 1.3);
      const drift = 0.06 * Math.cos(((inputs.currentDirectionDeg + r * 25 + c * 18) * Math.PI) / 180);
      const cellScore = clamp01(base + wave + drift);

      const level = levelFromScore(cellScore);

      // Use the loop coordinates; do not redeclare lat0/lon0 here (TS compile error).
      const polygon = [
        { latitude: lat0, longitude: lon0 },
        { latitude: lat0 + dLat, longitude: lon0 },
        { latitude: lat0 + dLat, longitude: lon0 + dLon },
        { latitude: lat0, longitude: lon0 + dLon },
      ];

      // Skip cells that fall on Sri Lankan land.
      const centroid = {
        latitude: lat0 + dLat / 2,
        longitude: lon0 + dLon / 2,
      };
      if (pointInPolygon(centroid, SRI_LANKA_LAND_POLYGON)) {
        continue;
      }

      zones.push({
        id: `r${r}-c${c}`,
        level,
        polygon,
      });
    }
  }

  return zones;
};
