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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import MapView, {
  Marker,
  Circle,
  PROVIDER_GOOGLE,
  Polygon,
  Polyline,
} from "react-native-maps";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/utils/api";
import useFishingZoneStore, {
  type FishingZone,
  type MapFishZone,
} from "@/stores/fishingZoneStore";

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

const HARBOR_LOCATION = {
  latitude: 6.9347,
  longitude: 79.8429,
  name: "Colombo Harbor",
};

const getDistanceKm = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) => {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getRouteDistanceKm = (
  points: Array<{ latitude: number; longitude: number }>,
) => {
  if (points.length === 0) return 0;

  let totalDistance = getDistanceKm(HARBOR_LOCATION, points[0]);
  for (let i = 1; i < points.length; i += 1) {
    totalDistance += getDistanceKm(points[i - 1], points[i]);
  }

  return totalDistance;
};

// Sri Lanka EEZ boundary — traced from official 1974/1976 India-SL maritime agreement map
// Sufficient intermediate points added on curves so Polygon renders smooth arcs
const SRI_LANKA_EEZ_BOUNDARY = [
  // ── North: Palk Strait entry (near Jaffna / Point Pedro) ──
  { latitude: 9.8, longitude: 79.3 },
  // ── Northern Indo-SL maritime boundary going northeast ──
  { latitude: 10.3, longitude: 79.6 },
  { latitude: 10.8, longitude: 79.9 },
  { latitude: 11.3, longitude: 80.2 },
  { latitude: 11.7, longitude: 80.4 },
  { latitude: 12.0, longitude: 80.5 }, // northernmost point
  // ── Curve east-southeast into Bay of Bengal ──
  { latitude: 11.5, longitude: 81.0 },
  { latitude: 11.0, longitude: 81.5 },
  { latitude: 10.5, longitude: 82.0 },
  { latitude: 10.0, longitude: 82.5 },
  { latitude: 9.5, longitude: 83.0 },
  { latitude: 9.0, longitude: 83.5 },
  { latitude: 8.5, longitude: 83.8 },
  { latitude: 8.0, longitude: 84.0 }, // eastern boundary ~84°E
  // ── Eastern boundary straight south ──
  { latitude: 7.0, longitude: 84.0 },
  { latitude: 6.0, longitude: 84.0 },
  { latitude: 5.0, longitude: 84.0 },
  { latitude: 4.0, longitude: 84.0 },
  { latitude: 3.0, longitude: 83.5 },
  // ── Southeast curve towards south ──
  { latitude: 2.5, longitude: 83.0 },
  { latitude: 2.2, longitude: 82.5 },
  { latitude: 2.0, longitude: 82.0 }, // southernmost area (east)
  // ── Southern boundary going west ──
  { latitude: 2.0, longitude: 81.0 },
  { latitude: 2.0, longitude: 80.0 },
  { latitude: 2.0, longitude: 79.0 },
  // ── Southwest curve ──
  { latitude: 2.2, longitude: 78.5 },
  { latitude: 2.5, longitude: 78.0 },
  { latitude: 3.0, longitude: 77.5 },
  { latitude: 3.5, longitude: 77.0 },
  // ── Western Indo-SL maritime boundary going north-northwest ──
  { latitude: 4.5, longitude: 76.8 },
  { latitude: 5.5, longitude: 76.5 },
  { latitude: 6.5, longitude: 76.5 },
  { latitude: 7.0, longitude: 76.7 },
  { latitude: 7.5, longitude: 77.0 },
  { latitude: 8.0, longitude: 77.5 },
  { latitude: 8.5, longitude: 78.0 },
  { latitude: 9.0, longitude: 78.5 },
  { latitude: 9.5, longitude: 79.0 },
  // ── Close polygon back to Palk Strait ──
  { latitude: 9.8, longitude: 79.3 },
];

const isInsideSriLankaEEZ = (lat: number, lon: number): boolean => {
  const polygon = SRI_LANKA_EEZ_BOUNDARY;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude,
      yi = polygon[i].longitude;
    const xj = polygon[j].latitude,
      yj = polygon[j].longitude;
    const intersect =
      yi > lon !== yj > lon && lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

// Geographic zones covering Sri Lanka's EEZ only (bounded by India-SL maritime agreements)
// Northern boundary ~10.5°N (Palk Strait/Bay of Bengal India treaty line)
// Western boundary ~77-78°E (India-SL Gulf of Mannar treaty line)
const GEOGRAPHIC_ZONES: GeographicZone[] = [
  {
    id: "north",
    name: "North",
    latMin: 9.5,
    latMax: 10.5,
    lonMin: 80.0,
    lonMax: 82.5,
    color: "#3B82F6", // blue
  },
  {
    id: "northeast",
    name: "Northeast",
    latMin: 8.0,
    latMax: 10.5,
    lonMin: 82.0,
    lonMax: 85.0,
    color: "#8B5CF6", // violet
  },
  {
    id: "east",
    name: "East",
    latMin: 5.0,
    latMax: 9.0,
    lonMin: 82.0,
    lonMax: 85.0,
    color: "#06B6D4", // cyan
  },
  {
    id: "southeast",
    name: "Southeast",
    latMin: 2.0,
    latMax: 6.5,
    lonMin: 80.5,
    lonMax: 85.0,
    color: "#14B8A6", // teal
  },
  {
    id: "south",
    name: "South",
    latMin: 2.0,
    latMax: 6.5,
    lonMin: 78.0,
    lonMax: 82.5,
    color: "#10B981", // green
  },
  {
    id: "southwest",
    name: "Southwest",
    latMin: 2.0,
    latMax: 7.0,
    lonMin: 76.0,
    lonMax: 80.0,
    color: "#F59E0B", // amber
  },
  {
    id: "west",
    name: "West",
    latMin: 5.5,
    latMax: 9.0,
    lonMin: 77.5,
    lonMax: 80.5,
    color: "#EF4444", // red
  },
  {
    id: "northwest",
    name: "Northwest",
    latMin: 8.5,
    latMax: 10.5,
    lonMin: 78.5,
    lonMax: 81.5,
    color: "#EC4899", // pink
  },
];

export default function FishZoneMapScreen() {
  const insets = useSafeAreaInsets();
  const [fishZones, setFishZones] = useState<FishZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<FishZoneResponse["metadata"] | null>(
    null,
  );
  const [selectedZone, setSelectedZone] = useState<FishZone | null>(null);
  const [minProbability, setMinProbability] = useState(0.3); // Show zones with >30% probability (better default)
  const [selectedGeographicZones, setSelectedGeographicZones] = useState<
    string[]
  >(
    GEOGRAPHIC_ZONES.map((z) => z.id), // All zones selected by default
  );
  const [showZoneSelector, setShowZoneSelector] = useState(false);
  const [showMapControls, setShowMapControls] = useState(true);

  // Integration with TripPlanner
  const { selectedZones, addMapZone, removeZone, clearZones } =
    useFishingZoneStore();

  // Center of Sri Lanka's EEZ (bounded by India-SL maritime agreements)
  const SRI_LANKA_CENTER = {
    latitude: 7.5,
    longitude: 81.5,
    latitudeDelta: 10,
    longitudeDelta: 10,
  };

  useEffect(() => {
    fetchFishZones();
  }, [minProbability]);

  const fetchFishZones = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(
        `/api/v1/fish-zones/latest?minProbability=${minProbability}`,
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
        "Could not load fish zone predictions. Please try again.",
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

  const getZoneId = (zone: Pick<FishZone, "lat" | "lon">) =>
    Math.round(zone.lat * 100000 + zone.lon);

  const isSameZone = (zone: FishZone, selected: FishingZone) =>
    Math.abs(selected.latitude - zone.lat) < 0.001 &&
    Math.abs(selected.longitude - zone.lon) < 0.001;

  const getSelectedZoneIndex = (zone: FishZone) =>
    selectedZones.findIndex((selected) => isSameZone(zone, selected));

  const isZoneSelected = (zone: FishZone) => getSelectedZoneIndex(zone) !== -1;

  const mapZoneFromFishZone = (zone: FishZone): MapFishZone => ({
    lat: zone.lat,
    lon: zone.lon,
    sst: zone.sst,
    chlor_a: zone.chlor_a,
    water_u: zone.water_u,
    water_v: zone.water_v,
    fish_zone: zone.fish_zone,
    fish_probability: zone.fish_probability,
    bathymetry: zone.bathymetry,
  });

  const handleToggleZoneForTrip = (zone: FishZone) => {
    if (isZoneSelected(zone)) {
      removeZone(getZoneId(zone));
      return;
    }

    addMapZone(mapZoneFromFishZone(zone));
  };

  const handleGoToTripPlanner = () => {
    if (selectedZones.length === 0) {
      Alert.alert(
        "No zones selected",
        "Select at least one fishing zone before planning a trip.",
      );
      return;
    }

    router.replace("/(root)/(tabs)/fishtripcost/planner");
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

  // Filter fish zones: must be inside Sri Lanka's EEZ and within a selected geographic zone
  const filteredFishZones = fishZones.filter((zone) => {
    if (selectedGeographicZones.length === 0) return false;
    if (!isInsideSriLankaEEZ(zone.lat, zone.lon)) return false;

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

  const selectedRouteCoordinates = selectedZones.map((zone) => ({
    latitude: zone.latitude,
    longitude: zone.longitude,
  }));

  const routeCoordinates =
    selectedRouteCoordinates.length > 0
      ? [HARBOR_LOCATION, ...selectedRouteCoordinates]
      : [];

  const selectedRouteDistanceKm = getRouteDistanceKm(selectedRouteCoordinates);

  const averageSelectedProbability =
    selectedZones.length > 0
      ? selectedZones.reduce(
          (sum, zone) => sum + (zone.fish_probability || 0),
          0,
        ) / selectedZones.length
      : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={styles.loadingText}>
            Loading Fish Zone Predictions...
          </Text>
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
          <TouchableOpacity
            onPress={fetchFishZones}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh" size={24} color="#0EA5E9" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controlsToggleContainer}>
        <TouchableOpacity
          onPress={() => setShowMapControls((prev) => !prev)}
          style={styles.controlsToggleButton}
          activeOpacity={0.85}
        >
          <Ionicons
            name={showMapControls ? "chevron-up" : "chevron-down"}
            size={18}
            color="#0EA5E9"
          />
          <Text style={styles.controlsToggleText}>
            {showMapControls ? "Hide controls" : "Show controls"}
          </Text>
        </TouchableOpacity>
      </View>

      {showMapControls && (
        <>
          {/* Zone Selector Button - Prominent placement */}
          <View style={styles.zoneSelectorButtonContainer}>
            <TouchableOpacity
              onPress={() => setShowZoneSelector(true)}
              style={styles.zoneSelectorButton}
            >
              <Ionicons name="map" size={20} color="#FFF" />
              <Text style={styles.zoneSelectorButtonText}>
                Select Fishing Zones ({selectedGeographicZones.length}/
                {GEOGRAPHIC_ZONES.length})
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
                <Text style={styles.metadataValue}>
                  {filteredFishZones.length}
                </Text>
              </View>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Total Available</Text>
                <Text style={styles.metadataValue}>{fishZones.length}</Text>
              </View>
            </View>
          )}

          <View style={styles.controlsStack}>
            {/* Probability Filter */}
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Minimum Fish Probability:</Text>
              <Text style={styles.filterHint}>
                Shows zones with at least this probability
              </Text>
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
                        minProbability === value &&
                          styles.filterButtonTextActive,
                      ]}
                    >
                      {value === 0 ? "All" : `≥${(value * 100).toFixed(0)}%`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </>
      )}

      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={SRI_LANKA_CENTER}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Sri Lanka maritime zone boundary */}
        <Polygon
          coordinates={SRI_LANKA_EEZ_BOUNDARY}
          strokeColor="rgba(0,0,0,0.75)"
          strokeWidth={1.5}
          fillColor="transparent"
        />

        {routeCoordinates.length > 0 && (
          <>
            <Marker
              coordinate={HARBOR_LOCATION}
              title={HARBOR_LOCATION.name}
              description="Trip starting point"
              pinColor="#2563EB"
            />
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#2563EB"
              strokeWidth={4}
              lineDashPattern={[10, 6]}
            />
          </>
        )}

        {filteredFishZones.map((zone, index) => {
          const selectedIndex = getSelectedZoneIndex(zone);
          const isSelected = selectedIndex !== -1;
          const markerColor = isSelected
            ? "#2563EB"
            : getMarkerColor(zone.fish_probability);

          return (
            <React.Fragment key={`zone-${index}`}>
              {/* Circle showing fish zone area */}
              <Circle
                center={{
                  latitude: zone.lat,
                  longitude: zone.lon,
                }}
                radius={getCircleRadius(zone.fish_probability)}
                fillColor={`${markerColor}${isSelected ? "55" : "30"}`}
                strokeColor={markerColor}
                strokeWidth={isSelected ? 4 : 2}
              />

              {isSelected ? (
                <Marker
                  coordinate={{
                    latitude: zone.lat,
                    longitude: zone.lon,
                  }}
                  onPress={() => handleMarkerPress(zone)}
                >
                  <View
                    style={[
                      styles.zoneMarker,
                      {
                        backgroundColor: markerColor,
                        borderColor: "#FFFFFF",
                      },
                      styles.zoneMarkerSelected,
                    ]}
                  >
                    <Text style={styles.zoneMarkerText}>
                      {selectedIndex + 1}
                    </Text>
                  </View>
                </Marker>
              ) : (
                <Marker
                  coordinate={{
                    latitude: zone.lat,
                    longitude: zone.lon,
                  }}
                  onPress={() => handleMarkerPress(zone)}
                  pinColor={getMarkerColor(zone.fish_probability)}
                />
              )}
            </React.Fragment>
          );
        })}
      </MapView>

      {selectedZones.length > 0 && !selectedZone && (
        <View
          style={[
            styles.routeSummaryOverlay,
            { bottom: Math.max(96, insets.bottom + 80) },
          ]}
        >
          <View style={styles.routeSummaryContent}>
            <View style={styles.routeSummaryTextBlock}>
              <Text style={styles.routeSummaryTitle}>
                {selectedZones.length} zone
                {selectedZones.length === 1 ? "" : "s"} selected
              </Text>
              <Text style={styles.routeSummarySubtitle}>
                {selectedRouteDistanceKm.toFixed(1)} km route • Avg probability{" "}
                {(averageSelectedProbability * 100).toFixed(1)}%
              </Text>
            </View>
            <TouchableOpacity
              style={styles.routeClearButton}
              onPress={clearZones}
              activeOpacity={0.75}
            >
              <Ionicons name="trash-outline" size={17} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.routePlanButton}
              onPress={handleGoToTripPlanner}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate" size={17} color="#FFFFFF" />
              <Text style={styles.routePlanButtonText}>Plan Trip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Legend Overlay */}
      {!selectedZone && selectedZones.length === 0 && (
        <View style={styles.legendOverlay}>
          <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Fish Probability</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: "#DC2626" }]}
                />
                <Text style={styles.legendText}>Very High (80%+)</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: "#EA580C" }]}
                />
                <Text style={styles.legendText}>High (60-80%)</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: "#F59E0B" }]}
                />
                <Text style={styles.legendText}>Medium (40-60%)</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: "#10B981" }]}
                />
                <Text style={styles.legendText}>Low (&lt;40%)</Text>
              </View>
            </View>
          </View>
        </View>
      )}

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
        <View
          style={[
            styles.detailsContainer,
            { bottom: Math.max(88, insets.bottom + 72) },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.detailsScrollContent}
            showsVerticalScrollIndicator={false}
          >
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
                  {selectedZone.bathymetry > 0
                    ? `${selectedZone.bathymetry.toFixed(1)}m`
                    : "Unknown"}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.useZoneButton,
                    isZoneSelected(selectedZone) && styles.removeZoneButton,
                  ]}
                  onPress={() => handleToggleZoneForTrip(selectedZone)}
                >
                  <Ionicons
                    name={
                      isZoneSelected(selectedZone)
                        ? "remove-circle"
                        : "add-circle"
                    }
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.useZoneButtonText}>
                    {isZoneSelected(selectedZone)
                      ? "Remove from Trip"
                      : "Add Zone to Trip"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.planTripButton,
                    selectedZones.length === 0 && styles.planTripButtonDisabled,
                  ]}
                  onPress={handleGoToTripPlanner}
                  disabled={selectedZones.length === 0}
                >
                  <Ionicons name="boat" size={20} color="#FFF" />
                  <Text style={styles.useZoneButtonText}>
                    Plan Trip ({selectedZones.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => {
                    // Navigate to this location (could integrate with navigation app)
                    Alert.alert(
                      "Navigate",
                      `Navigate to ${selectedZone.lat.toFixed(3)}°N, ${selectedZone.lon.toFixed(3)}°E?`,
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
  controlsToggleContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: "#F9FAFB",
  },
  controlsToggleButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  controlsToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0284C7",
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
  zoneMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  zoneMarkerSelected: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
  },
  zoneMarkerText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  routeSummaryOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 25,
    elevation: 25,
  },
  routeSummaryContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 5,
    gap: 10,
  },
  routeSummaryTextBlock: {
    flex: 1,
  },
  routeSummaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  routeSummarySubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  routeClearButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  routePlanButton: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 6,
  },
  routePlanButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  controlsStack: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 12,
    backgroundColor: "#F9FAFB",
  },
  filterContainer: {
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
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 170,
  },
  legendOverlay: {
    position: "absolute",
    left: 12,
    bottom: 96,
    zIndex: 20,
    elevation: 20,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  legendItems: {
    gap: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: "#6B7280",
  },
  detailsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: "58%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  detailsScrollContent: {
    paddingBottom: 24,
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
  useZoneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  removeZoneButton: {
    backgroundColor: "#EF4444",
  },
  planTripButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  planTripButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  useZoneButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
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
