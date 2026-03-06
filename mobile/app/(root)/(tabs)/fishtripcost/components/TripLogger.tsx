/* eslint-disable prettier/prettier */
import React, { useEffect, useState } from "react";
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

  // If you store lastSavedTripId in store (recommended)
  const lastSavedTripId = useTripStore((state: any) => state.lastSavedTripId);

  const [refreshing, setRefreshing] = useState(false);

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

  const refresh = async () => {
    try {
      setRefreshing(true);
      const data = await getMyStats();
      setStats(data);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to refresh statistics");
    } finally {
      setRefreshing(false);
    }
  };

  // ===== DATCIE navigation =====
  // Planner -> Predict -> Result screen -> Save -> then Log Actual screen

  const goToResult = () => {
    // your result.tsx should show prediction + a "Save Trip" button that calls predict-and-save
    router.push("/(root)/(tabs)/fishtripcost/result");
  };

  const goToLogActual = () => {
    // log-actual.tsx should log actual fuel/catch using the saved tripId
    router.push("/(root)/(tabs)/fishtripcost/log-actual");
  };

  const goToPrevTrips = () => {
    // if you have a proper prevTrip page under fishtripcost, route there
    // (Your current path points to components, which is not a route)
    // If you have a screen for previous trips, adjust path accordingly.
    router.push("/(root)/(tabs)/fishtripcost"); 
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
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-bold text-slate-800">
          Trip Logger (DATCIE)
        </Text>
        <TouchableOpacity
          onPress={refresh}
          className="bg-white border border-slate-200 px-3 py-2 rounded-xl"
          activeOpacity={0.7}
        >
          <Text className="text-slate-700 font-semibold">
            {refreshing ? "⏳" : "↻"} Refresh
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap justify-between">
        <StatCard label="Total Trips" value={stats?.totalTrips ?? 0} />
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

      {/* DATCIE Flow Buttons */}
      <View className="mt-8">
        <Text className="text-slate-500 text-xs mb-2">
          Research Flow: Predict → Save → Log Actual → Learning Update
        </Text>

        <ActionButton
          title="⚡ Predict & View Result"
          onPress={goToResult}
        />

        <ActionButton
          title="✅ Log Actual (Fuel & Catch)"
          onPress={() => {
            // If you don't have lastSavedTripId store yet, still allow navigation
            // but warn user
            if (!lastSavedTripId) {
              Alert.alert(
                "Trip not saved yet",
                "First go to Result and Save the trip (predict-and-save). Then log actual."
              );
              return;
            }
            goToLogActual();
          }}
        />

        <ActionButton
          title="📋 View Trips / History"
          onPress={goToPrevTrips}
        />

        <ActionButton
          title="📤 Export Training Data"
          onPress={() =>
            Alert.alert(
              "Next Step",
              "We will wire export endpoint (analytics/export-fuel-training-csv) after confirming your backend route name."
            )
          }
          isLast
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
      <Text className="text-xl font-bold text-slate-800 mt-2">{value}</Text>
    </View>
  );
};

const ActionButton = ({
  title,
  onPress,
  isLast = false,
}: {
  title: string;
  onPress: () => void;
  isLast?: boolean;
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`bg-blue-600 p-4 rounded-2xl items-center ${
        !isLast ? "mb-3" : ""
      }`}
      activeOpacity={0.8}
    >
      <Text className="text-white font-bold text-base">{title}</Text>
    </TouchableOpacity>
  );
};

export default TripLogger;