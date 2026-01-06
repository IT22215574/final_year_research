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
import MapView, { Polygon, PROVIDER_GOOGLE } from "react-native-maps";
import { generateSriLankaDemoZones, type FishZoneInputs } from "@/utils/fishZoneDemo";

const Home = () => {
  const { currentUser, signOut } = useAuthStore();
  const router = useRouter();

  const [inputs, setInputs] = useState<FishZoneInputs>({
    sstC: 28.2,
    chlorophyllMgM3: 0.65,
    currentSpeedMS: 0.9,
    currentDirectionDeg: 210,
  });

  const [selectedCoord, setSelectedCoord] = useState<{ latitude: number; longitude: number } | null>(null);

  const zones = useMemo(
    () => generateSriLankaDemoZones(inputs, { cellSizeKm: 4, maxCells: 12000 }),
    [inputs],
  );

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
      <View style={styles.header}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.userName}>
            {currentUser?.firstName + " " + currentUser?.lastName || "Randy Wigham"}
          </Text>
        </View>

        {/* Search Bar on Blue Background */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ....."
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Access Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickAccessContainer}>
            <TouchableOpacity style={styles.quickAccessItem}>
              <View style={styles.quickAccessCard}>
                <View style={styles.quickAccessIconContainer}>
                  <Image
                    source={icons.home_book}
                    style={styles.quickAccessIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAccessItem}>
              <View style={styles.quickAccessCard}>
                <View style={styles.quickAccessIconContainer}>
                  <Image
                    source={icons.home_publication}
                    style={styles.quickAccessIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Fish Zone Demo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fish Zone Demo (Dummy)</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Inputs</Text>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>SST (°C)</Text>
              <TextInput
                style={styles.inputBox}
                keyboardType="numeric"
                value={String(inputs.sstC)}
                onChangeText={(t) =>
                  setInputs((prev) => ({
                    ...prev,
                    sstC: Number(t.replace(/[^0-9.\-]/g, "")) || 0,
                  }))
                }
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Chlorophyll (mg/m³)</Text>
              <TextInput
                style={styles.inputBox}
                keyboardType="numeric"
                value={String(inputs.chlorophyllMgM3)}
                onChangeText={(t) =>
                  setInputs((prev) => ({
                    ...prev,
                    chlorophyllMgM3: Number(t.replace(/[^0-9.\-]/g, "")) || 0,
                  }))
                }
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Current Speed (m/s)</Text>
              <TextInput
                style={styles.inputBox}
                keyboardType="numeric"
                value={String(inputs.currentSpeedMS)}
                onChangeText={(t) =>
                  setInputs((prev) => ({
                    ...prev,
                    currentSpeedMS: Number(t.replace(/[^0-9.\-]/g, "")) || 0,
                  }))
                }
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Current Direction (°)</Text>
              <TextInput
                style={styles.inputBox}
                keyboardType="numeric"
                value={String(inputs.currentDirectionDeg)}
                onChangeText={(t) =>
                  setInputs((prev) => ({
                    ...prev,
                    currentDirectionDeg: Number(t.replace(/[^0-9.\-]/g, "")) || 0,
                  }))
                }
              />
            </View>
          </View>

          <View style={[styles.card, { marginTop: 14 }]}>
            <Text style={styles.cardTitle}>Predicted Zones</Text>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "rgba(34,197,94,0.35)" }]} />
              <Text style={styles.legendText}>High</Text>
              <View style={[styles.legendDot, { backgroundColor: "rgba(250,204,21,0.35)" }]} />
              <Text style={styles.legendText}>Medium</Text>
              <View style={[styles.legendDot, { backgroundColor: "rgba(239,68,68,0.35)" }]} />
              <Text style={styles.legendText}>Low</Text>
            </View>

            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: 7.8731,
                  longitude: 80.7718,
                  latitudeDelta: 6.2,
                  longitudeDelta: 4.2,
                }}
                onPress={(e) => {
                  const c = e.nativeEvent.coordinate;
                  setSelectedCoord({ latitude: c.latitude, longitude: c.longitude });
                }}
              >
                {zones.map((z) => {
                  const fillColor =
                    z.level === "HIGH"
                      ? "rgba(34,197,94,0.35)"
                      : z.level === "MEDIUM"
                        ? "rgba(250,204,21,0.35)"
                        : "rgba(239,68,68,0.35)";

                  const strokeColor =
                    z.level === "HIGH"
                      ? "rgba(34,197,94,0.8)"
                      : z.level === "MEDIUM"
                        ? "rgba(250,204,21,0.8)"
                        : "rgba(239,68,68,0.8)";

                  return (
                    <Polygon
                      key={z.id}
                      coordinates={z.polygon}
                      fillColor={fillColor}
                      strokeColor={strokeColor}
                      strokeWidth={1}
                    />
                  );
                })}
              </MapView>
            </View>

            <View style={styles.coordRow}>
              <Text style={styles.coordText}>
                {selectedCoord
                  ? `Selected: ${selectedCoord.latitude.toFixed(5)}, ${selectedCoord.longitude.toFixed(5)}`
                  : "Tap on the map to see latitude & longitude"}
              </Text>
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
    backgroundColor: "#0057FF", // Blue color for system status bar area
  },
  header: {
    backgroundColor: "#0057FF", // Blue background
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
  },
  map: {
    flex: 1,
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
});

export default Home;