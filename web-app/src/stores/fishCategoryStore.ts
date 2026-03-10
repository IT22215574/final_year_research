import { create } from "zustand";
import type { FishCategory } from "@/lib/fishCategoryApi";
import {
  getFishCategories,
  createFishCategory,
  updateFishCategory,
  deleteFishCategory,
} from "@/lib/fishCategoryApi";

type FishCategoryState = {
  categories: FishCategory[];
  isLoading: boolean;
  error: string | null;
  fetchCategories: (search?: string) => Promise<void>;
  addCategory: (name: string) => Promise<FishCategory>;
  editCategory: (id: string, name: string) => Promise<FishCategory>;
  removeCategory: (id: string) => Promise<void>;
};

export const useFishCategoryStore = create<FishCategoryState>((set) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async (search?: string) => {
    set({ isLoading: true, error: null });
    try {
      const categories = await getFishCategories(search);
      set({ categories: Array.isArray(categories) ? categories : [] });
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to load fish categories" });
    } finally {
      set({ isLoading: false });
    }
  },

  addCategory: async (name: string) => {
    const created = await createFishCategory(name);
    set((s) => ({ categories: [...s.categories, created] }));
    return created;
  },

  editCategory: async (id: string, name: string) => {
    const updated = await updateFishCategory(id, name);
    set((s) => ({
      categories: s.categories.map((c) => (c._id === id ? updated : c)),
    }));
    return updated;
  },

  removeCategory: async (id: string) => {
    await deleteFishCategory(id);
    set((s) => ({
      categories: s.categories.filter((c) => c._id !== id),
    }));
  },
}));
