// mobile/stores/tripStore.ts
import { create } from "zustand";
import { Trip, TripStats } from "@/types/type";

// ==============================
// DATCIE Types (Frontend-friendly)
// ==============================

export type DatcieMode = "island" | "international";

export type DatciePredictBody = {
  boatId: string;

  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;

  windSpeed: number;
  waveHeight: number;

  fuelPrice: number;

  expectedCatch: number;
  marketPrice: number;

  fishingHours: number;
  numberOfDays: number;
  crewCount: number;

  speed?: number;
  mode?: DatcieMode;
};

export type DatcieLogActualBody = {
  actualFuelLiters: number; // ✅ correct backend field
  actualCatchKg: number;
};

// ==============================
// Store Interface
// ==============================

interface TripState {
  // ==========================
  // Existing
  // ==========================
  trips: Trip[];
  currentTrip: Trip | null;
  stats: TripStats | null;

  loading: boolean;
  error: string | null;

  setTrips: (trips: Trip[]) => void;
  setCurrentTrip: (trip: Trip | null) => void;
  setStats: (stats: TripStats | null) => void;
  addTrip: (trip: Trip) => void;
  updateTrip: (id: string, trip: Trip) => void;
  deleteTrip: (id: string) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearTrips: () => void;

  // ==========================
  // DATCIE flow cache (NEW)
  // ==========================
  datcieBody: DatciePredictBody | null;
  setDatcieBody: (body: DatciePredictBody | null) => void;

  datciePrediction: any | null; // /cost-engine/predict response
  setDatciePrediction: (res: any | null) => void;

  datcieOptimization: any | null; // /cost-engine/optimize response
  setDatcieOptimization: (res: any | null) => void;

  // saved trip (predict-and-save)
  lastSavedTrip: any | null;
  lastSavedTripId: string | null;
  setLastSavedTrip: (trip: any | null) => void;
  setLastSavedTripId: (id: string | null) => void;

  // learning response (log-actual)
  lastLearningResult: any | null;
  setLastLearningResult: (res: any | null) => void;

  clearDatcie: () => void;
}

// ==============================
// Store Implementation
// ==============================

const useTripStore = create<TripState>((set) => ({
  // ---------- existing ----------
  trips: [],
  currentTrip: null,
  stats: null,

  loading: false,
  error: null,

  setTrips: (trips) => set({ trips }),
  setCurrentTrip: (trip) => set({ currentTrip: trip }),
  setStats: (stats) => set({ stats }),

  addTrip: (trip) =>
    set((state) => ({
      trips: [trip, ...state.trips],
    })),

  updateTrip: (id, updatedTrip) =>
    set((state) => ({
      trips: state.trips.map((t: any) =>
        String(t?._id) === String(id) ? updatedTrip : t
      ),
    })),

  deleteTrip: (id) =>
    set((state) => ({
      trips: state.trips.filter((t: any) => String(t?._id) !== String(id)),
    })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  clearTrips: () =>
    set({
      trips: [],
      currentTrip: null,
      stats: null,
      loading: false,
      error: null,
    }),

  // ---------- DATCIE ----------
  datcieBody: null,
  datciePrediction: null,
  datcieOptimization: null,

  lastSavedTrip: null,
  lastSavedTripId: null,

  lastLearningResult: null,

  setDatcieBody: (body) => set({ datcieBody: body }),
  setDatciePrediction: (res) => set({ datciePrediction: res }),
  setDatcieOptimization: (res) => set({ datcieOptimization: res }),

  setLastSavedTrip: (trip) => set({ lastSavedTrip: trip }),
  setLastSavedTripId: (id) => set({ lastSavedTripId: id }),

  setLastLearningResult: (res) => set({ lastLearningResult: res }),

  clearDatcie: () =>
    set({
      datcieBody: null,
      datciePrediction: null,
      datcieOptimization: null,
      lastSavedTrip: null,
      lastSavedTripId: null,
      lastLearningResult: null,
    }),
}));

export default useTripStore;