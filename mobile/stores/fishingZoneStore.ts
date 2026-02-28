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
}

const useFishingZoneStore = create<FishingZoneState>((set) => ({
  // Initial state
  selectedZones: [],
  currentZone: null,
  loading: false,
  error: null,
  
  // Actions
  setSelectedZones: (zones) => set({ selectedZones: zones }),
  
  setCurrentZone: (zone) => set({ currentZone: zone }),
  
  addZone: (zone) => set((state) => {
    // Don't add if already exists
    const exists = state.selectedZones.some(z => z.id === zone.id);
    if (exists) {
      return { selectedZones: state.selectedZones };
    }
    return { 
      selectedZones: [...state.selectedZones, zone] 
    };
  }),
  
  removeZone: (id) => set((state) => ({
    selectedZones: state.selectedZones.filter(z => z.id !== id)
  })),
  
  clearZones: () => set({ selectedZones: [] }),
  
  keepLastZone: () => set((state) => ({
    selectedZones: state.selectedZones.length > 0 
      ? [state.selectedZones[state.selectedZones.length - 1]]
      : []
  })),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
}));

export default useFishingZoneStore;