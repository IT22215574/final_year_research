import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";

import { getMyTrips, batchTrainTrips } from "@/services/tripService";

type ExternalCostItem = {
  name: string;
  category: string;
  amount: number;
  source?: "manual" | "preference";
  description?: string;
};

type Trip = {
  _id: string;
  userId: string;

  startLat?: number;
  startLon?: number;
  endLat?: number;
  endLon?: number;

  departureTime: string;
  returnTime: string;
  tripDurationHours?: number;

  boatId?: string;
  distanceKm?: number;
  engineHorsePower?: number;
  engineHP?: number;
  boatType?: string;

  windSpeed?: number;
  waveHeight?: number;
  weatherCondition?: string;

  fuelUsedLiters?: number;
  fuelPricePerLiter?: number;
  marketPrice?: number;

  iceCost?: number;
  crewCost?: number;
  foodCost?: number;
  maintenanceCost?: number;
  otherCost?: number;

  speed?: number;
  averageSpeed?: number;
  crewCount?: number;
  fishingHours?: number;

  fuelCost?: number;
  totalCost?: number;

  predictedFuelLiters?: number;
  predictedTotalCost?: number;
  predictedDistanceKm?: number;
  weatherSeverityIndex?: number;
  economicStressIndex?: number;
  profitabilityProbability?: number;
  riskCategory?: "low" | "medium" | "high";

  carbonEmissionKg?: number;
  carbonPerKgCatch?: number;

  predictedFuelCost?: number;
  predictedCrewCost?: number;
  predictedOperationalCost?: number;
  predictedExternalCostTotal?: number;
  predictedExternalCosts?: ExternalCostItem[];
  optimizationRecommendations?: string[];

  actualFuelLiters?: number;
  actualCatchKg?: number;
  fuelPredictionError?: number;
  actualFuelCost?: number;
  actualOperationalCost?: number;
  actualExternalCosts?: ExternalCostItem[];
  actualExternalCostTotal?: number;
  actualTotalCost?: number;
  actualRevenue?: number;
  actualProfit?: number;
  actualLoggedAt?: string;
  actualNotes?: string;

  totalCostDifference?: number;
  externalCostDifference?: number;
  profitDifference?: number;
  fuelDifference?: number;

  clientRequestId?: string;
  mode?: "island" | "international";
  status?: "planned" | "completed" | "cancelled";

  createdAt?: string;
  updatedAt?: string;
};

const formatCurrency = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `Rs. ${value.toLocaleString()}`;
};

const formatNumber = (value?: number, digits = 1) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return value.toFixed(digits);
};

const formatDateTime = (value?: string) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";

  return d.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getShortId = (id?: string) => {
  if (!id) return "N/A";
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case "completed":
      return "#15803d";
    case "planned":
      return "#2563eb";
    case "cancelled":
      return "#dc2626";
    default:
      return "#6b7280";
  }
};

const getRiskColor = (risk?: string) => {
  switch (risk) {
    case "low":
      return "#15803d";
    case "medium":
      return "#d97706";
    case "high":
      return "#dc2626";
    default:
      return "#6b7280";
  }
};

const TripCard = ({
  trip,
  selectionMode,
  isSelected,
  onToggleSelect,
}: {
  trip: Trip;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) => {
  const isCompleted = trip.status === "completed";
  const hasActualData = trip.actualFuelLiters != null;
  const mainCost =
    isCompleted && trip.actualTotalCost != null
      ? trip.actualTotalCost
      : trip.predictedTotalCost;

  const mainFuel =
    isCompleted && trip.actualFuelLiters != null
      ? trip.actualFuelLiters
      : trip.predictedFuelLiters;

  const distance = trip.predictedDistanceKm ?? trip.distanceKm;
  const duration = trip.tripDurationHours;

  const handlePress = () => {
    if (selectionMode) {
      onToggleSelect(trip._id);
    } else {
      router.push(`/(root)/(tabs)/fishtripcost/trip-details/${trip._id}`);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={{
        backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? "#3b82f6" : "#e5e7eb",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        {selectionMode && (
          <View style={{ marginRight: 12, paddingTop: 2 }}>
            <Checkbox
              value={isSelected}
              onValueChange={() => onToggleSelect(trip._id)}
              color={isSelected ? "#3b82f6" : undefined}
              disabled={!hasActualData}
            />
          </View>
        )}

        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}>
            Trip {getShortId(trip._id)}
          </Text>
          <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Boat ID: {trip.boatId ? getShortId(trip.boatId) : "Not assigned"}
          </Text>
          {selectionMode && !hasActualData && (
            <Text style={{ fontSize: 11, color: "#dc2626", marginTop: 2 }}>
              ⚠️ No actual data - cannot train
            </Text>
          )}
          {selectionMode && hasActualData && (
            <Text style={{ fontSize: 11, color: "#15803d", marginTop: 2 }}>
              ✓ Can be used for training
            </Text>
          )}
        </View>

        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <View
            style={{
              backgroundColor: "#f3f4f6",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: getStatusColor(trip.status),
                textTransform: "capitalize",
              }}
            >
              {trip.status || "planned"}
            </Text>
          </View>

          {trip.riskCategory ? (
            <View
              style={{
                backgroundColor: "#f9fafb",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "#e5e7eb",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: getRiskColor(trip.riskCategory),
                  textTransform: "capitalize",
                }}
              >
                {trip.riskCategory} risk
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
          Departure
        </Text>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
          {formatDateTime(trip.departureTime)}
        </Text>

        <Text
          style={{
            fontSize: 12,
            color: "#6b7280",
            marginTop: 10,
            marginBottom: 4,
          }}
        >
          Return
        </Text>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
          {formatDateTime(trip.returnTime)}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          rowGap: 10,
        }}
      >
        <View
          style={{
            width: "48%",
            backgroundColor: "#f9fafb",
            borderRadius: 12,
            padding: 10,
          }}
        >
          <Text style={{ fontSize: 12, color: "#6b7280" }}>Mode</Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#111827",
              textTransform: "capitalize",
            }}
          >
            {trip.mode || "island"}
          </Text>
        </View>

        <View
          style={{
            width: "48%",
            backgroundColor: "#f9fafb",
            borderRadius: 12,
            padding: 10,
          }}
        >
          <Text style={{ fontSize: 12, color: "#6b7280" }}>
            {isCompleted ? "Actual Cost" : "Predicted Cost"}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
            {formatCurrency(mainCost)}
          </Text>
        </View>

        <View
          style={{
            width: "48%",
            backgroundColor: "#f9fafb",
            borderRadius: 12,
            padding: 10,
          }}
        >
          <Text style={{ fontSize: 12, color: "#6b7280" }}>
            {isCompleted ? "Actual Fuel" : "Predicted Fuel"}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
            {mainFuel != null ? `${formatNumber(mainFuel)} L` : "N/A"}
          </Text>
        </View>

        <View
          style={{
            width: "48%",
            backgroundColor: "#f9fafb",
            borderRadius: 12,
            padding: 10,
          }}
        >
          <Text style={{ fontSize: 12, color: "#6b7280" }}>Distance</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
            {distance != null ? `${formatNumber(distance)} km` : "N/A"}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: "#f3f4f6",
        }}
      >
        <Text style={{ fontSize: 13, color: "#6b7280" }}>
          Duration: {duration != null ? `${formatNumber(duration, 1)} hrs` : "N/A"}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: "#111827", fontWeight: "600" }}>
            View details
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color="#111827"
            style={{ marginLeft: 4 }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function PastTripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [training, setTraining] = useState(false);

  const loadTrips = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError("");

      const data = await getMyTrips();
      setTrips(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching trips:", err);
      setError(err?.message || "Failed to fetch trips");
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTrips(true);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips(false);
  };

  const toggleTripSelection = (tripId: string) => {
    setSelectedTripIds((prev) =>
      prev.includes(tripId)
        ? prev.filter((id) => id !== tripId)
        : [...prev, tripId]
    );
  };

  const onBatchTrain = async () => {
    if (selectedTripIds.length === 0) {
      Alert.alert("No Selection", "Please select at least one trip to train on.");
      return;
    }

    Alert.alert(
      "Confirm Training",
      `Train the model on ${selectedTripIds.length} selected trip${selectedTripIds.length > 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Train",
          onPress: async () => {
            try {
              setTraining(true);
              const result = await batchTrainTrips(selectedTripIds);
              
              Alert.alert(
                "✅ Training Complete",
                `Successfully trained on ${result.tripsProcessed} trip${result.tripsProcessed > 1 ? "s" : ""}!\n\n` +
                `Boats updated: ${result.boatsUpdated}\n` +
                `Average error: ${result.learningResult?.averageError?.toFixed(2) || "N/A"}%`,
                [
                  {
                    text: "OK",
                    onPress: () => {
                      setSelectedTripIds([]);
                      setSelectionMode(false);
                    },
                  },
                ]
              );
            } catch (err: any) {
              Alert.alert(
                "Training Failed",
                err?.message || "Failed to train model on selected trips."
              );
            } finally {
              setTraining(false);
            }
          },
        },
      ]
    );
  };

  const selectGoodTrips = () => {
    const goodTrips = trips
      .filter(
        (trip) =>
          trip.actualFuelLiters != null &&
          Math.abs(trip.fuelPredictionError || 100) < 15
      )
      .map((trip) => trip._id);

    setSelectedTripIds(goodTrips);
    
    if (goodTrips.length === 0) {
      Alert.alert(
        "No Quality Trips",
        "No trips found with actual data and prediction error < 15%."
      );
    } else {
      Alert.alert(
        "Auto-Selected",
        `Selected ${goodTrips.length} high-quality trip${goodTrips.length > 1 ? "s" : ""} (error < 15%)`
      );
    }
  };

  const tripCountText = useMemo(() => {
    if (trips.length === 1) return "1 trip found";
    return `${trips.length} trips found`;
  }, [trips]);

  const trainableTripsCount = useMemo(() => {
    return trips.filter((trip) => trip.actualFuelLiters != null).length;
  }, [trips]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <ActivityIndicator size="large" color="#111827" />
          <Text style={{ marginTop: 12, color: "#6b7280", fontSize: 14 }}>
            Loading your trips...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827" }}>
              My Trips
            </Text>
            <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 6 }}>
              {tripCountText}
              {trainableTripsCount > 0 && (
                <Text style={{ color: "#15803d", fontWeight: "600" }}>
                  {" "}• {trainableTripsCount} trainable
                </Text>
              )}
            </Text>
          </View>

          {!selectionMode ? (
            <TouchableOpacity
              onPress={() => setSelectionMode(true)}
              style={{
                backgroundColor: "#3b82f6",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Ionicons name="checkbox-outline" size={18} color="#ffffff" />
              <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 14 }}>
                Select
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={onBatchTrain}
                disabled={selectedTripIds.length === 0 || training}
                style={{
                  backgroundColor:
                    selectedTripIds.length === 0 || training
                      ? "#d1d5db"
                      : "#15803d",
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {training ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="flash" size={16} color="#ffffff" />
                )}
                <Text
                  style={{ color: "#ffffff", fontWeight: "700", fontSize: 13 }}
                >
                  Train ({selectedTripIds.length})
                </Text>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", gap: 6 }}>
                <TouchableOpacity
                  onPress={selectGoodTrips}
                  style={{
                    backgroundColor: "#f3f4f6",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#3b82f6",
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    Auto
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setSelectionMode(false);
                    setSelectedTripIds([]);
                  }}
                  style={{
                    backgroundColor: "#f3f4f6",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#dc2626",
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {error ? (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 10,
            backgroundColor: "#fef2f2",
            borderWidth: 1,
            borderColor: "#fecaca",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text style={{ color: "#b91c1c", fontWeight: "600" }}>{error}</Text>
          <TouchableOpacity
            onPress={() => loadTrips(true)}
            style={{ marginTop: 8 }}
          >
            <Text style={{ color: "#991b1b", fontWeight: "700" }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={trips}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            selectionMode={selectionMode}
            isSelected={selectedTripIds.includes(item._id)}
            onToggleSelect={toggleTripSelection}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          flexGrow: trips.length === 0 ? 1 : 0,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            }}
          >
            <Ionicons name="boat-outline" size={52} color="#9ca3af" />
            <Text
              style={{
                marginTop: 12,
                fontSize: 20,
                fontWeight: "700",
                color: "#111827",
              }}
            >
              No trips yet
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 14,
                lineHeight: 22,
                color: "#6b7280",
                textAlign: "center",
              }}
            >
              Your planned and completed trips will appear here after you save them.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/(root)/(tabs)/fishtripcost")}
              style={{
                marginTop: 18,
                backgroundColor: "#111827",
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "600" }}>
                Go to Trip Planner
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}