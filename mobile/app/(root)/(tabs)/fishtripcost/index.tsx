import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { icons } from "@/constants";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getMyTrips, getMyStats } from "@/services/tripService";
import FishTripNavBar from "./components/FishTripNavBar";

export default function FishTripCostDashboard() {
  const [activeView, setActiveView] = useState<"dashboard" | "costs">(
    "dashboard",
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    averageCost: 0,
    predictionsWithActuals: 0,
    totalFuelUsed: 0,
  });
  const [trips, setTrips] = useState<any[]>([]);

  const loadDashboardData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      // Fetch trips and stats from API
      const [tripsData, statsData] = await Promise.all([
        getMyTrips(),
        getMyStats().catch(() => null),
      ]);

      setTrips(Array.isArray(tripsData) ? tripsData : []);

      if (statsData) {
        setStats({
          totalTrips: statsData.totalTrips || 0,
          completedTrips:
            tripsData.filter((t: any) => t.status === "completed").length || 0,
          averageCost: Math.round(statsData.averageCost || 0),
          predictionsWithActuals:
            tripsData.filter((t: any) => t.actualFuelLiters != null).length ||
            0,
          totalFuelUsed: statsData.totalFuelUsed || 0,
        });
      } else {
        // Fallback calculation from trips if stats API fails
        const completed = tripsData.filter(
          (t: any) => t.status === "completed",
        ).length;
        const withActuals = tripsData.filter(
          (t: any) => t.actualFuelLiters != null,
        ).length;
        const avgCost =
          tripsData.length > 0
            ? tripsData.reduce(
                (sum: number, t: any) => sum + (t.predictedTotalCost || 0),
                0,
              ) / tripsData.length
            : 0;

        setStats({
          totalTrips: tripsData.length,
          completedTrips: completed,
          averageCost: Math.round(avgCost),
          predictionsWithActuals: withActuals,
          totalFuelUsed: 0,
        });
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData(true);
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData(false);
  };

  // Handle navigation for costs view
  useEffect(() => {
    if (activeView === "costs") {
      router.push("/(root)/(tabs)/fishtripcost/costs" as any);
      setActiveView("dashboard");
    }
  }, [activeView]);

  const quickActionTiles = [
    {
      id: "planner",
      label: "New Trip",
      icon: "add-circle",
      color: "#3b82f6",
      bgColor: "#eff6ff",
      action: () => router.push("/fishtripcost/planner" as any),
    },
    {
      id: "past-trips",
      label: "Past Trips",
      icon: "list",
      color: "#10b981",
      bgColor: "#ecfdf5",
      action: () => router.push("/fishtripcost/past-trips" as any),
    },
    {
      id: "boats",
      label: "My Boats",
      icon: "boat",
      color: "#8b5cf6",
      bgColor: "#f5f3ff",
      action: () => router.push("/fishtripcost/boats" as any),
    },
    {
      id: "learning",
      label: "Learning",
      icon: "analytics",
      color: "#f59e0b",
      bgColor: "#fef3c7",
      action: () => router.push("/fishtripcost/learning-summary" as any),
    },
    {
      id: "history",
      label: "Analytics",
      icon: "stats-chart",
      color: "#06b6d4",
      bgColor: "#ecfeff",
      action: () => router.push("/fishtripcost/history" as any),
    },
    {
      id: "costs",
      label: "Costs",
      icon: "cash",
      color: "#ef4444",
      bgColor: "#fef2f2",
      action: () => router.push("/(root)/(tabs)/fishtripcost/costs" as any),
    },
  ];

  const statCards = [
    {
      label: "Total Trips",
      value: stats.totalTrips,
      icon: "navigate",
      color: "#3b82f6",
      bgColor: "#dbeafe",
    },
    {
      label: "Completed",
      value: stats.completedTrips,
      icon: "checkmark-circle",
      color: "#10b981",
      bgColor: "#d1fae5",
    },
    {
      label: "Avg Cost",
      value:
        stats.averageCost > 0
          ? `Rs ${stats.averageCost.toLocaleString()}`
          : "Rs 0",
      icon: "cash-outline",
      color: "#f59e0b",
      bgColor: "#fef3c7",
    },
    {
      label: "With Actuals",
      value: stats.predictionsWithActuals,
      icon: "analytics",
      color: "#8b5cf6",
      bgColor: "#ede9fe",
    },
  ];

  const renderContent = () => {
    switch (activeView) {
      case "costs":
        // Navigation handled by useEffect
        return null;
      case "dashboard":
      default:
        if (loading) {
          return (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-slate-600 mt-3">Loading dashboard...</Text>
            </View>
          );
        }

        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Header */}
            <LinearGradient
              colors={["#1e40af", "#3b82f6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="px-5 pt-6 pb-8 rounded-b-3xl mb-5"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Text className="text-3xl font-bold text-white">Dashboard</Text>
              <Text className="text-sm text-blue-100 mt-2">
                DATCIE-powered trip cost intelligence
              </Text>
            </LinearGradient>

            {/* Stats Cards */}
            <View className="px-5 mb-6">
              <Text className="text-lg font-bold text-slate-900 mb-4">
                Overview
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {statCards.map((stat) => (
                  <View
                    key={stat.label}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      width: "48%",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <View className="bg-white p-4">
                      <View
                        className="rounded-full w-12 h-12 items-center justify-center mb-3"
                        style={{ backgroundColor: stat.bgColor }}
                      >
                        <Ionicons
                          name={stat.icon as any}
                          size={24}
                          color={stat.color}
                        />
                      </View>
                      <Text className="text-xs text-slate-600 mb-1 font-medium">
                        {stat.label}
                      </Text>
                      <Text className="text-2xl font-bold text-slate-900">
                        {stat.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Quick Action Tiles */}
            <View className="px-5 pb-8">
              <Text className="text-lg font-bold text-slate-900 mb-4">
                Quick Actions
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {quickActionTiles.map((tile) => (
                  <TouchableOpacity
                    key={tile.id}
                    onPress={tile.action}
                    activeOpacity={0.7}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      width: "31%",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <View className="bg-white p-4 items-center">
                      <View
                        className="rounded-2xl w-14 h-14 items-center justify-center mb-3"
                        style={{ backgroundColor: tile.bgColor }}
                      >
                        <Ionicons
                          name={tile.icon as any}
                          size={28}
                          color={tile.color}
                        />
                      </View>
                      <Text className="text-xs text-slate-900 font-semibold text-center">
                        {tile.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Recent Activity */}
            {trips.length > 0 && (
              <View className="px-5 pb-6">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-bold text-slate-900">
                    Recent Trips
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      router.push("/fishtripcost/past-trips" as any)
                    }
                  >
                    <Text className="text-sm text-blue-600 font-semibold">
                      See All
                    </Text>
                  </TouchableOpacity>
                </View>
                {trips.slice(0, 3).map((trip: any) => (
                  <TouchableOpacity
                    key={trip._id}
                    onPress={() =>
                      router.push(
                        `/fishtripcost/trip-details/${trip._id}` as any,
                      )
                    }
                    className="bg-white rounded-xl p-4 mb-3"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.06,
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-slate-900">
                          Trip {trip._id.slice(0, 8)}...
                        </Text>
                        <Text className="text-xs text-slate-600 mt-1">
                          {new Date(trip.departureTime).toLocaleDateString()}
                        </Text>
                      </View>
                      <View
                        className="px-3 py-1 rounded-full"
                        style={{
                          backgroundColor:
                            trip.status === "completed" ? "#d1fae5" : "#dbeafe",
                        }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{
                            color:
                              trip.status === "completed"
                                ? "#10b981"
                                : "#3b82f6",
                          }}
                        >
                          {trip.status || "planned"}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row gap-4 mt-3">
                      <Text className="text-xs text-slate-600">
                        💰 Rs {(trip.predictedTotalCost || 0).toLocaleString()}
                      </Text>
                      <Text className="text-xs text-slate-600">
                        ⛽ {(trip.predictedFuelLiters || 0).toFixed(1)}L
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <FishTripNavBar />
      <View className="flex-1">{renderContent()}</View>
    </SafeAreaView>
  );
}
