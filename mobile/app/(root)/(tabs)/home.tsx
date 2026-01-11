import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useAuthStore from "@/stores/authStore";
import { icons } from "@/constants";
import { LinearGradient } from "expo-linear-gradient";

type ZoneLevel = "HIGH" | "MEDIUM" | "LOW";

const Home = () => {
  const { currentUser, signOut } = useAuthStore();
  const router = useRouter();

  // NOTE: This screen previously depended on `react-native-maps` + a demo util.
  // Those dependencies are not present in `mobile/package.json`, which can crash Metro
  // and prevent any UI from rendering. Keep this screen UI-only for now.
  const [zoneLevels] = useState<ZoneLevel[]>([
    "HIGH",
    "MEDIUM",
    "LOW",
    "MEDIUM",
    "HIGH",
  ]);

  const zoneCounts = useMemo(() => {
    return zoneLevels.reduce(
      (acc, level) => {
        acc[level] += 1;
        return acc;
      },
      { HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<ZoneLevel, number>
    );
  }, [zoneLevels]);

  const displayName = useMemo(() => {
    const name = [currentUser?.firstName, currentUser?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || "Randy Wigham";
  }, [currentUser?.firstName, currentUser?.lastName]);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/onBoard1");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      {/* Custom Status Bar */}
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0057FF"
        translucent={false}
      />

      {/* System Status Bar Area (for battery, signal, etc.) */}
      <View style={styles.systemStatusBar} />

      {/* Blue Header Area with Rounded Bottom */}
      <LinearGradient colors={["#0066CC", "#0088FF"]} style={styles.header}>
        <View>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.userName}>{displayName}</Text>
          </View>


          {/* Sign Out Button
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
           */}
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Fish Zone Demo (UI-only placeholder) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fish Zone Demo </Text>

          <View style={[styles.card, { marginTop: 14 }]}>
            <Text style={styles.cardTitle}>Predicted Zones</Text>
            <View style={styles.legendRow}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: "rgba(34,197,94,0.35)" },
                ]}
              />
              <Text style={styles.legendText}>High</Text>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: "rgba(250,204,21,0.35)" },
                ]}
              />
              <Text style={styles.legendText}>Medium</Text>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: "rgba(239,68,68,0.35)" },
                ]}
              />
              <Text style={styles.legendText}>Low</Text>
            </View>

            <View style={styles.mapContainer}>
              <View
                style={
                  [
                    styles.map,
                    {
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 16,
                    },
                  ] as any
                }
              >
                <Text
                  style={{
                    color: "#0f172a",
                    fontWeight: "700",
                    marginBottom: 6,
                  }}
                >
                  Map preview unavailable
                </Text>
                <Text style={{ color: "#334155", textAlign: "center" }}>
                  This screen is UI-only right now because `react-native-maps`
                  isn’t installed.
                </Text>
                <View style={{ height: 12 }} />
                <Text style={{ color: "#334155", fontWeight: "600" }}>
                  High: {zoneCounts.HIGH} • Medium: {zoneCounts.MEDIUM} • Low:{" "}
                  {zoneCounts.LOW}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc", // Light background for entire screen
  },
  coordRow: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  coordText: {
    fontSize: 13,
    color: "#0f172a",
  },
  systemStatusBar: {
    height: StatusBar.currentHeight,
    backgroundColor: "#0066CC", // Blue color for system status bar area
  },
  header: {
    backgroundColor: "#0066CC", // Blue background
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  welcomeContainer: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: "#fff", // White text on blue background
    fontWeight: "500",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff", // White text on blue background
    marginTop: 4,
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1e293b",
  },
  signOutButton: {
    position: "absolute",
    top: 16,
    right: 20,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)", // Semi-transparent white
  },
  content: {
    flex: 1,
    backgroundColor: "#f8fafc", // Light background for content
  },
  scrollContent: {
    paddingBottom: 100, // Add padding to account for bottom navigation
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },
  quickAccessContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  quickAccessItem: {
    flex: 1,
  },
  quickAccessCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickAccessIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#005CFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickAccessIcon: {
    width: 30,
    height: 30,
    tintColor: "#fff",
  },
  quickAccessText: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "600",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 12,
  },
  inputLabel: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  inputBox: {
    width: 120,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    fontSize: 14,
  },
  mapContainer: {
    height: 260,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    position: "relative",
  },
  map: {
    flex: 1,
  },
  zoomOutButton: {
    position: "absolute",
    right: 16,
    top: 16,
    width: 48,
    height: 48,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
    marginRight: 10,
  },
  scheduleCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 4,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },
  scheduleDetails: {
    marginBottom: 12,
  },
  scheduleTime: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  scheduleText: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 8,
  },
  instructorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  instructorText: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 8,
  },
  joinButton: {
    backgroundColor: "#005CFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
});

export default Home;
