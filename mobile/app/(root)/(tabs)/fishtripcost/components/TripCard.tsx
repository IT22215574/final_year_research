import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ExternalCostItem = {
  name: string;
  category: string;
  amount: number;
  source?: "manual" | "preference";
  description?: string;
};

export type TripCardTrip = {
  _id: string;
  boatId?: string;
  departureTime: string;
  returnTime: string;
  tripDurationHours?: number;
  predictedFuelLiters?: number;
  predictedTotalCost?: number;
  predictedDistanceKm?: number;
  actualFuelLiters?: number;
  actualTotalCost?: number;
  actualLoggedAt?: string;
  riskCategory?: "low" | "medium" | "high";
  mode?: "island" | "international";
  status?: "planned" | "completed" | "cancelled";
  createdAt?: string;
  updatedAt?: string;
  predictedExternalCosts?: ExternalCostItem[];
  actualExternalCosts?: ExternalCostItem[];
};

type Props = {
  trip: TripCardTrip;
  onPress?: () => void;
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

export default function TripCard({ trip, onPress }: Props) {
  const isCompleted = trip.status === "completed";

  const displayCost =
    isCompleted && trip.actualTotalCost != null
      ? trip.actualTotalCost
      : trip.predictedTotalCost;

  const displayFuel =
    isCompleted && trip.actualFuelLiters != null
      ? trip.actualFuelLiters
      : trip.predictedFuelLiters;

  const displayDistance = trip.predictedDistanceKm;
  const duration = trip.tripDurationHours;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#e5e7eb",
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
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}>
            Trip {getShortId(trip._id)}
          </Text>
          <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Boat ID: {trip.boatId ? getShortId(trip.boatId) : "Not assigned"}
          </Text>
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
            {formatCurrency(displayCost)}
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
            {displayFuel != null ? `${formatNumber(displayFuel)} L` : "N/A"}
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
            {displayDistance != null ? `${formatNumber(displayDistance)} km` : "N/A"}
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
          Duration: {duration != null ? `${formatNumber(duration)} hrs` : "N/A"}
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
}
