import { create } from "zustand";
import type {
  FishMarketEntry,
  FishMarketFilters,
  CreateFishMarketPayload,
  UpdateFishMarketPayload,
} from "@/lib/fishMarketApi";
import {
  getFishMarketEntries,
  getFishMarketDates,
  createFishMarketEntry,
  updateFishMarketEntry,
  deleteFishMarketEntry,
} from "@/lib/fishMarketApi";

type FishMarketState = {
  entries: FishMarketEntry[];
  availableDates: string[];
  isLoading: boolean;
  datesLoading: boolean;
  error: string | null;

  fetchEntries: (filters?: FishMarketFilters) => Promise<void>;
  fetchDates: () => Promise<void>;
  addEntry: (payload: CreateFishMarketPayload) => Promise<FishMarketEntry>;
  editEntry: (
    id: string,
    payload: UpdateFishMarketPayload,
  ) => Promise<FishMarketEntry>;
  removeEntry: (id: string) => Promise<void>;
};

export const useFishMarketStore = create<FishMarketState>((set) => ({
  entries: [],
  availableDates: [],
  isLoading: false,
  datesLoading: false,
  error: null,

  fetchEntries: async (filters?) => {
    set({ isLoading: true, error: null });
    try {
      const entries = await getFishMarketEntries(filters);
      set({ entries: Array.isArray(entries) ? entries : [] });
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to load market entries" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDates: async () => {
    set({ datesLoading: true });
    try {
      const dates = await getFishMarketDates();
      set({ availableDates: Array.isArray(dates) ? dates : [] });
    } catch {
      // silently ignore — sidebar dates are non-critical
    } finally {
      set({ datesLoading: false });
    }
  },

  addEntry: async (payload) => {
    const created = await createFishMarketEntry(payload);
    set((s) => ({ entries: [created, ...s.entries] }));
    return created;
  },

  editEntry: async (id, payload) => {
    const updated = await updateFishMarketEntry(id, payload);
    set((s) => ({
      entries: s.entries.map((e) => (e._id === id ? updated : e)),
    }));
    return updated;
  },

  removeEntry: async (id) => {
    await deleteFishMarketEntry(id);
    set((s) => ({ entries: s.entries.filter((e) => e._id !== id) }));
  },
}));
