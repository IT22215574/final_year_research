import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { Ionicons, MaterialIcons, Entypo } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/utils/api";
import useNotificationStore from "@/stores/notificationStore";

// Define types matching your backend interface
interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  metadata?: any;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface NotificationsResponse {
  notifications: Notification[];
}

interface UnreadCountResponse {
  count: number;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use the shared notification store
  const { unreadCount, setUnreadCount, decrementUnreadCount, resetUnreadCount, fetchUnreadCount } = useNotificationStore();

  // Fetch all notifications with better error handling
  const fetchNotifications = async () => {
    try {
      console.log("🔍 Starting fetchNotifications...");
      setError(null);
      const response = await apiFetch("/api/v1/notifications");
      
      console.log("📡 Notifications response status:", response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please login to view notifications');
        } else {
          setError(`Failed to load notifications (${response.status})`);
        }
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const data = await response.json();
      console.log("📊 Notifications API response data:", data);
      console.log("📊 Type of data:", typeof data);
      console.log("📊 Data keys:", Object.keys(data));
      
      // Check if data has notifications property or if data itself is the array
      if (data && Array.isArray(data)) {
        // If API returns array directly
        setNotifications(data);
        console.log(`📱 Set ${data.length} notifications from array`);
      } else if (data && data.notifications && Array.isArray(data.notifications)) {
        // If API returns { notifications: [...] }
        setNotifications(data.notifications);
        console.log(`📱 Set ${data.notifications.length} notifications from notifications property`);
      } else if (data && data.data && Array.isArray(data.data)) {
        // If API returns { data: [...] }
        setNotifications(data.data);
        console.log(`📱 Set ${data.data.length} notifications from data property`);
      } else {
        console.warn("⚠️ Unexpected API response format:", data);
        setNotifications([]);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Format date to relative time
  const formatTimeAgo = (dateString: string | Date): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
      
      // For older dates, show actual date
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "Recently";
    }
  };

  // Get icon based on notification type
  const getIconForType = (type: string, title: string) => {
    // Check title first for specific cases
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("exam") || lowerTitle.includes("schedule") || lowerTitle.includes("math")) {
      return <Ionicons name="school" size={32} color="#0057FF" />;
    }
    if (lowerTitle.includes("assignment") || lowerTitle.includes("reminder")) {
      return <MaterialIcons name="warning" size={32} color="#FFC400" />;
    }
    if (lowerTitle.includes("course") || lowerTitle.includes("available")) {
      return <Entypo name="info-with-circle" size={32} color="#00C853" />;
    }

    // Fallback to type-based icons
    const upperType = type?.toUpperCase() || 'INFO';
    switch (upperType) {
      case "SUCCESS":
        return <Ionicons name="checkmark-circle" size={32} color="#00C853" />;
      case "WARNING":
        return <MaterialIcons name="warning" size={32} color="#FFC400" />;
      case "ERROR":
        return <Ionicons name="alert-circle" size={32} color="#FF3B30" />;
      case "INFO":
      default:
        return <Entypo name="info-with-circle" size={32} color="#0057FF" />;
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await apiFetch(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        );
        // Update unread count in the shared store
        decrementUnreadCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      Alert.alert("Error", "Failed to mark notification as read");
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const response = await apiFetch("/api/v1/notifications/mark-all-read", {
        method: 'PATCH',
      });

      if (response.ok) {
        // Update all notifications to read
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, isRead: true }))
        );
        // Reset unread count in the shared store
        resetUnreadCount();
        Alert.alert("Success", "All notifications marked as read");
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert("Error", "Failed to mark all notifications as read");
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId: string) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await apiFetch(`/api/v1/notifications/${notificationId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                // Check if notification was unread before removing
                const deletedNotification = notifications.find(n => n.id === notificationId);
                
                // Remove from local state
                setNotifications(prev =>
                  prev.filter(notification => notification.id !== notificationId)
                );
                
                // Update unread count in the shared store if notification was unread
                if (deletedNotification && !deletedNotification.isRead) {
                  decrementUnreadCount();
                }
              }
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert("Error", "Failed to delete notification");
            }
          }
        }
      ]
    );
  };

  // Handle pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      console.log("🎯 Notifications screen focused, loading data...");
      setLoading(true);
      fetchNotifications();
      fetchUnreadCount();
    }, [])
  );

  // Update unread count when notifications change
  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead).length;
    console.log(`📊 Local unread count: ${unread}`);
    if (unread !== unreadCount) {
      setUnreadCount(unread);
    }
  }, [notifications, unreadCount, setUnreadCount]);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0057FF" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchNotifications}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (!notifications || notifications.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="notifications-off-outline" size={64} color="#999" />
        <Text style={styles.emptyText}>No notifications yet</Text>
        <Text style={styles.emptySubtext}>
          You{"'"}ll see notifications here when you have new updates
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#0057FF" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log(`📱 Rendering ${notifications.length} notifications`);

  // Filter today's notifications
  const todayNotifications = notifications.filter(notification => {
    try {
      if (!notification || !notification.createdAt) return false;
      const notificationDate = new Date(notification.createdAt);
      const today = new Date();
      return notificationDate.toDateString() === today.toDateString();
    } catch (error) {
      return false;
    }
  });

  // Filter older notifications
  const olderNotifications = notifications.filter(notification => {
    try {
      if (!notification || !notification.createdAt) return false;
      const notificationDate = new Date(notification.createdAt);
      const today = new Date();
      return notificationDate.toDateString() !== today.toDateString();
    } catch (error) {
      return true; // Show as older if we can't parse date
    }
  });

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Mark All as Read button */}
      <View style={styles.header}>
        <View>
          <Text style={styles.mainTitle}>Latest Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadBadge}>
              {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Text style={styles.markAllButtonText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Timetable Banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerTitle}>Grade 10 Timetable</Text>
          <Text style={styles.bannerSubtitle}>View Your Weekly schedule</Text>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>View Schedule</Text>
          </TouchableOpacity>
        </View>
        <Ionicons name="calendar" size={40} color="#fff" style={{ marginTop: 10 }} />
      </View>

      {/* Page Indicators */}
      <View style={styles.dotsContainer}>
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      {/* Today's Notifications */}
      {todayNotifications.length > 0 && (
        <>
          <Text style={styles.dateText}>Today {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          
          {todayNotifications.map((notification) => (
            <TouchableOpacity 
              key={notification.id || Math.random().toString()}
              style={styles.card}
              onPress={() => handleMarkAsRead(notification.id)}
              onLongPress={() => handleDeleteNotification(notification.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardIcon}>
                {getIconForType(notification.type, notification.title || 'Notification')}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{notification.title || 'Notification'}</Text>
                <Text style={styles.cardMsg}>{notification.message || 'No message'}</Text>
                <Text style={styles.cardTime}>
                  {notification.createdAt ? formatTimeAgo(notification.createdAt) : 'Recently'}
                </Text>
              </View>

              {/* Unread dot */}
              {!notification.isRead && <View style={styles.redDot} />}
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Older Notifications */}
      {olderNotifications.length > 0 && (
        <>
          <Text style={[styles.dateText, { marginTop: 20 }]}>Older Notifications</Text>
          
          {olderNotifications.map((notification) => (
            <TouchableOpacity 
              key={notification.id || Math.random().toString()}
              style={styles.card}
              onPress={() => handleMarkAsRead(notification.id)}
              onLongPress={() => handleDeleteNotification(notification.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardIcon}>
                {getIconForType(notification.type, notification.title || 'Notification')}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{notification.title || 'Notification'}</Text>
                <Text style={styles.cardMsg}>{notification.message || 'No message'}</Text>
                <Text style={styles.cardTime}>
                  {notification.createdAt ? formatTimeAgo(notification.createdAt) : 'Recently'}
                </Text>
              </View>

              {/* Unread dot */}
              {!notification.isRead && <View style={styles.redDot} />}
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {notifications.length} total notification{notifications.length === 1 ? '' : 's'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    backgroundColor: "#fff",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    marginTop: 20,
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#0057FF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  emptySubtext: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    marginLeft: 8,
    color: "#0057FF",
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  unreadBadge: {
    fontSize: 14,
    color: "#FF3B30",
    fontWeight: "600",
    marginTop: 4,
  },
  markAllButton: {
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  markAllButtonText: {
    color: "#0057FF",
    fontSize: 14,
    fontWeight: "600",
  },
  /* Banner */
  banner: {
    backgroundColor: "#0057FF",
    padding: 20,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  bannerSubtitle: {
    fontSize: 14,
    color: "#E0E8FF",
    marginTop: 4,
  },
  button: {
    marginTop: 10,
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  buttonText: {
    color: "#0057FF",
    fontWeight: "600",
  },
  /* Dots */
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: "#D0D0D0",
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: "#0057FF",
  },
  /* Date Text */
  dateText: {
    fontSize: 15,
    color: "#555",
    marginBottom: 15,
    fontWeight: "600",
  },
  /* Cards */
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  cardMsg: {
    marginTop: 4,
    color: "#777",
    lineHeight: 20,
  },
  cardTime: {
    marginTop: 6,
    color: "#999",
    fontSize: 13,
  },
  redDot: {
    width: 10,
    height: 10,
    backgroundColor: "red",
    borderRadius: 5,
    marginLeft: 10,
    marginTop: 5,
  },
  /* Footer */
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#999",
  },
});

