import { create } from "zustand";
import type {
  Boat,
  BoatPayload,
  BoatLearningInsightsResponse,
  BoatPredictionHistoryResponse,
} from "@/lib/boatApi";
import {
  getMyBoats,
  getBoatById,
  getBoatTypes,
  createBoat,
  updateBoat,
  deleteBoat,
  getBoatLearningInsights,
  getBoatPredictionHistory,
} from "@/lib/boatApi";

type BoatState = {
  boats: Boat[];
  selectedBoat: Boat | null;
  boatTypes: string[];
  learningInsights: BoatLearningInsightsResponse | null;
  predictionHistory: BoatPredictionHistoryResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchBoats: () => Promise<void>;
  fetchBoatById: (id: string) => Promise<Boat>;
  fetchBoatTypes: () => Promise<void>;
  addBoat: (data: BoatPayload) => Promise<Boat>;
  editBoat: (id: string, data: Partial<BoatPayload>) => Promise<Boat>;
  removeBoat: (id: string) => Promise<void>;
  fetchLearningInsights: (id: string) => Promise<BoatLearningInsightsResponse>;
  fetchPredictionHistory: (id: string) => Promise<BoatPredictionHistoryResponse>;
  clearSelectedBoat: () => void;
  clearBoatExtras: () => void;
};

export const useBoatStore = create<BoatState>((set) => ({
  boats: [],
  selectedBoat: null,
  boatTypes: [],
  learningInsights: null,
  predictionHistory: null,
  isLoading: false,
  error: null,

  fetchBoats: async () => {
    set({ isLoading: true, error: null });
    try {
      const boats = await getMyBoats();
      set({ boats: Array.isArray(boats) ? boats : [] });
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to load boats" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBoatById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const boat = await getBoatById(id);
      set({ selectedBoat: boat });
      return boat;
    } catch (e: any) {
      const message = e?.message ?? "Failed to load boat";
      set({ error: message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBoatTypes: async () => {
    set({ isLoading: true, error: null });
    try {
      const boatTypes = await getBoatTypes();
      set({ boatTypes: Array.isArray(boatTypes) ? boatTypes : [] });
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to load boat types" });
    } finally {
      set({ isLoading: false });
    }
  },

  addBoat: async (data: BoatPayload) => {
    const created = await createBoat(data);
    set((s) => ({ boats: [created, ...s.boats] }));
    return created;
  },

  editBoat: async (id: string, data: Partial<BoatPayload>) => {
    const updated = await updateBoat(id, data);
    set((s) => ({
      boats: s.boats.map((b) => (b._id === id ? updated : b)),
      selectedBoat: s.selectedBoat?._id === id ? updated : s.selectedBoat,
    }));
    return updated;
  },

  removeBoat: async (id: string) => {
    await deleteBoat(id);
    set((s) => ({
      boats: s.boats.filter((b) => b._id !== id),
      selectedBoat: s.selectedBoat?._id === id ? null : s.selectedBoat,
    }));
  },

  fetchLearningInsights: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const learningInsights = await getBoatLearningInsights(id);
      set({ learningInsights });
      return learningInsights;
    } catch (e: any) {
      const message = e?.message ?? "Failed to load learning insights";
      set({ error: message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPredictionHistory: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const predictionHistory = await getBoatPredictionHistory(id);
      set({ predictionHistory });
      return predictionHistory;
    } catch (e: any) {
      const message = e?.message ?? "Failed to load prediction history";
      set({ error: message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  clearSelectedBoat: () => {
    set({ selectedBoat: null });
  },

  clearBoatExtras: () => {
    set({
      learningInsights: null,
      predictionHistory: null,
    });
  },
}));