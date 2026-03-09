import { create } from "zustand";
import { apiFetch } from "@/utils/api";

interface NotificationStore {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  fetchUnreadCount: () => Promise<void>;
}

const useNotificationStore = create<NotificationStore>((set, get) => ({
  unreadCount: 0,
  
  setUnreadCount: (count: number) => {
    set({ unreadCount: count });
  },
  
  decrementUnreadCount: () => {
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) }));
  },
  
  resetUnreadCount: () => {
    set({ unreadCount: 0 });
  },
  
  fetchUnreadCount: async () => {
    try {
      console.log("🔍 [Store] Fetching unread notification count...");
      const response = await apiFetch("/api/v1/notifications/unread-count");
      
      if (response.ok) {
        const data = await response.json();
        console.log("📊 [Store] Unread count API response:", data);
        
        // Handle different response formats
        let count = 0;
        if (typeof data === 'number') {
          count = data;
        } else if (data && typeof data.count === 'number') {
          count = data.count;
        } else if (data && typeof data.unreadCount === 'number') {
          count = data.unreadCount;
        } else if (data && typeof data.total === 'number') {
          count = data.total;
        } else if (data && data.data && typeof data.data.count === 'number') {
          count = data.data.count;
        } else {
          console.warn("⚠️ [Store] Unexpected unread count format:", data);
        }
        
        set({ unreadCount: count });
      } else {
        console.warn("⚠️ [Store] Failed to fetch unread count:", response.status);
      }
    } catch (error) {
      console.error('❌ [Store] Error fetching unread count:', error);
    }
  },
}));

export default useNotificationStore;
