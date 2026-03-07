// mobile/app/(root)/(tabs)/fishtripcost/components/TripSummaryCard.tsx
import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  tripId?: string;
  boatName?: string;
  departureTime?: string;
  returnTime?: string;
  distance?: number;
  duration?: number;
  status?: "planned" | "completed" | "cancelled";
  mode?: "island" | "international";
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-LK", {
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
      return "bg-emerald-50 border-emerald-200 text-emerald-700";
    case "planned":
      return "bg-blue-50 border-blue-200 text-blue-700";
    case "cancelled":
      return "bg-rose-50 border-rose-200 text-rose-700";
    default:
      return "bg-slate-50 border-slate-200 text-slate-700";
  }
};

export default function TripSummaryCard({
  tripId,
  boatName,
  departureTime,
  returnTime,
  distance,
  duration,
  status,
  mode,
}: Props) {
  const statusColor = getStatusColor(status);

  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      {/* Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-800">
            {boatName || "Trip Summary"}
          </Text>
          {tripId && (
            <Text className="text-xs text-slate-400 mt-1">
              ID: {tripId.slice(-8)}
            </Text>
          )}
        </View>
        {status && (
          <View className={`border rounded-full px-3 py-1 ${statusColor}`}>
            <Text className={`text-xs font-semibold capitalize ${statusColor}`}>
              {status}
            </Text>
          </View>
        )}
      </View>

      {/* Trip Details */}
      <View className="gap-2">
        {/* Departure */}
        <View className="flex-row items-center gap-2">
          <View className="bg-blue-50 rounded-lg p-2">
            <Ionicons name="calendar" size={16} color="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-slate-500">Departure</Text>
            <Text className="text-sm font-medium text-slate-800">
              {formatDateTime(departureTime)}
            </Text>
          </View>
        </View>

        {/* Return */}
        <View className="flex-row items-center gap-2">
          <View className="bg-emerald-50 rounded-lg p-2">
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-slate-500">Return</Text>
            <Text className="text-sm font-medium text-slate-800">
              {formatDateTime(returnTime)}
            </Text>
          </View>
        </View>

        {/* Distance & Duration */}
        <View className="flex-row gap-2 mt-2">
          {typeof distance === "number" && (
            <View className="flex-1 bg-slate-50 rounded-xl p-3">
              <Text className="text-xs text-slate-500 mb-1">Distance</Text>
              <Text className="text-lg font-bold text-slate-800">
                {distance.toFixed(1)} km
              </Text>
            </View>
          )}
          {typeof duration === "number" && (
            <View className="flex-1 bg-slate-50 rounded-xl p-3">
              <Text className="text-xs text-slate-500 mb-1">Duration</Text>
              <Text className="text-lg font-bold text-slate-800">
                {duration.toFixed(1)} hrs
              </Text>
            </View>
          )}
          {mode && (
            <View className="flex-1 bg-slate-50 rounded-xl p-3">
              <Text className="text-xs text-slate-500 mb-1">Mode</Text>
              <Text className="text-sm font-bold text-slate-800 capitalize">
                {mode}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
