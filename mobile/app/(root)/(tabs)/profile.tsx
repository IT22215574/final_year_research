// Profile.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import useAuthStore from "@/stores/authStore";
import { apiFetch } from "@/utils/api";
import { HEADER_GRADIENT } from "@/constants";

const { width } = Dimensions.get("window");

/* -------------------- HELPERS -------------------- */

const normalizeRole = (role?: string) =>
  role?.toLowerCase().replace(/\s+/g, "") || "";

const getRoleIcon = (role: string) => {
  const r = normalizeRole(role);
  if (r === "fisherman") return "fish";
  if (r === "boatowner") return "boat";
  return "person";
};

const getRoleColor = (role: string) => {
  const r = normalizeRole(role);
  if (r === "fisherman") return "#10B981";
  if (r === "boatowner") return "#3B82F6";
  return "#8B5CF6";
};

const formatDate = (date: any) => {
  if (!date) return "Not set";
  const d = new Date(date);
  return isNaN(d.getTime())
    ? "Invalid"
    : d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
};

/* -------------------- COMPONENT -------------------- */

export default function Profile() {
  const { currentUser, signOut, userupdate } = useAuthStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  /* -------------------- FETCH PROFILE -------------------- */

  const fetchProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        router.replace("/(auth)/sign-in");
        return;
      }

      const res = await apiFetch("/api/v1/users/profile", { method: "GET" });

      if (res.status === 401) {
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        router.replace("/(auth)/sign-in");
        return;
      }

      const json = await res.json();
      if (json?.success) {
        userupdate(json.data);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  /* -------------------- USER DATA -------------------- */

  if (!currentUser) return null;

  const role = normalizeRole(currentUser.role);

  /* -------------------- LOGOUT -------------------- */

  const logout = async () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("access_token");
          await SecureStore.deleteItemAsync("refresh_token");
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime())
        ? "Invalid date"
        : date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
    } catch {
      return "Invalid date";
    }
  };

  // Get user data with proper field mapping
  const getUserData = () => {
    if (!currentUser) return null;

    return {
      firstName: currentUser.firstName || "Not set",
      lastName: currentUser.lastName || "Not set",
      email: currentUser.email || "Not set",
      phone: currentUser.phone || "Not set",
      role: currentUser.role || "Not set",
      dateOfBirth: currentUser.dateOfBirth || null,
      joinDate: currentUser.createdAt || currentUser.joinDate || new Date(),
      district:
        (typeof currentUser.district === "string"
          ? currentUser.district
          : currentUser.district?.name) || "Not set",
      zone: currentUser.zone ? currentUser.zone : "Not set",
      // Additional fish industry specific fields
      specialization: currentUser.specialization || "Fishery Professional",
      experience: currentUser.experience || "0",
      licenseNumber: currentUser.licenseNumber || "N/A",
      vesselName: currentUser.vesselName || "N/A",
    };
  };

  const userData = getUserData();

  // Fish industry role icons mapping
  const getRoleIcon = (role: string) => {
    const roleLower = role?.toLowerCase() || "";
    if (roleLower.includes("captain") || roleLower.includes("master")) {
      return "boat";
    } else if (roleLower.includes("fisher")) {
      return "fish";
    } else if (roleLower.includes("processor")) {
      return "cut";
    } else if (roleLower.includes("inspector")) {
      return "clipboard";
    } else if (roleLower.includes("manager")) {
      return "business";
    } else if (roleLower.includes("technician")) {
      return "build";
    }
    return "person";
  };

  const getRoleColor = (role: string) => {
    const roleLower = role?.toLowerCase() || "";
    if (roleLower.includes("captain") || roleLower.includes("master")) {
      return "#3B82F6"; // Blue
    } else if (roleLower.includes("fisher")) {
      return "#10B981"; // Green
    } else if (roleLower.includes("processor")) {
      return "#F59E0B"; // Amber
    } else if (roleLower.includes("inspector")) {
      return "#8B5CF6"; // Violet
    } else if (roleLower.includes("manager")) {
      return "#EF4444"; // Red
    } else if (roleLower.includes("technician")) {
      return "#06B6D4"; // Cyan
    }
    return "#64748B"; // Slate
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container} edges={["right", "left"]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#0B3D91"
          translucent={false}
        />
        <View style={styles.systemStatusBar} />
        <LinearGradient
          colors={["#0B3D91", "#1E90FF", "#00BFFF"]}
          style={styles.gradientBg}
        >

          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="fish-outline" size={60} color="#FFF" />
            </View>
            <Text style={styles.errorTitle}>No Profile Found</Text>
            <Text style={styles.errorText}>
              Unable to load your fishery profile
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchUserProfile}
            >
              <Ionicons name="refresh" size={20} color="#FFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.replace("/home")}
            >
              <Text style={styles.homeButtonText}>Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_GRADIENT[0]} />
        {/* HEADER */}
        <LinearGradient
          colors={HEADER_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.avatar}>
            <Ionicons
              name={getRoleIcon(currentUser.role)}
              size={40}
              color="#0B3D91"
            />
          </View>

          <Text style={styles.name}>
            {currentUser.firstName} {currentUser.lastName}
          </Text>

          <View
            style={[
              styles.roleBadge,
              { backgroundColor: getRoleColor(currentUser.role) },
            ]}
          >
            <Ionicons
              name={getRoleIcon(currentUser.role)}
              size={14}
              color="#FFF"
            />
            <Text style={styles.roleText}>{currentUser.role}</Text>
          </View>
        </LinearGradient>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >


        {/* QUICK ACTIONS */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/update_profile")}
          >
            <LinearGradient
              colors={["#10B981", "#34D399"]}
              style={styles.actionIconContainer}
            >
              <Ionicons name="create-outline" size={24} color="#FFF" />
            </LinearGradient>
            <Text style={styles.actionTitle}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/documents" as any)}
          >
            <LinearGradient
              colors={["#3B82F6", "#60A5FA"]}
              style={styles.actionIconContainer}
            >
              <Ionicons name="document-text" size={24} color="#FFF" />
            </LinearGradient>
            <Text style={styles.actionTitle}>Documents</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/certifications" as any)}
          >
            <LinearGradient
              colors={["#F59E0B", "#FBBF24"]}
              style={styles.actionIconContainer}
            >
              <Ionicons name="ribbon" size={24} color="#FFF" />
            </LinearGradient>
            <Text style={styles.actionTitle}>Certifications</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <View style={styles.detailsGrid}>
            {/* Personal Info Card */}
            <LinearGradient
              colors={["#FFF", "#F0F9FF"]}
              style={styles.detailCard}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="person-circle" size={20} color="#0B3D91" />
                <Text style={styles.cardTitle}>Personal Details</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="mail-outline" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{userData?.email}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="call-outline" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Contact</Text>
                <Text style={styles.detailValue}>{userData?.phone}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Date of Birth</Text>
                <Text style={styles.detailValue}>
                  {userData?.dateOfBirth ? formatDate(userData.dateOfBirth) : "Not set"}
                </Text>
              </View>
            </LinearGradient>

            {/* Fishery Info Card */}
            <LinearGradient
              colors={["#FFF", "#F0FDF4"]}
              style={styles.detailCard}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="boat" size={20} color="#10B981" />
                <Text style={styles.cardTitle}>Fishery Details</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="location" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Zone & District</Text>
                <Text style={styles.detailValue}>
                  {userData?.zone && userData.zone !== "Not set"
                    ? `${userData.zone}, ${userData.district}`
                    : "Not set"}
                </Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="boat-outline" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Vessel</Text>
                <Text style={styles.detailValue}>{userData?.vesselName}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="shield-checkmark" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>License No.</Text>
                <Text style={styles.detailValue}>{userData?.licenseNumber}</Text>
              </View>
            </LinearGradient>

            {/* Experience Card */}
            <LinearGradient
              colors={["#FFF", "#FFFBEB"]}
              style={styles.detailCard}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="trending-up" size={20} color="#F59E0B" />
                <Text style={styles.cardTitle}>Experience</Text>
              </View>
              
              <View style={styles.experienceContainer}>
                <View style={styles.experienceYears}>
                  <Text style={styles.yearsNumber}>{userData?.experience}</Text>
                  <Text style={styles.yearsLabel}>Years in Industry</Text>
                </View>
                <View style={styles.experienceBar}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${Math.min(Number(userData?.experience) * 10, 100)}%`,
                        backgroundColor: getRoleColor(userData?.role || "")
                      }
                    ]} 
                  />
                </View>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="people" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Member Since</Text>
                <Text style={styles.detailValue}>
                  {formatDate(userData?.joinDate ?? new Date())}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => router.push("/change-password" as any)}
          >
            <Text style={styles.primaryText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.supportButton]}
            onPress={() => router.push("/support" as any)}
          >
            <Ionicons name="help-circle" size={20} color="#0B3D91" />
            <Text style={styles.supportButtonText}>Support Center</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------- SMALL COMPONENTS -------------------- */

const ActionCard = ({ title, icon, color, onPress }: any) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress}>
    <LinearGradient colors={color} style={styles.actionIcon}>
      <Ionicons name={icon} size={22} color="#FFF" />
    </LinearGradient>
    <Text style={styles.actionText}>{title}</Text>
  </TouchableOpacity>
);

const Section = ({ title, children }: any) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Info = ({ label, value }: any) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  container: { flex: 1,marginTop:-45, backgroundColor: "#F8FAFC" },

  header: {
    alignItems: "center",
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 45,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  name: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },

  roleBadge: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },

  roleText: { color: "#FFF", fontWeight: "600" },

  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    paddingHorizontal: 16,
  },

  actionCard: { alignItems: "center", width: width / 4 },

  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  actionText: { fontSize: 12, fontWeight: "600" },

  section: {
    backgroundColor: "#FFF",
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  infoLabel: { color: "#64748B" },
  infoValue: { fontWeight: "600" },

  actions: { padding: 16, gap: 12 },

  primaryBtn: {
    backgroundColor: "#0B3D91",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  primaryText: { color: "#FFF", fontWeight: "600" },

  logoutBtn: {
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  logoutText: { color: "#EF4444", fontWeight: "600" },
});
