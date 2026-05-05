import { create } from "zustand";

export interface FishingZone {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  fishType: string;
  estimatedCatch: string;
  distance: number;
  depth: string;
  season: string;
  color: string;
  density: string;
  // Additional fields from map
  fish_probability?: number;
  sst?: number;
  chlor_a?: number;
  bathymetry?: number;
}

// Map FishZone from API to store FishingZone
export interface MapFishZone {
  lat: number;
  lon: number;
  sst: number;
  chlor_a: number;
  water_u: number;
  water_v: number;
  fish_zone: number;
  fish_probability: number;
  bathymetry: number;
}

interface FishingZoneState {
  // State
  selectedZones: FishingZone[];
  currentZone: FishingZone | null;
  loading: boolean;
  error: string | null;

  // Actions
  setSelectedZones: (zones: FishingZone[]) => void;
  setCurrentZone: (zone: FishingZone | null) => void;
  addZone: (zone: FishingZone) => void;
  removeZone: (id: number) => void;
  clearZones: () => void;
  keepLastZone: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  // New action for map integration
  addMapZone: (mapZone: MapFishZone) => void;
}

// Helper function to convert map zone to fishing zone
export const convertMapZoneToFishingZone = (
  mapZone: MapFishZone,
  index: number,
): FishingZone => {
  return {
    id: Math.round(mapZone.lat * 100000 + mapZone.lon), // Create unique ID from coordinates
    name: `Zone ${index + 1}`,
    latitude: mapZone.lat,
    longitude: mapZone.lon,
    fishType: "Multiple",
    estimatedCatch: "TBD",
    distance: 0,
    depth: `${Math.round(mapZone.bathymetry)}m`,
    season: "Current",
    color: getProbabilityColor(mapZone.fish_probability),
    density: getProbabilityLabel(mapZone.fish_probability),
    // Store additional data
    fish_probability: mapZone.fish_probability,
    sst: mapZone.sst,
    chlor_a: mapZone.chlor_a,
    bathymetry: mapZone.bathymetry,
  };
};

// Helper functions for probability
const getProbabilityColor = (probability: number): string => {
  if (probability >= 0.8) return "#DC2626"; // red-600 - Very High
  if (probability >= 0.6) return "#EA580C"; // orange-600 - High
  if (probability >= 0.4) return "#F59E0B"; // amber-500 - Medium
  return "#10B981"; // green-500 - Low
};

const getProbabilityLabel = (probability: number): string => {
  if (probability >= 0.8) return "Very High";
  if (probability >= 0.6) return "High";
  if (probability >= 0.4) return "Medium";
  return "Low";
};

const useFishingZoneStore = create<FishingZoneState>((set) => ({
  // Initial state
  selectedZones: [],
  currentZone: null,
  loading: false,
  error: null,

  // Actions
  setSelectedZones: (zones) => set({ selectedZones: zones }),

  setCurrentZone: (zone) => set({ currentZone: zone }),

  addZone: (zone) =>
    set((state) => {
      // Don't add if already exists
      const exists = state.selectedZones.some((z) => z.id === zone.id);
      if (exists) {
        return { selectedZones: state.selectedZones };
      }
      return {
        selectedZones: [...state.selectedZones, zone],
      };
    }),

  removeZone: (id) =>
    set((state) => ({
      selectedZones: state.selectedZones.filter((z) => z.id !== id),
    })),

  clearZones: () => set({ selectedZones: [] }),

  keepLastZone: () =>
    set((state) => ({
      selectedZones:
        state.selectedZones.length > 0
          ? [state.selectedZones[state.selectedZones.length - 1]]
          : [],
    })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  // NEW: Add zone from map API response
  addMapZone: (mapZone) =>
    set((state) => {
      const fishingZone = convertMapZoneToFishingZone(
        mapZone,
        state.selectedZones.length,
      );

      // Don't add if already exists
      const exists = state.selectedZones.some(
        (z) =>
          Math.abs(z.latitude - mapZone.lat) < 0.001 &&
          Math.abs(z.longitude - mapZone.lon) < 0.001,
      );

      if (exists) {
        return { selectedZones: state.selectedZones };
      }

      return {
        selectedZones: [...state.selectedZones, fishingZone],
        currentZone: fishingZone,
      };
    }),
}));

export default useFishingZoneStore;
