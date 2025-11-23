import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
      set({ isSignedIn: true, currentUser: user });
      
      // ✅ Only store user data, not tokens
      await AsyncStorage.setItem("user", JSON.stringify(user));
      
      console.log("✅ User signed in successfully:", user.email);
    } catch (error) {
      console.error("Sign-in error:", error);
      throw error;
    }
  },

  signOut: async () => {
    try {
      // ✅ Call backend logout endpoint to clear cookies
      const API = process.env.EXPO_PUBLIC_API_KEY;
      await fetch(`${API}/api/v1/auth/logout`, {
        method: "POST",
        credentials: 'include', // Important for cookies
      });
      
      set({ isSignedIn: false, currentUser: null });
      await AsyncStorage.removeItem("user");
      
      console.log("✅ User signed out successfully");
    } catch (error) {
      console.error("Sign-out error:", error);
      // Still clear local state even if backend call fails
      set({ isSignedIn: false, currentUser: null });
      await AsyncStorage.removeItem("user");
    }
  },

  checkAuthStatus: async () => {
    try {
      const userJson = await AsyncStorage.getItem("user");
      const user = userJson ? JSON.parse(userJson) : null;

      if (user) {
        // ✅ Verify with backend that the session is still valid
        const API = process.env.EXPO_PUBLIC_API_KEY;
        const response = await fetch(`${API}/api/v1/auth/profile`, {
          credentials: 'include', // Important for cookies
        });
        
        if (response.ok) {
          set({ isSignedIn: true, currentUser: user });
        } else {
          // Session expired or invalid
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
          ? { ...state.currentUser, ...updates }
          : { ...updates } as User,
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