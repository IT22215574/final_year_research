import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import useAuthStore from "@/stores/authStore";

export default function FishermanProfile() {
  const { currentUser, signOut } = useAuthStore();

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const menuItems = [
    {
      icon: "person-outline",
      title: "Edit Profile",
      subtitle: "Update your personal information",
      onPress: () => router.push("/(root)/(screens)/update_profile"),
    },
    {
      icon: "boat-outline",
      title: "My Boats",
      subtitle: "Manage your fishing boats",
      onPress: () => {},
    },
    {
      icon: "notifications-outline",
      title: "Notifications",
      subtitle: "Manage notification preferences",
      onPress: () => {},
    },
    {
      icon: "shield-checkmark-outline",
      title: "Privacy & Security",
      subtitle: "Manage your account security",
      onPress: () => {},
    },
    {
      icon: "help-circle-outline",
      title: "Help & Support",
      subtitle: "Get help or contact support",
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <LinearGradient
          colors={["#3b82f6", "#2563eb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.profileImageContainer}>
            {currentUser?.profilePicture ? (
              <Image
                source={{ uri: currentUser.profilePicture }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="person" size={50} color="#3b82f6" />
              </View>
            )}
            <TouchableOpacity style={styles.editImageButton}>
              <Ionicons name="camera" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>
            {currentUser?.firstName} {currentUser?.lastName}
          </Text>
          <Text style={styles.profileRole}>{currentUser?.role}</Text>
          <Text style={styles.profileEmail}>{currentUser?.email}</Text>

          <TouchableOpacity style={styles.editProfileButton}>
            <Ionicons name="create-outline" size={18} color="#3b82f6" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="boat" size={28} color="#3b82f6" />
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={28} color="#f59e0b" />
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={28} color="#10b981" />
            <Text style={styles.statValue}>2 yrs</Text>
            <Text style={styles.statLabel}>Experience</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon as any} size={24} color="#3b82f6" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Fishing App v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2026 All Rights Reserved</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#ffffff",
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  editImageButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#3b82f6",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: "#dbeafe",
    marginBottom: 4,
    fontWeight: "600",
  },
  profileEmail: {
    fontSize: 13,
    color: "#dbeafe",
    marginBottom: 16,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  menuSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ef4444",
  },
  appInfo: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  appInfoText: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 4,
  },
});
