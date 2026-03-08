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
// More detailed polygon to prevent zones from appearing on land areas.
const SRI_LANKA_LAND_POLYGON: Array<{ latitude: number; longitude: number }> = [
  // Jaffna peninsula / north
  { latitude: 9.86, longitude: 79.95 },
  { latitude: 9.83, longitude: 80.10 },
  { latitude: 9.80, longitude: 80.25 },
  { latitude: 9.75, longitude: 80.40 },
  { latitude: 9.68, longitude: 80.55 },
  { latitude: 9.58, longitude: 80.70 },
  { latitude: 9.45, longitude: 80.82 },
  { latitude: 9.32, longitude: 80.92 },
  { latitude: 9.20, longitude: 81.00 },

  // North-east coast - highly detailed to prevent land overlap
  { latitude: 9.10, longitude: 81.08 },
  { latitude: 9.00, longitude: 81.15 },
  { latitude: 8.88, longitude: 81.22 },
  { latitude: 8.75, longitude: 81.28 },
  { latitude: 8.62, longitude: 81.33 },
  { latitude: 8.48, longitude: 81.37 },
  { latitude: 8.35, longitude: 81.40 },
  { latitude: 8.22, longitude: 81.43 },
  { latitude: 8.08, longitude: 81.45 },
  { latitude: 7.95, longitude: 81.47 },
  { latitude: 7.82, longitude: 81.48 },
  { latitude: 7.68, longitude: 81.50 },
  { latitude: 7.55, longitude: 81.51 },
  { latitude: 7.42, longitude: 81.52 },
  { latitude: 7.28, longitude: 81.53 },
  { latitude: 7.15, longitude: 81.53 },
  { latitude: 7.02, longitude: 81.53 },
  { latitude: 6.88, longitude: 81.52 },
  { latitude: 6.75, longitude: 81.50 },
  { latitude: 6.62, longitude: 81.47 },
  { latitude: 6.48, longitude: 81.43 },
  { latitude: 6.35, longitude: 81.38 },
  { latitude: 6.22, longitude: 81.32 },
  { latitude: 6.08, longitude: 81.25 },
  { latitude: 5.95, longitude: 81.17 },
  { latitude: 5.82, longitude: 81.08 },
  { latitude: 5.70, longitude: 80.98 },
  { latitude: 5.58, longitude: 80.88 },
  { latitude: 5.48, longitude: 80.77 },

  // South coast - detailed
  { latitude: 5.40, longitude: 80.65 },
  { latitude: 5.33, longitude: 80.52 },
  { latitude: 5.28, longitude: 80.38 },
  { latitude: 5.24, longitude: 80.24 },
  { latitude: 5.22, longitude: 80.10 },
  { latitude: 5.21, longitude: 79.95 },
  { latitude: 5.22, longitude: 79.80 },

  // West coast up to Puttalam/Mannar - detailed
  { latitude: 5.25, longitude: 79.68 },
  { latitude: 5.32, longitude: 79.58 },
  { latitude: 5.42, longitude: 79.50 },
  { latitude: 5.55, longitude: 79.44 },
  { latitude: 5.70, longitude: 79.40 },
  { latitude: 5.88, longitude: 79.38 },
  { latitude: 6.05, longitude: 79.38 },
  { latitude: 6.22, longitude: 79.39 },
  { latitude: 6.40, longitude: 79.41 },
  { latitude: 6.58, longitude: 79.43 },
  { latitude: 6.75, longitude: 79.46 },
  { latitude: 6.92, longitude: 79.49 },
  { latitude: 7.10, longitude: 79.52 },
  { latitude: 7.28, longitude: 79.55 },
  { latitude: 7.45, longitude: 79.58 },
  { latitude: 7.62, longitude: 79.62 },
  { latitude: 7.80, longitude: 79.66 },
  { latitude: 7.98, longitude: 79.70 },
  { latitude: 8.15, longitude: 79.75 },
  { latitude: 8.32, longitude: 79.80 },
  { latitude: 8.50, longitude: 79.85 },
  { latitude: 8.68, longitude: 79.89 },
  { latitude: 8.85, longitude: 79.92 },
  { latitude: 9.02, longitude: 79.94 },
  { latitude: 9.20, longitude: 79.95 },
  { latitude: 9.38, longitude: 79.95 },
  { latitude: 9.55, longitude: 79.95 },
  { latitude: 9.70, longitude: 79.95 },
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

const cellOverlapsLand = (
  lat0: number,
  lon0: number,
  dLat: number,
  dLon: number,
): boolean => {
  // Sample a small grid of points inside the cell.
  // This catches cases where coastline cuts through the cell but
  // centroid/corners are still offshore.
  const steps = [0, 0.25, 0.5, 0.75, 1];

  for (const a of steps) {
    for (const b of steps) {
      const p = { latitude: lat0 + dLat * a, longitude: lon0 + dLon * b };
      if (pointInPolygon(p, SRI_LANKA_LAND_POLYGON)) return true;
    }
  }

  return false;
};

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
      // Use multiple sample points inside the cell to avoid partial overlaps.
      if (cellOverlapsLand(lat0, lon0, dLat, dLon)) {
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
