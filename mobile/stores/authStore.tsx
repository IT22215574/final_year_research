import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

interface User {
  id: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  username?: string;
  isAdmin?: boolean;
  verifytoken?: string;
  profilePicture?: string;
  joinDate?: Date;
}

interface AuthState {
  isSignedIn: boolean;
  currentUser: User | null;
  signIn: (user: User) => Promise<void>; // ✅ Remove token parameter
  signOut: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  userupdate: (user: Partial<User>) => Promise<void>;
}

const normalizeRole = (role?: string) =>
  role?.toLowerCase().replace(/\s+/g, " ").trim() || "";

const isAdminRole = (role?: string) => normalizeRole(role).includes("admin");

const normalizeUser = (user: User): User => ({
  ...user,
  role: user.role?.trim() || "",
  isAdmin: user.isAdmin || isAdminRole(user.role),
});

const useAuthStore = create<AuthState>((set) => ({
  isSignedIn: false,
  currentUser: null,

  signIn: async (user: User) => {
    try {
      if (!user) {
        throw new Error("Invalid user data");
      }

      // ✅ Updated validation for new structure
      if (!user.id || !user.email) {
        throw new Error("Invalid user data structure");
      }

      // ✅ For cookie-based auth, we only store user data
      // Tokens are handled automatically via HTTP-only cookies
      const normalizedUser = normalizeUser(user);

      set({ isSignedIn: true, currentUser: normalizedUser });

      // ✅ Only store user data, not tokens
      await AsyncStorage.setItem("user", JSON.stringify(normalizedUser));

      console.log("✅ User signed in successfully:", normalizedUser.email);
    } catch (error) {
      console.error("Sign-in error:", error);
      throw error;
    }
  },

  signOut: async () => {
    try {
      // ✅ Call backend signout endpoint (clears cookie sessions for web)
      // ✅ Mobile also clears local tokens below
      const API = process.env.EXPO_PUBLIC_API_KEY;
      await fetch(`${API}/api/v1/auth/signout`, {
        method: "POST",
        credentials: "include", // Important for cookies
      });

      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");

      set({ isSignedIn: false, currentUser: null });
      await AsyncStorage.removeItem("user");

      console.log("✅ User signed out successfully");
    } catch (error) {
      console.error("Sign-out error:", error);
      // Still clear local state even if backend call fails
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");
      set({ isSignedIn: false, currentUser: null });
      await AsyncStorage.removeItem("user");
    }
  },

  checkAuthStatus: async () => {
    try {
      const userJson = await AsyncStorage.getItem("user");
      const user = userJson ? normalizeUser(JSON.parse(userJson)) : null;

      if (user) {
        // ✅ Verify with backend that the session is still valid
        const API = process.env.EXPO_PUBLIC_API_KEY;
        const accessToken = await SecureStore.getItemAsync("access_token");
        const response = await fetch(`${API}/api/v1/users/profile`, {
          method: "GET",
          credentials: "include",
          headers: {
            "x-client-type": "mobile",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });

        if (response.ok) {
          set({ isSignedIn: true, currentUser: user });
          await AsyncStorage.setItem("user", JSON.stringify(user));
        } else {
          // Session expired or invalid
          await SecureStore.deleteItemAsync("access_token");
          await SecureStore.deleteItemAsync("refresh_token");
          set({ isSignedIn: false, currentUser: null });
          await AsyncStorage.removeItem("user");
        }
      } else {
        set({ isSignedIn: false, currentUser: null });
      }
    } catch (error) {
      console.error("Check auth status error:", error);
      set({ isSignedIn: false, currentUser: null });
    }
  },

  userupdate: async (updates: Partial<User>) => {
    try {
      set((state) => ({
        currentUser: state.currentUser
          ? normalizeUser({ ...state.currentUser, ...updates } as User)
          : ({ ...updates } as User),
      }));

      const currentUser = useAuthStore.getState().currentUser;
      if (currentUser) {
        await AsyncStorage.setItem("user", JSON.stringify(currentUser));
      }
    } catch (error) {
      console.error("User update error:", error);
    }
  },
}));

export default useAuthStore;
