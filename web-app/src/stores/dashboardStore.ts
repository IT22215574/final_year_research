import { create } from "zustand";
import { apiFetch } from "@/lib/api";

type DashboardState = {
  users: any[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  users: [],
  isLoading: false,
  error: null,
  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log("[Dashboard] Fetching users from /users...");
      const users = await apiFetch<any[]>("/users");
      console.log("[Dashboard] Received users:", users);
      set({ users: Array.isArray(users) ? users : [] });
    } catch (e: any) {
      console.error("[Dashboard] Fetch error:", e);
      set({ error: e?.message ?? "Failed to load users" });
    } finally {
      set({ isLoading: false });
    }
  },
}));
