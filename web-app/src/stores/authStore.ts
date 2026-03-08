import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthUser } from "@/lib/authApi";

type AuthState = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clear: () => set({ user: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
