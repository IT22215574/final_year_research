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
  Modal,
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
  bathymetry: number;
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

interface GeographicZone {
  id: string;
  name: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  color: string;
}

// Define geographic zones around Sri Lanka
const GEOGRAPHIC_ZONES: GeographicZone[] = [
  {
    id: "north",
    name: "North",
    latMin: 8.5,
    latMax: 10.0,
    lonMin: 79.5,
    lonMax: 81.5,
    color: "#3B82F6", // blue
  },
  {
    id: "northeast",
    name: "Northeast",
    latMin: 8.0,
    latMax: 9.5,
    lonMin: 81.0,
    lonMax: 82.0,
    color: "#8B5CF6", // violet
  },
  {
    id: "east",
    name: "East",
    latMin: 6.5,
    latMax: 8.5,
    lonMin: 81.0,
    lonMax: 82.0,
    color: "#06B6D4", // cyan
  },
  {
    id: "southeast",
    name: "Southeast",
    latMin: 5.5,
    latMax: 7.0,
    lonMin: 80.5,
    lonMax: 82.0,
    color: "#14B8A6", // teal
  },
  {
    id: "south",
    name: "South",
    latMin: 5.0,
    latMax: 6.5,
    lonMin: 79.5,
    lonMax: 81.0,
    color: "#10B981", // green
  },
  {
    id: "southwest",
    name: "Southwest",
    latMin: 5.5,
    latMax: 7.0,
    lonMin: 79.0,
    lonMax: 80.5,
    color: "#F59E0B", // amber
  },
  {
    id: "west",
    name: "West",
    latMin: 6.5,
    latMax: 8.0,
    lonMin: 79.0,
    lonMax: 80.5,
    color: "#EF4444", // red
  },
  {
    id: "northwest",
    name: "Northwest",
    latMin: 7.5,
    latMax: 9.0,
    lonMin: 79.0,
    lonMax: 80.5,
    color: "#EC4899", // pink
  },
];

export default function FishZoneMapScreen() {
  const [fishZones, setFishZones] = useState<FishZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<FishZoneResponse["metadata"] | null>(
    null
  );
  const [selectedZone, setSelectedZone] = useState<FishZone | null>(null);
  const [minProbability, setMinProbability] = useState(0.3); // Show zones with >30% probability (better default)
  const [selectedGeographicZones, setSelectedGeographicZones] = useState<string[]>(
    GEOGRAPHIC_ZONES.map((z) => z.id) // All zones selected by default
  );
  const [showZoneSelector, setShowZoneSelector] = useState(false);

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

  const toggleGeographicZone = (zoneId: string) => {
    setSelectedGeographicZones((prev) => {
      if (prev.includes(zoneId)) {
        // Deselect zone
        return prev.filter((id) => id !== zoneId);
      } else {
        // Select zone
        return [...prev, zoneId];
      }
    });
  };

  const selectAllZones = () => {
    setSelectedGeographicZones(GEOGRAPHIC_ZONES.map((z) => z.id));
  };

  const deselectAllZones = () => {
    setSelectedGeographicZones([]);
  };

  // Filter fish zones based on selected geographic zones
  const filteredFishZones = fishZones.filter((zone) => {
    // If no geographic zones selected, show nothing
    if (selectedGeographicZones.length === 0) return false;

    // Check if fish zone falls within any selected geographic zone
    return selectedGeographicZones.some((geoZoneId) => {
      const geoZone = GEOGRAPHIC_ZONES.find((z) => z.id === geoZoneId);
      if (!geoZone) return false;

      return (
        zone.lat >= geoZone.latMin &&
        zone.lat <= geoZone.latMax &&
        zone.lon >= geoZone.lonMin &&
        zone.lon <= geoZone.lonMax
      );
    });
  });

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
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={fetchFishZones} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#0EA5E9" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Zone Selector Button - Prominent placement */}
      <View style={styles.zoneSelectorButtonContainer}>
        <TouchableOpacity
          onPress={() => setShowZoneSelector(true)}
          style={styles.zoneSelectorButton}
        >
          <Ionicons name="map" size={20} color="#FFF" />
          <Text style={styles.zoneSelectorButtonText}>
            Select Fishing Zones ({selectedGeographicZones.length}/{GEOGRAPHIC_ZONES.length})
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#FFF" />
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
            <Text style={styles.metadataLabel}>Showing</Text>
            <Text style={styles.metadataValue}>{filteredFishZones.length}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Total Available</Text>
            <Text style={styles.metadataValue}>{fishZones.length}</Text>
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
        {filteredFishZones.map((zone, index) => (
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
        <Text style={styles.filterLabel}>Minimum Fish Probability:</Text>
        <Text style={styles.filterHint}>Shows zones with at least this probability</Text>
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
                {value === 0 ? "All" : `≥${(value * 100).toFixed(0)}%`}
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

      {/* Zone Selector Modal */}
      <Modal
        visible={showZoneSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowZoneSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Fishing Zones</Text>
              <TouchableOpacity onPress={() => setShowZoneSelector(false)}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={selectAllZones}
              >
                <Text style={styles.selectAllText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deselectAllButton}
                onPress={deselectAllZones}
              >
                <Text style={styles.deselectAllText}>Deselect All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.zoneList}>
              {GEOGRAPHIC_ZONES.map((zone) => {
                const isSelected = selectedGeographicZones.includes(zone.id);
                return (
                  <TouchableOpacity
                    key={zone.id}
                    style={[
                      styles.zoneItem,
                      isSelected && styles.zoneItemSelected,
                    ]}
                    onPress={() => toggleGeographicZone(zone.id)}
                  >
                    <View style={styles.zoneItemLeft}>
                      <View
                        style={[
                          styles.zoneColorIndicator,
                          { backgroundColor: zone.color },
                        ]}
                      />
                      <Text style={styles.zoneItemText}>{zone.name}</Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color="#FFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Text style={styles.selectedCount}>
                {selectedGeographicZones.length} of {GEOGRAPHIC_ZONES.length}{" "}
                zones selected
              </Text>
              <Text style={styles.filteredCount}>
                Showing {filteredFishZones.length} fish zones
              </Text>
            </View>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowZoneSelector(false)}
            >
              <Text style={styles.applyButtonText}>Apply Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Water Depth:</Text>
                <Text style={styles.detailValue}>
                  {selectedZone.bathymetry > 0 ? `${selectedZone.bathymetry.toFixed(1)}m` : 'Unknown'}
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
    flex: 1,
    textAlign: "center",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshButton: {
    padding: 8,
  },
  zoneSelectorButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  zoneSelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  zoneSelectorButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
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
    top: 240,
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
    marginBottom: 4,
  },
  filterHint: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    fontStyle: "italic",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  selectAllButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#0EA5E9",
    borderRadius: 8,
    alignItems: "center",
  },
  selectAllText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  deselectAllButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
  },
  deselectAllText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  zoneList: {
    maxHeight: 400,
  },
  zoneItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  zoneItemSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#0EA5E9",
  },
  zoneItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  zoneColorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  zoneItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#0EA5E9",
    borderColor: "#0EA5E9",
  },
  modalFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 4,
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  filteredCount: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  applyButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#0EA5E9",
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
