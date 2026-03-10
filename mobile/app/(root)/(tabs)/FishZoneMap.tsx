// mobile/app/(root)/(tabs)/FishZoneMap.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Backend API base URL from environment variables
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_URL must be defined in .env file");
}

interface FishZone {
  lat: number;
  lon: number;
  sst: number;
  chlor_a: number;
  water_u: number;
  water_v: number;
  fish_zone: number;
  fish_probability: number;
}

interface FishZoneResponse {
  data: FishZone[];
  metadata: {
    total: number;
    fishZones: number;
    highProbabilityZones: number;
    date: string;
  };
}

export default function FishZoneMapScreen() {
  const [fishZones, setFishZones] = useState<FishZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<FishZoneResponse["metadata"] | null>(
    null
  );
  const [selectedZone, setSelectedZone] = useState<FishZone | null>(null);
  const [minProbability, setMinProbability] = useState(0.3); // Show zones with >30% probability (better default)

  // Sri Lanka center for map
  const SRI_LANKA_CENTER = {
    latitude: 7.5,
    longitude: 80.5,
    latitudeDelta: 5,
    longitudeDelta: 5,
  };

  useEffect(() => {
    fetchFishZones();
  }, [minProbability]);

  const fetchFishZones = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/fish-zones/latest?minProbability=${minProbability}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch fish zones");
      }

      const data: FishZoneResponse = await response.json();
      setFishZones(data.data);
      setMetadata(data.metadata);
    } catch (error) {
      console.error("Error fetching fish zones:", error);
      Alert.alert(
        "Error",
        "Could not load fish zone predictions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (probability: number): string => {
    if (probability >= 0.8) return "#DC2626"; // red-600 - Very High
    if (probability >= 0.6) return "#EA580C"; // orange-600 - High
    if (probability >= 0.4) return "#F59E0B"; // amber-500 - Medium
    return "#10B981"; // green-500 - Low
  };

  const getCircleRadius = (probability: number): number => {
    // Radius in meters
    return 5000 + probability * 10000; // 5km to 15km based on probability
  };

  const getProbabilityLabel = (probability: number): string => {
    if (probability >= 0.8) return "Very High";
    if (probability >= 0.6) return "High";
    if (probability >= 0.4) return "Medium";
    return "Low";
  };

  const handleMarkerPress = (zone: FishZone) => {
    setSelectedZone(zone);
  };

  const handleFilterChange = (value: number) => {
    setMinProbability(value);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={styles.loadingText}>Loading Fish Zone Predictions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fish Zone Predictions</Text>
        <TouchableOpacity onPress={fetchFishZones} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#0EA5E9" />
        </TouchableOpacity>
      </View>

      {/* Metadata Bar */}
      {metadata && (
        <View style={styles.metadataBar}>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Date</Text>
            <Text style={styles.metadataValue}>{metadata.date}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Total Zones</Text>
            <Text style={styles.metadataValue}>{metadata.fishZones}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>High Probability</Text>
            <Text style={styles.metadataValue}>
              {metadata.highProbabilityZones}
            </Text>
          </View>
        </View>
      )}

      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={SRI_LANKA_CENTER}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton
      >
        {fishZones.map((zone, index) => (
          <React.Fragment key={`zone-${index}`}>
            {/* Circle showing fish zone area */}
            <Circle
              center={{
                latitude: zone.lat,
                longitude: zone.lon,
              }}
              radius={getCircleRadius(zone.fish_probability)}
              fillColor={`${getMarkerColor(zone.fish_probability)}40`} // 40 = 25% opacity
              strokeColor={getMarkerColor(zone.fish_probability)}
              strokeWidth={2}
            />

            {/* Marker at center */}
            <Marker
              coordinate={{
                latitude: zone.lat,
                longitude: zone.lon,
              }}
              onPress={() => handleMarkerPress(zone)}
              pinColor={getMarkerColor(zone.fish_probability)}
            />
          </React.Fragment>
        ))}
      </MapView>

      {/* Probability Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Min Probability:</Text>
        <View style={styles.filterButtons}>
          {[0, 0.3, 0.5, 0.7].map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.filterButton,
                minProbability === value && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterChange(value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  minProbability === value && styles.filterButtonTextActive,
                ]}
              >
                {value === 0 ? "All" : `${(value * 100).toFixed(0)}%`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Fish Probability</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#DC2626" }]} />
            <Text style={styles.legendText}>Very High (80%+)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#EA580C" }]} />
            <Text style={styles.legendText}>High (60-80%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#F59E0B" }]} />
            <Text style={styles.legendText}>Medium (40-60%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#10B981" }]} />
            <Text style={styles.legendText}>Low (&lt;40%)</Text>
          </View>
        </View>
      </View>

      {/* Selected Zone Details */}
      {selectedZone && (
        <View style={styles.detailsContainer}>
          <ScrollView>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Fish Zone Details</Text>
              <TouchableOpacity onPress={() => setSelectedZone(null)}>
                <Ionicons name="close-circle" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailsContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>
                  {selectedZone.lat.toFixed(3)}°N, {selectedZone.lon.toFixed(3)}
                  °E
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fish Probability:</Text>
                <Text
                  style={[
                    styles.detailValue,
                    styles.probabilityText,
                    { color: getMarkerColor(selectedZone.fish_probability) },
                  ]}
                >
                  {(selectedZone.fish_probability * 100).toFixed(1)}% -{" "}
                  {getProbabilityLabel(selectedZone.fish_probability)}
                </Text>
              </View>

              <View style={styles.separator} />

              <Text style={styles.environmentalHeader}>
                Environmental Conditions
              </Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sea Surface Temp:</Text>
                <Text style={styles.detailValue}>
                  {selectedZone.sst.toFixed(2)}°C
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Chlorophyll:</Text>
                <Text style={styles.detailValue}>
                  {selectedZone.chlor_a.toFixed(4)} mg/m³
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current (E/W):</Text>
                <Text style={styles.detailValue}>
                  {selectedZone.water_u.toFixed(3)} m/s
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current (N/S):</Text>
                <Text style={styles.detailValue}>
                  {selectedZone.water_v.toFixed(3)} m/s
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => {
                    // Navigate to this location (could integrate with navigation app)
                    Alert.alert(
                      "Navigate",
                      `Navigate to ${selectedZone.lat.toFixed(3)}°N, ${selectedZone.lon.toFixed(3)}°E?`
                    );
                  }}
                >
                  <Ionicons name="navigate" size={20} color="#FFF" />
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  refreshButton: {
    padding: 8,
  },
  metadataBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  metadataItem: {
    alignItems: "center",
  },
  metadataLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  map: {
    flex: 1,
  },
  filterContainer: {
    position: "absolute",
    top: 180,
    left: 16,
    right: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#0EA5E9",
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterButtonTextActive: {
    color: "#FFF",
  },
  legendContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 200,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  legendItems: {
    gap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: "#6B7280",
  },
  detailsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: "50%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  detailsContent: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    flex: 1,
    textAlign: "right",
  },
  probabilityText: {
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  environmentalHeader: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginTop: 8,
    marginBottom: 4,
  },
  actionButtons: {
    marginTop: 16,
  },
  navigateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  navigateButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
