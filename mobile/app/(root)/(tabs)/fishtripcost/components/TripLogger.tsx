/* eslint-disable prettier/prettier */
import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { getMyStats } from "@/services/tripService";
import useTripStore from "@/stores/tripStore";

const TripLogger = () => {
  const router = useRouter();

  const stats = useTripStore((state) => state.stats);
  const setStats = useTripStore((state) => state.setStats);
  const loading = useTripStore((state) => state.loading);
  const setLoading = useTripStore((state) => state.setLoading);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getMyStats();
      setStats(data);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to fetch statistics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100 p-4">
      {/* Header */}
      <Text className="text-2xl font-bold text-slate-800 mb-6">
        My Trip Statistics
      </Text>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap justify-between">
        <StatCard
          label="Total Trips"
          value={stats?.totalTrips ?? 0}
        />
        <StatCard
          label="Total Cost (Rs)"
          value={`Rs. ${stats?.totalCost?.toFixed(2) ?? "0.00"}`}
        />
        <StatCard
          label="Average Cost"
          value={`Rs. ${stats?.averageCost?.toFixed(2) ?? "0.00"}`}
        />
        <StatCard
          label="Total Fuel (L)"
          value={stats?.totalFuelUsed?.toFixed(2) ?? "0.00"}
        />
        <StatCard
          label="Total Distance (km)"
          value={stats?.totalDistance?.toFixed(2) ?? "0.00"}
        />
      </View>

      {/* Action Buttons */}
      <View className="mt-8 space-y-3">
        <ActionButton
          title="➕ Log New Trip"
          onPress={() => router.push("/(root)/(tabs)/fishtripcost/components/NewTrip")}
        />

        <ActionButton
          title="📋 View All Trips"
          onPress={() => router.push("/(root)/(tabs)/fishtripcost/components/prevTrip")}
        />

        <ActionButton
          title="📤 Export Data"
          onPress={() =>
            Alert.alert("Coming Soon", "Export feature will be added soon.")
          }
        />
      </View>
    </View>
  );
};

/* ============================= */
/* Reusable Components */
/* ============================= */

const StatCard = ({ label, value }: { label: string; value: any }) => {
  return (
    <View className="bg-white w-[48%] p-4 rounded-2xl shadow-sm mb-4">
      <Text className="text-gray-500 text-xs">{label}</Text>
      <Text className="text-xl font-bold text-slate-800 mt-2">
        {value}
      </Text>
    </View>
  );
};

const ActionButton = ({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-blue-600 p-4 rounded-2xl items-center"
    >
      <Text className="text-white font-bold text-base">{title}</Text>
    </TouchableOpacity>
  );
};

export default TripLogger;