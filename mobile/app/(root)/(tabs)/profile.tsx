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

  /* -------------------- UI -------------------- */

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3D91" />
        {/* HEADER */}
        <LinearGradient
          colors={["#0B3D91", "#1E90FF"]}
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
          <ActionCard
            title="Edit Profile"
            icon="create-outline"
            color={["#10B981", "#34D399"]}
            onPress={() => router.push("/update_profile")}
          />
          <ActionCard
            title="Documents"
            icon="document-text"
            color={["#3B82F6", "#60A5FA"]}
            onPress={() => router.push("/documents")}
          />
          <ActionCard
            title="Support"
            icon="help-circle"
            color={["#8B5CF6", "#A78BFA"]}
            onPress={() => router.push("/support")}
          />
        </View>

        {/* COMMON INFO */}
        <Section title="Personal Information">
          <Info label="Email" value={currentUser.email} />
          <Info label="Phone" value={currentUser.phone || "Not set"} />
          <Info label="Joined" value={formatDate(currentUser.createdAt)} />
        </Section>

        {/* FISHER MAN */}
        {role === "fisherman" && (
          <Section title="Fishing Details">
            <Info label="Experience" value={`${currentUser.experience || 0} years`} />
            <Info label="License" value={currentUser.licenseNumber || "N/A"} />
          </Section>
        )}

        {/* BOAT OWNER */}
        {role === "boatowner" && (
          <Section title="Vessel Details">
            <Info label="Vessel Name" value={currentUser.vesselName || "N/A"} />
            <Info
              label="Area"
              value={`${currentUser.zone || ""} ${currentUser.district?.name || ""}`}
            />
          </Section>
        )}

        {/* CUSTOMER */}
        {role === "customer" && (
          <Section title="Customer Info">
            <Info label="District" value={currentUser.district?.name || "N/A"} />
          </Section>
        )}

        {/* ACTIONS */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/change-password")}
          >
            <Text style={styles.primaryText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Sign Out</Text>
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
