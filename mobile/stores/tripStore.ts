import { create } from "zustand";
import { apiFetch } from "@/utils/api";
import { Trip, TripStats } from "@/types/type";

interface TripState {
  // State
  trips: Trip[];
  currentTrip: Trip | null;
  stats: TripStats | null;
  loading: boolean;
  error: string | null;
  
   // Actions
  setTrips: (trips: Trip[]) => void;
  setCurrentTrip: (trip: Trip | null) => void;
  setStats: (stats: TripStats | null) => void;
  addTrip: (trip: Trip) => void;
  updateTrip: (id: string, trip: Trip) => void;
  deleteTrip: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearTrips: () => void;
}
const useTripStore = create<TripState>((set) => ({
  // Initial state
  trips: [],
  currentTrip: null,
  stats: null,
  loading: false,
  error: null,
  
  // Actions
  setTrips: (trips) => set({ trips }),
  setCurrentTrip: (trip) => set({ currentTrip: trip }),
  setStats: (stats) => set({ stats }),
  addTrip: (trip) => set((state) => ({ 
    trips: [trip, ...state.trips] 
  })),
  updateTrip: (id, updatedTrip) => set((state) => ({
    trips: state.trips.map(t => t._id === id ? updatedTrip : t)
  })),
  deleteTrip: (id) => set((state) => ({
    trips: state.trips.filter(t => t._id !== id)
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearTrips: () => set({ trips: [], currentTrip: null, stats: null }),
}));

export default useTripStore;