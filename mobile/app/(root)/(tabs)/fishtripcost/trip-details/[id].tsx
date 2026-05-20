import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { deleteTrip, getTripById } from "@/services/tripService";
import FishTripNavBar from "../components/FishTripNavBar";

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
  predictedExternalCosts?: ExternalCostItem[];
  predictedExternalCostTotal?: number;
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

const formatNumber = (value?: number, digits = 2) => {
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
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
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

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View
    style={{
      backgroundColor: "#ffffff",
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "#e5e7eb",
    }}
  >
    <Text
      style={{
        fontSize: 17,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 12,
      }}
    >
      {title}
    </Text>
    {children}
  </View>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#f3f4f6",
      gap: 12,
    }}
  >
    <Text style={{ flex: 1, fontSize: 14, color: "#6b7280" }}>{label}</Text>
    <Text
      style={{
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
        textAlign: "right",
      }}
    >
      {value}
    </Text>
  </View>
);

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");

  const loadTrip = async () => {
    try {
      setLoading(true);
      setError("");

      if (!id || typeof id !== "string") {
        throw new Error("Invalid trip id");
      }

      const data = await getTripById(id);
      setTrip(data);
    } catch (err: any) {
      console.error("Failed to load trip:", err);
      setError(err?.message || "Failed to load trip");
      setTrip(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTrip();
    }, [id]),
  );

  const handleDelete = () => {
    if (!trip?._id) return;

    Alert.alert("Delete Trip", "Are you sure you want to delete this trip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleteLoading(true);
            await deleteTrip(trip._id);
            Alert.alert("Success", "Trip deleted successfully");
            router.replace("/(root)/(tabs)/fishtripcost/past-trips");
          } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to delete trip");
          } finally {
            setDeleteLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <ActivityIndicator size="large" color="#111827" />
          <Text style={{ marginTop: 12, color: "#6b7280" }}>
            Loading trip details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <Ionicons name="alert-circle-outline" size={52} color="#dc2626" />
          <Text
            style={{
              marginTop: 12,
              fontSize: 20,
              fontWeight: "700",
              color: "#111827",
            }}
          >
            Trip not found
          </Text>
          <Text
            style={{
              marginTop: 8,
              textAlign: "center",
              color: "#6b7280",
              lineHeight: 22,
            }}
          >
            {error || "Unable to load this trip."}
          </Text>

          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              marginTop: 18,
              backgroundColor: "#111827",
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      edges={["top"]}
    >
      <FishTripNavBar />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 14,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827" }}>
              Trip Details
            </Text>
            <Text style={{ marginTop: 6, color: "#6b7280" }}>
              Trip ID: {getShortId(trip._id)}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 8 }}>
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
                  color: getStatusColor(trip.status),
                  fontWeight: "700",
                  fontSize: 12,
                  textTransform: "capitalize",
                }}
              >
                {trip.status || "planned"}
              </Text>
            </View>

            {trip.riskCategory ? (
              <View
                style={{
                  backgroundColor: "#fff",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                }}
              >
                <Text
                  style={{
                    color: getRiskColor(trip.riskCategory),
                    fontWeight: "700",
                    fontSize: 12,
                    textTransform: "capitalize",
                  }}
                >
                  {trip.riskCategory} risk
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Section title="Trip Overview">
          <Row
            label="Boat ID"
            value={trip.boatId ? getShortId(trip.boatId) : "Not assigned"}
          />
          <Row label="Mode" value={trip.mode || "island"} />
          <Row
            label="Departure Time"
            value={formatDateTime(trip.departureTime)}
          />
          <Row label="Return Time" value={formatDateTime(trip.returnTime)} />
          <Row
            label="Duration"
            value={
              trip.tripDurationHours != null
                ? `${formatNumber(trip.tripDurationHours)} hrs`
                : "N/A"
            }
          />
        </Section>

        <Section title="Route & Trip Inputs">
          <Row
            label="Start Coordinates"
            value={
              trip.startLat != null && trip.startLon != null
                ? `${formatNumber(trip.startLat, 4)}, ${formatNumber(trip.startLon, 4)}`
                : "N/A"
            }
          />
          <Row
            label="End Coordinates"
            value={
              trip.endLat != null && trip.endLon != null
                ? `${formatNumber(trip.endLat, 4)}, ${formatNumber(trip.endLon, 4)}`
                : "N/A"
            }
          />
          <Row
            label="Predicted Distance"
            value={
              trip.predictedDistanceKm != null
                ? `${formatNumber(trip.predictedDistanceKm)} km`
                : trip.distanceKm != null
                  ? `${formatNumber(trip.distanceKm)} km`
                  : "N/A"
            }
          />
          <Row
            label="Speed"
            value={
              trip.speed != null ? `${formatNumber(trip.speed)} km/h` : "N/A"
            }
          />
          <Row
            label="Fishing Hours"
            value={
              trip.fishingHours != null
                ? `${formatNumber(trip.fishingHours)} hrs`
                : "N/A"
            }
          />
          <Row
            label="Number of Days"
            value={
              trip.numberOfDays != null
                ? `${trip.numberOfDays} day${trip.numberOfDays > 1 ? "s" : ""}`
                : "N/A"
            }
          />
          <Row
            label="Crew Count"
            value={trip.crewCount != null ? String(trip.crewCount) : "N/A"}
          />
        </Section>

        <Section title="Weather">
          <Row
            label="Wind Speed"
            value={
              trip.windSpeed != null
                ? `${formatNumber(trip.windSpeed)} km/h`
                : "N/A"
            }
          />
          <Row
            label="Wave Height"
            value={
              trip.waveHeight != null
                ? `${formatNumber(trip.waveHeight)} m`
                : "N/A"
            }
          />
          <Row
            label="Weather Severity Index"
            value={
              trip.weatherSeverityIndex != null
                ? formatNumber(trip.weatherSeverityIndex)
                : "N/A"
            }
          />
          <Row
            label="Weather Condition"
            value={trip.weatherCondition || "N/A"}
          />
        </Section>

        <Section title="Prediction Summary">
          <Row
            label="Predicted Fuel"
            value={
              trip.predictedFuelLiters != null
                ? `${formatNumber(trip.predictedFuelLiters)} L`
                : "N/A"
            }
          />
          <Row
            label="Predicted Fuel Cost"
            value={formatCurrency(trip.predictedFuelCost)}
          />
          <Row
            label="Predicted Crew Cost"
            value={formatCurrency(trip.predictedCrewCost)}
          />
          <Row
            label="Predicted Operational Cost"
            value={formatCurrency(trip.predictedOperationalCost)}
          />
          <Row
            label="Predicted External Cost Total"
            value={formatCurrency(trip.predictedExternalCostTotal)}
          />
          <Row
            label="Predicted Total Cost"
            value={formatCurrency(trip.predictedTotalCost)}
          />
          <Row
            label="Economic Stress Index"
            value={
              trip.economicStressIndex != null
                ? formatNumber(trip.economicStressIndex)
                : "N/A"
            }
          />
          <Row
            label="Profitability Probability"
            value={
              trip.profitabilityProbability != null
                ? `${formatNumber(trip.profitabilityProbability)}%`
                : "N/A"
            }
          />
          <Row
            label="CO2 Emission"
            value={
              trip.carbonEmissionKg != null
                ? `${formatNumber(trip.carbonEmissionKg)} kg`
                : "N/A"
            }
          />
          <Row
            label="CO2 per Kg Catch"
            value={
              trip.carbonPerKgCatch != null
                ? `${formatNumber(trip.carbonPerKgCatch)} kg CO2/kg`
                : "N/A"
            }
          />
        </Section>

        <Section title="Predicted External Costs">
          {trip.predictedExternalCosts &&
          trip.predictedExternalCosts.length > 0 ? (
            trip.predictedExternalCosts.map((item, index) => (
              <View
                key={`${item.name}-${index}`}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f3f4f6",
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}
                >
                  {item.name}
                </Text>
                <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  {item.category} • {formatCurrency(item.amount)}
                </Text>
                {item.description ? (
                  <Text
                    style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={{ color: "#6b7280" }}>
              No predicted external costs available.
            </Text>
          )}
        </Section>

        <Section title="Actual Results">
          <Row
            label="Actual Logged At"
            value={formatDateTime(trip.actualLoggedAt)}
          />
          <Row
            label="Actual Fuel"
            value={
              trip.actualFuelLiters != null
                ? `${formatNumber(trip.actualFuelLiters)} L`
                : "N/A"
            }
          />
          <Row
            label="Actual Catch"
            value={
              trip.actualCatchKg != null
                ? `${formatNumber(trip.actualCatchKg)} kg`
                : "N/A"
            }
          />
          <Row
            label="Actual Fuel Cost"
            value={formatCurrency(trip.actualFuelCost)}
          />
          <Row
            label="Actual Operational Cost"
            value={formatCurrency(trip.actualOperationalCost)}
          />
          <Row
            label="Actual External Cost Total"
            value={formatCurrency(trip.actualExternalCostTotal)}
          />
          <Row
            label="Actual Total Cost"
            value={formatCurrency(trip.actualTotalCost)}
          />
          <Row
            label="Actual Revenue"
            value={formatCurrency(trip.actualRevenue)}
          />
          <Row
            label="Actual Profit"
            value={formatCurrency(trip.actualProfit)}
          />
          <Row label="Actual Notes" value={trip.actualNotes || "N/A"} />
        </Section>

        <Section title="Prediction vs Actual Comparison">
          <Row
            label="Fuel Difference"
            value={
              trip.fuelDifference != null
                ? `${formatNumber(trip.fuelDifference)} L`
                : "N/A"
            }
          />
          <Row
            label="Fuel Prediction Error"
            value={
              trip.fuelPredictionError != null
                ? `${formatNumber(trip.fuelPredictionError)}%`
                : "N/A"
            }
          />
          <Row
            label="Total Cost Difference"
            value={formatCurrency(trip.totalCostDifference)}
          />
          <Row
            label="External Cost Difference"
            value={formatCurrency(trip.externalCostDifference)}
          />
          <Row
            label="Profit Difference"
            value={formatCurrency(trip.profitDifference)}
          />
        </Section>

        <Section title="Optimization Recommendations">
          {trip.optimizationRecommendations &&
          trip.optimizationRecommendations.length > 0 ? (
            trip.optimizationRecommendations.map((item, index) => (
              <View
                key={`${item}-${index}`}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <Text style={{ marginRight: 8, color: "#111827" }}>•</Text>
                <Text style={{ flex: 1, color: "#374151", lineHeight: 22 }}>
                  {item}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: "#6b7280" }}>
              No recommendations available.
            </Text>
          )}
        </Section>
      </ScrollView>

      {/* Fixed Button Container */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: "#f9fafb",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
        }}
      >
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() =>
              router.push(`/(root)/(tabs)/fishtripcost/edit-trip/${trip._id}`)
            }
            style={{
              flex: 1,
              backgroundColor: "#111827",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Edit Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleteLoading}
            style={{
              flex: 1,
              backgroundColor: "#dc2626",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              opacity: deleteLoading ? 0.7 : 1,
            }}
          >
            {deleteLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Delete Trip
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
