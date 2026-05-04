import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";
import DateTimePicker from "@react-native-community/datetimepicker";
import { cacheDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import {
  getTripsForTraining,
  batchTrainTrips,
  exportTripsCSV,
} from "@/services/tripService";
import useAuthStore from "@/stores/authStore";
import ScreenHeader from "./components/ScreenHeader";

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

  tripDate?: string;
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
  numberOfDays?: number;

  fuelCost?: number;
  totalCost?: number;

  predictedFuelLiters?: number;
  predictedTotalCost?: number;
  predictedDistanceKm?: number;
  weatherSeverityIndex?: number;
  economicStressIndex?: number;
  profitabilityProbability?: number;
  riskCategory?: string;

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
  const [expanded, setExpanded] = useState(false);

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
      setExpanded((prev) => !prev);
    }
  };

  const handleViewDetails = () => {
    router.push(`/(root)/(tabs)/fishtripcost/trip-details/${trip._id}`);
  };

  return (
    <View
      style={{
        backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? "#3b82f6" : "#e5e7eb",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {selectionMode && (
            <View style={{ marginRight: 12 }}>
              <Checkbox
                value={isSelected}
                onValueChange={() => onToggleSelect(trip._id)}
                color={isSelected ? "#3b82f6" : undefined}
                disabled={!hasActualData}
              />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <Ionicons name="calendar-outline" size={18} color="#3b82f6" />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#111827",
                  marginLeft: 6,
                }}
              >
                {formatDateTime(trip.departureTime)}
              </Text>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <View
                style={{
                  backgroundColor: `${getStatusColor(trip.status)}20`,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  marginRight: 6,
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: getStatusColor(trip.status),
                    textTransform: "capitalize",
                  }}
                >
                  {trip.status || "planned"}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: "#f3f4f6",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  marginRight: 6,
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "capitalize",
                  }}
                >
                  {trip.mode || "island"}
                </Text>
              </View>

              {trip.riskCategory && (
                <View
                  style={{
                    backgroundColor: `${getRiskColor(trip.riskCategory)}20`,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    marginRight: 6,
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: getRiskColor(trip.riskCategory),
                      textTransform: "capitalize",
                    }}
                  >
                    {trip.riskCategory} risk
                  </Text>
                </View>
              )}
            </View>
          </View>

          {!selectionMode && (
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={24}
              color="#6b7280"
            />
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
              💰 Cost
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
              {formatCurrency(mainCost)}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
              ⛽ Fuel
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
              {mainFuel != null ? `${formatNumber(mainFuel)} L` : "N/A"}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
              📍 Distance
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
              {distance != null ? `${formatNumber(distance)} km` : "N/A"}
            </Text>
          </View>
        </View>

        {selectionMode && !hasActualData && (
          <Text style={{ fontSize: 11, color: "#dc2626", marginTop: 8 }}>
            ⚠️ No actual data - cannot train
          </Text>
        )}

        {selectionMode && hasActualData && (
          <Text style={{ fontSize: 11, color: "#15803d", marginTop: 8 }}>
            ✓ Can be used for training
          </Text>
        )}
      </TouchableOpacity>

      {expanded && !selectionMode && (
        <View
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
          }}
        >
          <View
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <Ionicons name="arrow-back-outline" size={16} color="#6b7280" />
              <Text style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>
                Return Time
              </Text>
            </View>

            <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
              {formatDateTime(trip.returnTime)}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            {duration != null && (
              <View
                style={{
                  width: "48%",
                  backgroundColor: "#f9fafb",
                  borderRadius: 10,
                  padding: 10,
                  marginRight: "2%",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}
                >
                  ⏱️ Duration
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}
                >
                  {formatNumber(duration, 0)} hrs
                </Text>
              </View>
            )}

            {trip.crewCount != null && (
              <View
                style={{
                  width: "48%",
                  backgroundColor: "#f9fafb",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}
                >
                  👥 Crew
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}
                >
                  {trip.crewCount} people
                </Text>
              </View>
            )}

            {trip.carbonEmissionKg != null && (
              <View
                style={{
                  width: "48%",
                  backgroundColor: "#f9fafb",
                  borderRadius: 10,
                  padding: 10,
                  marginRight: "2%",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}
                >
                  🌿 Carbon
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}
                >
                  {formatNumber(trip.carbonEmissionKg)} kg
                </Text>
              </View>
            )}

            {trip.profitabilityProbability != null && (
              <View
                style={{
                  width: "48%",
                  backgroundColor: "#f9fafb",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}
                >
                  📈 Profitability
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}
                >
                  {Math.round(trip.profitabilityProbability * 100)}%
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={handleViewDetails}
            style={{
              backgroundColor: "#3b82f6",
              borderRadius: 10,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#ffffff"
              style={{ marginRight: 6 }}
            />
            <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 14 }}>
              View Full Details
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default function PastTripsScreen() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const isAdmin = !!currentUser?.isAdmin;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [training, setTraining] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [dateFilterVisible, setDateFilterVisible] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const loadTrips = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError("");

      const data = await getTripsForTraining(isAdmin);
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
    }, [isAdmin]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips(false);
  };

  const handleExport = async (dataType: "predicted" | "actual" | "mixed") => {
    try {
      setExporting(true);

      // Fetch CSV data from backend with selected data type
      const csvContent = await exportTripsCSV(dataType);

      // Count rows for user feedback
      const rowCount = csvContent.split("\n").length - 1; // -1 for header

      if (rowCount === 0) {
        const dataTypeLabels = {
          predicted: "predicted",
          actual: "actual logged",
          mixed: "complete training",
        };
        Alert.alert(
          "No Data",
          `No trips with ${dataTypeLabels[dataType]} data found.\n\n` +
            (dataType === "actual"
              ? "Complete trips and log actual data to export actual data."
              : dataType === "predicted"
                ? "Create trip predictions to export predicted data."
                : "Add trip predictions or actual logged data."),
        );
        return;
      }

      // Create file with timestamp and data type
      const fileName = `trips_${dataType}_${Date.now()}.csv`;
      const fileUri = `${cacheDirectory}${fileName}`;

      // Save CSV to file
      await writeAsStringAsync(fileUri, csvContent);

      const dataTypeLabels = {
        predicted: "Predicted",
        actual: "Actual",
        mixed: "Mixed",
      };

      // Share the file - this opens share dialog
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        // Share with system dialog - user can save to Files, Drive, etc.
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: `Save ${dataTypeLabels[dataType]} Training Data`,
          UTI: "public.comma-separated-values-text",
        });

        // Don't show success alert here - let user complete the share action
      } else {
        // Fallback for devices without sharing capability
        Alert.alert(
          "✅ File Ready",
          `${rowCount} ${dataTypeLabels[dataType].toLowerCase()} trip(s) exported!\n\n` +
            `File: ${fileName}\n\n` +
            "The file is ready in app cache. Use the share button to save it to your preferred location.",
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Export Failed",
        error?.message || "Failed to export trips as CSV",
      );
    } finally {
      setExporting(false);
    }
  };

  const toggleTripSelection = (tripId: string) => {
    setSelectedTripIds((prev) =>
      prev.includes(tripId)
        ? prev.filter((id) => id !== tripId)
        : [...prev, tripId],
    );
  };

  const onBatchTrain = async () => {
    if (selectedTripIds.length === 0) {
      Alert.alert(
        "No Selection",
        "Please select at least one trip to train on.",
      );
      return;
    }

    Alert.alert(
      "Confirm Training",
      `Train the model on ${selectedTripIds.length} selected trip${
        selectedTripIds.length > 1 ? "s" : ""
      }?`,
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
                `Successfully trained on ${result.tripsProcessed} trip${
                  result.tripsProcessed > 1 ? "s" : ""
                }!\n\nBoats updated: ${result.boatsUpdated}\nAverage error: ${
                  result.learningResult?.averageError?.toFixed(2) || "N/A"
                }%`,
                [
                  {
                    text: "OK",
                    onPress: () => {
                      setSelectedTripIds([]);
                      setSelectionMode(false);
                    },
                  },
                ],
              );
            } catch (err: any) {
              Alert.alert(
                "Training Failed",
                err?.message || "Failed to train model on selected trips.",
              );
            } finally {
              setTraining(false);
            }
          },
        },
      ],
    );
  };

  const selectGoodTrips = () => {
    if (!Array.isArray(trips)) return;

    const goodTrips = trips
      .filter(
        (trip) =>
          trip.actualFuelLiters != null &&
          Math.abs(trip.fuelPredictionError || 100) < 15,
      )
      .map((trip) => trip._id);

    setSelectedTripIds(goodTrips);

    if (goodTrips.length === 0) {
      Alert.alert(
        "No Quality Trips",
        "No trips found with actual data and prediction error < 15%.",
      );
    } else {
      Alert.alert(
        "Auto-Selected",
        `Selected ${goodTrips.length} high-quality trip${
          goodTrips.length > 1 ? "s" : ""
        } (error < 15%)`,
      );
    }
  };

  const setToday = () => {
    const today = new Date();
    setStartDate(today);
    setEndDate(today);
  };

  const setThisWeek = () => {
    const today = new Date();
    const firstDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - today.getDay(),
    );
    const lastDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + (6 - today.getDay()),
    );
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const setThisMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const handleStartDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS !== "ios") {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS !== "ios") {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const trainableTripsCount = useMemo(() => {
    if (!Array.isArray(trips)) return 0;
    return trips.filter((trip) => trip.actualFuelLiters != null).length;
  }, [trips]);

  const filteredTrips = useMemo(() => {
    if (!Array.isArray(trips)) return [];

    let result = [...trips];

    if (statusFilter !== "all") {
      result = result.filter((trip) => trip.status === statusFilter);
    }

    if (startDate || endDate) {
      result = result.filter((trip) => {
        // Use tripDate if available, otherwise fall back to departureTime
        const dateToUse = trip.tripDate || trip.departureTime;
        const tripDate = new Date(dateToUse);
        if (Number.isNaN(tripDate.getTime())) return false;

        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (tripDate < start) return false;
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (tripDate > end) return false;
        }

        return true;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      result = result.filter((trip) => {
        const departureDate = formatDateTime(trip.departureTime).toLowerCase();
        const tripId = (trip._id || "").toLowerCase();
        const boatId = (trip.boatId || "").toLowerCase();
        const mode = (trip.mode || "").toLowerCase();
        const status = (trip.status || "").toLowerCase();

        return (
          departureDate.includes(query) ||
          tripId.includes(query) ||
          boatId.includes(query) ||
          mode.includes(query) ||
          status.includes(query)
        );
      });
    }

    return result;
  }, [trips, searchQuery, statusFilter, startDate, endDate]);

  const tripCountText = useMemo(() => {
    const count = filteredTrips.length;
    const total = trips.length;

    if (searchQuery || statusFilter !== "all" || startDate || endDate) {
      if (count === 1) return `1 trip found (of ${total} total)`;
      return `${count} trips found (of ${total} total)`;
    }

    if (count === 1) return "1 trip found";
    return `${count} trips found`;
  }, [filteredTrips, trips, searchQuery, statusFilter, startDate, endDate]);

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
      <ScreenHeader
        title={isAdmin ? "Training Trips" : "My Trips"}
        subtitle={`${tripCountText}${isAdmin && trainableTripsCount > 0 ? ` • ${trainableTripsCount} trainable` : ""}`}
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#374151" }}>
              {isAdmin
                ? "Select completed trips with actual data to train shared models"
                : "Track and manage your fishing trips"}
            </Text>
          </View>

          {!selectionMode ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={async () => {
                  // Show data type selection dialog
                  Alert.alert(
                    "Export Training Data",
                    "Choose the type of data to export:",
                    [
                      {
                        text: "Predicted Data",
                        onPress: () => handleExport("predicted"),
                      },
                      {
                        text: "Actual Data",
                        onPress: () => handleExport("actual"),
                      },
                      {
                        text: "Mixed (All)",
                        onPress: () => handleExport("mixed"),
                      },
                      {
                        text: "Cancel",
                        style: "cancel",
                      },
                    ],
                  );
                }}
                disabled={exporting || trips.length === 0}
                style={{
                  backgroundColor:
                    exporting || trips.length === 0 ? "#d1d5db" : "#059669",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {exporting ? (
                  <ActivityIndicator
                    size="small"
                    color="#ffffff"
                    style={{ marginRight: 6 }}
                  />
                ) : (
                  <Ionicons
                    name="download-outline"
                    size={18}
                    color="#ffffff"
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text
                  style={{ color: "#ffffff", fontWeight: "600", fontSize: 14 }}
                >
                  CSV
                </Text>
              </TouchableOpacity>

              {isAdmin && (
                <TouchableOpacity
                  onPress={() => setSelectionMode(true)}
                  style={{
                    backgroundColor: "#3b82f6",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="checkbox-outline"
                    size={18}
                    color="#ffffff"
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{ color: "#ffffff", fontWeight: "600", fontSize: 14 }}
                  >
                    Select
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View>
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
                }}
              >
                {training ? (
                  <ActivityIndicator
                    size="small"
                    color="#ffffff"
                    style={{ marginRight: 6 }}
                  />
                ) : (
                  <Ionicons
                    name="flash"
                    size={16}
                    color="#ffffff"
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text
                  style={{ color: "#ffffff", fontWeight: "700", fontSize: 13 }}
                >
                  Train ({selectedTripIds.length})
                </Text>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", marginTop: 8 }}>
                <TouchableOpacity
                  onPress={selectGoodTrips}
                  style={{
                    backgroundColor: "#f3f4f6",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    marginRight: 8,
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

          {!isAdmin && (
            <View
              style={{
                marginTop: 12,
                backgroundColor: "#eff6ff",
                borderWidth: 1,
                borderColor: "#bfdbfe",
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: "#1d4ed8", fontSize: 12, fontWeight: "600" }}>
                Model training is managed by admins. Your trips continue improving predictions when actual data is logged.
              </Text>
            </View>
          )}
        </View>

        {!selectionMode && (
          <View style={{ marginTop: 16 }}>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: "#e5e7eb",
              }}
            >
              <Ionicons name="search" size={20} color="#6b7280" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by date, ID, boat, mode..."
                placeholderTextColor="#9ca3af"
                style={{
                  flex: 1,
                  marginLeft: 10,
                  fontSize: 15,
                  color: "#111827",
                  paddingVertical: 0,
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 10 }}
            >
              {["all", "planned", "completed", "cancelled"].map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setStatusFilter(status)}
                  style={{
                    backgroundColor:
                      statusFilter === status ? "#3b82f6" : "#ffffff",
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor:
                      statusFilter === status ? "#3b82f6" : "#e5e7eb",
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: statusFilter === status ? "#ffffff" : "#6b7280",
                      textTransform: "capitalize",
                    }}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                marginTop: 10,
                alignItems: "center",
              }}
            >
              <TouchableOpacity
                onPress={() => setDateFilterVisible(true)}
                style={{
                  backgroundColor: startDate || endDate ? "#8b5cf6" : "#ffffff",
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: startDate || endDate ? "#8b5cf6" : "#e5e7eb",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={startDate || endDate ? "#ffffff" : "#6b7280"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: startDate || endDate ? "#ffffff" : "#6b7280",
                  }}
                >
                  {startDate || endDate ? "Filters Active" : "Date Filter"}
                </Text>
              </TouchableOpacity>

              {(startDate || endDate) && (
                <TouchableOpacity
                  onPress={clearDateFilter}
                  style={{
                    backgroundColor: "#fef2f2",
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#fecaca",
                    marginLeft: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#dc2626",
                    }}
                  >
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      <Modal
        visible={dateFilterVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDateFilterVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#ffffff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "80%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#e5e7eb",
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}
              >
                Filter by Date
              </Text>
              <TouchableOpacity onPress={() => setDateFilterVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#6b7280",
                  marginBottom: 8,
                }}
              >
                Quick Select
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setToday();
                    setDateFilterVisible(false);
                  }}
                  style={{
                    backgroundColor: "#eff6ff",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: "#3b82f6",
                    marginRight: 6,
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#3b82f6",
                    }}
                  >
                    Today
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setThisWeek();
                    setDateFilterVisible(false);
                  }}
                  style={{
                    backgroundColor: "#eff6ff",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: "#3b82f6",
                    marginRight: 6,
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#3b82f6",
                    }}
                  >
                    This Week
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setThisMonth();
                    setDateFilterVisible(false);
                  }}
                  style={{
                    backgroundColor: "#eff6ff",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: "#3b82f6",
                    marginRight: 6,
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#3b82f6",
                    }}
                  >
                    This Month
                  </Text>
                </TouchableOpacity>
              </View>

              <View>
                <View style={{ marginBottom: 10 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: 6,
                    }}
                  >
                    From Date
                  </Text>

                  <TouchableOpacity
                    onPress={() => setShowStartDatePicker(true)}
                    style={{
                      backgroundColor: "#f9fafb",
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: startDate ? "#111827" : "#9ca3af",
                      }}
                    >
                      {startDate
                        ? startDate.toLocaleDateString("en-LK", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "Select start date"}
                    </Text>
                    <Ionicons name="calendar" size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={{ marginBottom: 10 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: 6,
                    }}
                  >
                    To Date
                  </Text>

                  <TouchableOpacity
                    onPress={() => setShowEndDatePicker(true)}
                    style={{
                      backgroundColor: "#f9fafb",
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: endDate ? "#111827" : "#9ca3af",
                      }}
                    >
                      {endDate
                        ? endDate.toLocaleDateString("en-LK", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "Select end date"}
                    </Text>
                    <Ionicons name="calendar" size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {startDate || endDate ? (
                  <View
                    style={{
                      backgroundColor: "#f0fdf4",
                      borderRadius: 8,
                      padding: 10,
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#15803d",
                        fontWeight: "600",
                      }}
                    >
                      📅 Filtering:{" "}
                      {startDate
                        ? startDate.toLocaleDateString("en-LK", {
                            month: "short",
                            day: "numeric",
                          })
                        : "..."}{" "}
                      →{" "}
                      {endDate
                        ? endDate.toLocaleDateString("en-LK", {
                            month: "short",
                            day: "numeric",
                          })
                        : "..."}
                    </Text>
                  </View>
                ) : null}
              </View>

              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleStartDateChange}
                  maximumDate={endDate || new Date()}
                />
              )}

              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleEndDateChange}
                  minimumDate={startDate || undefined}
                  maximumDate={new Date()}
                />
              )}

              <View
                style={{
                  flexDirection: "row",
                  marginTop: 20,
                  marginBottom: 10,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    clearDateFilter();
                    setDateFilterVisible(false);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: "#f3f4f6",
                    paddingVertical: 12,
                    borderRadius: 10,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#6b7280",
                    }}
                  >
                    Clear
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDateFilterVisible(false)}
                  style={{
                    flex: 1,
                    backgroundColor: "#3b82f6",
                    paddingVertical: 12,
                    borderRadius: 10,
                    marginLeft: 8,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontWeight: "600",
                      color: "#ffffff",
                    }}
                  >
                    Apply
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
            <Text style={{ color: "#991b1b", fontWeight: "700" }}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {filteredTrips.length === 0 && !error ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Ionicons
            name={
              searchQuery || statusFilter !== "all" || startDate || endDate
                ? "search-outline"
                : "boat-outline"
            }
            size={64}
            color="#d1d5db"
          />
          <Text
            style={{
              marginTop: 16,
              fontSize: 18,
              fontWeight: "600",
              color: "#111827",
            }}
          >
            {searchQuery || statusFilter !== "all" || startDate || endDate
              ? "No trips found"
              : "No trips yet"}
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontSize: 14,
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            {searchQuery || statusFilter !== "all" || startDate || endDate
              ? "Try adjusting your search or filters"
              : "Your planned and completed trips will appear here after you save them."}
          </Text>

          {searchQuery || statusFilter !== "all" || startDate || endDate ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setStatusFilter("all");
                clearDateFilter();
              }}
              style={{
                marginTop: 20,
                backgroundColor: "#3b82f6",
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "600" }}>
                Clear Filters
              </Text>
            </TouchableOpacity>
          ) : (
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
          )}
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              selectionMode={isAdmin && selectionMode}
              isSelected={selectedTripIds.includes(item._id)}
              onToggleSelect={toggleTripSelection}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}
