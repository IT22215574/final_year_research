import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getMyTrips, getMyStats } from "@/services/tripService";
import { DashboardStats, Trip } from "@/types/trip";
import FishTripNavBar from "./components/FishTripNavBar";
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const STAT_CARD_WIDTH = (width - 48) / 2;
const ACTION_TILE_WIDTH = (width - 60) / 3;

const DEFAULT_STATS: DashboardStats = {
  totalTrips: 0,
  completedTrips: 0,
  predictionsWithActuals: 0,
  fuelAccuracyRate: 0,
  costAccuracyRate: 0,
  averagePredictedCost: 0,
  averageActualCost: 0,
  averageFuelErrorPercent: 0,
  averageCostErrorPercent: 0,
  totalPredictedFuel: 0,
  totalActualFuel: 0,
  totalFuelVariance: 0,
  totalPredictedCost: 0,
  totalActualCost: 0,
  totalCostVariance: 0,
  totalFuelUsed: 0,
  totalDistance: 0,
};

export default function FishTripCostDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState("Good morning");
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [trips, setTrips] = useState<Trip[]>([]);

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    headerOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });
    headerTranslateY.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    });
  }, [headerOpacity, headerTranslateY]);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const normalizeStats = (
    statsData: any,
    tripsData: Trip[] = [],
  ): DashboardStats => {
    if (statsData?.fuelAccuracyRate !== undefined) {
      return {
        ...DEFAULT_STATS,
        ...statsData,
      };
    }

    const tripsArray = Array.isArray(tripsData) ? tripsData : [];

    const completedTrips = tripsArray.filter(
      (t: any) => t.status === "completed",
    ).length;

    const withActuals = tripsArray.filter(
      (t: any) =>
        t.actualFuelLiters != null && t.predictedFuelLiters != null,
    ).length;

    const accurateFuelPredictions = tripsArray.filter((t: any) => {
      if (
        t.actualFuelLiters == null ||
        t.predictedFuelLiters == null ||
        t.predictedFuelLiters === 0
      ) {
        return false;
      }

      const errorPercent =
        (Math.abs(t.actualFuelLiters - t.predictedFuelLiters) /
          t.predictedFuelLiters) *
        100;

      return errorPercent <= 15;
    }).length;

    const fuelAccuracyRate =
      withActuals > 0
        ? Math.round((accurateFuelPredictions / withActuals) * 100)
        : 0;

    const totalFuelVariance = tripsArray.reduce((sum: number, t: any) => {
      if (t.actualFuelLiters != null && t.predictedFuelLiters != null) {
        return sum + (t.actualFuelLiters - t.predictedFuelLiters);
      }
      return sum;
    }, 0);

    const totalPredictedFuel = tripsArray.reduce((sum: number, t: any) => {
      return sum + Number(t.predictedFuelLiters ?? 0);
    }, 0);

    const totalActualFuel = tripsArray.reduce((sum: number, t: any) => {
      return sum + Number(t.actualFuelLiters ?? 0);
    }, 0);

    const totalPredictedCost = tripsArray.reduce((sum: number, t: any) => {
      return sum + Number(t.predictedTotalCost ?? t.predictedCost ?? 0);
    }, 0);

    const totalActualCost = tripsArray.reduce((sum: number, t: any) => {
      return sum + Number(t.actualTotalCost ?? t.actualCost ?? 0);
    }, 0);

    const averagePredictedCost =
      tripsArray.length > 0 ? totalPredictedCost / tripsArray.length : 0;

    const averageActualCost =
      completedTrips > 0 ? totalActualCost / completedTrips : 0;

    return {
      totalTrips: Number(statsData?.totalTrips ?? tripsArray.length),
      completedTrips,
      predictionsWithActuals: withActuals,
      fuelAccuracyRate,
      costAccuracyRate: Number(statsData?.costAccuracyRate ?? 0),
      averagePredictedCost: Number(
        statsData?.averagePredictedCost ??
          statsData?.averageCost ??
          averagePredictedCost,
      ),
      averageActualCost: Number(
        statsData?.averageActualCost ??
          statsData?.averageCost ??
          averageActualCost,
      ),
      averageFuelErrorPercent: Number(
        statsData?.averageFuelErrorPercent ?? 0,
      ),
      averageCostErrorPercent: Number(
        statsData?.averageCostErrorPercent ?? 0,
      ),
      totalPredictedFuel: Number(
        statsData?.totalPredictedFuel ?? totalPredictedFuel,
      ),
      totalActualFuel: Number(
        statsData?.totalActualFuel ??
          statsData?.totalFuelUsed ??
          totalActualFuel,
      ),
      totalFuelVariance: Math.round(totalFuelVariance * 10) / 10,
      totalPredictedCost: Number(
        statsData?.totalPredictedCost ?? totalPredictedCost,
      ),
      totalActualCost: Number(statsData?.totalActualCost ?? totalActualCost),
      totalCostVariance: Number(
        statsData?.totalCostVariance ?? totalActualCost - totalPredictedCost,
      ),
      totalFuelUsed: Number(
        statsData?.totalFuelUsed ?? statsData?.totalActualFuel ?? totalActualFuel,
      ),
      totalDistance: Number(statsData?.totalDistance ?? 0),
    };
  };

  const loadDashboardData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [tripsData, statsData] = await Promise.all([
        getMyTrips(),
        getMyStats(),
      ]);

      const tripsArray = Array.isArray(tripsData) ? tripsData : [];
      setTrips(tripsArray);

      const normalized = normalizeStats(statsData, tripsArray);
      setStats(normalized);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setTrips([]);
      setStats(DEFAULT_STATS);
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

  const totalFuelSaved = useMemo(() => {
    return Math.round(
      trips.reduce((sum: number, t: any) => {
        if (t.actualFuelLiters != null && t.predictedFuelLiters != null) {
          return sum + Math.max(0, t.predictedFuelLiters - t.actualFuelLiters);
        }
        return sum;
      }, 0) * 10,
    ) / 10;
  }, [trips]);

  const normalizedFuelMetrics = (stats as any)?.normalizedFuelMetrics;

  const quickActionTiles = [
    {
      id: "planner",
      label: "New Trip",
      icon: "add-circle",
      iconSet: Ionicons,
      color: "#3b82f6",
      gradient: ["#3b82f6", "#2563eb"] as const,
      action: () => router.push("/(root)/(tabs)/fishtripcost" as any),
    },
    {
      id: "past-trips",
      label: "Past Trips",
      icon: "list",
      iconSet: Ionicons,
      color: "#10b981",
      gradient: ["#10b981", "#059669"] as const,
      action: () => router.push("/fishtripcost/past-trips" as any),
    },
    {
      id: "boats",
      label: "My Boats",
      icon: "boat",
      iconSet: Ionicons,
      color: "#8b5cf6",
      gradient: ["#8b5cf6", "#7c3aed"] as const,
      action: () => router.push("/(root)/(tabs)/fishtripcost/boats" as any),
    },
    {
      id: "learning",
      label: "AI Insights",
      icon: "analytics",
      iconSet: Ionicons,
      color: "#f59e0b",
      gradient: ["#f59e0b", "#d97706"] as const,
      action: () => router.push("/fishtripcost/learning-summary" as any),
    },
    {
      id: "history",
      label: "Analytics",
      icon: "stats-chart",
      iconSet: Ionicons,
      color: "#06b6d4",
      gradient: ["#06b6d4", "#0891b2"] as const,
      action: () => router.push("/fishtripcost/history" as any),
    },
    {
      id: "costs",
      label: "Costs",
      icon: "cash",
      iconSet: Ionicons,
      color: "#ef4444",
      gradient: ["#ef4444", "#dc2626"] as const,
      action: () => router.push("/(root)/(tabs)/fishtripcost/costs" as any),
    },
  ];

  const statCards = [
    {
      label: "Total Trips",
      value: Number(stats.totalTrips ?? 0),
      icon: "navigate",
      iconSet: Ionicons,
      color: "#3b82f6",
      bgColor: "#dbeafe",
      format: "number" as const,
    },
    {
      label: "Completed",
      value: Number(stats.completedTrips ?? 0),
      icon: "checkmark-circle",
      iconSet: Ionicons,
      color: "#10b981",
      bgColor: "#d1fae5",
      format: "number" as const,
    },
    {
      label: "Avg Cost",
      value: Number(stats.averageActualCost ?? stats.averagePredictedCost ?? 0),
      icon: "cash-outline",
      iconSet: Ionicons,
      color: "#f59e0b",
      bgColor: "#fef3c7",
      format: "currency" as const,
    },
    {
      label: "Fuel Accuracy",
      value: Number(stats.fuelAccuracyRate ?? 0),
      icon: "analytics",
      iconSet: Ionicons,
      color: "#8b5cf6",
      bgColor: "#ede9fe",
      format: "percent" as const,
    },
  ];

  const formatValue = (
    value: number,
    format: "number" | "currency" | "percent",
  ) => {
    const safeValue = Number(value ?? 0);

    if (format === "currency") return `Rs ${Math.round(safeValue).toLocaleString()}`;
    if (format === "percent") return `${safeValue}%`;
    return safeValue.toString();
  };

  const totalFuelVariance = Number(stats.totalFuelVariance ?? 0);
  const predictionsWithActuals = Number(stats.predictionsWithActuals ?? 0);
  const fuelAccuracyRate = Number(stats.fuelAccuracyRate ?? 0);

  const renderContent = () => {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center bg-slate-50">
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <View className="items-center rounded-3xl bg-white p-8 shadow-xl">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="mt-4 font-medium text-slate-600">
                Loading your dashboard...
              </Text>
              <Text className="mt-2 text-sm text-slate-400">
                Preparing your fishing insights
              </Text>
            </View>
          </Animated.View>
        </View>
      );
    }

    return (
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={["#3b82f6"]}
          />
        }
      >
        <LinearGradient
          colors={["#1e40af", "#3b82f6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: 18,
            paddingHorizontal: 20,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
          }}
        >
          <Animated.View style={headerAnimatedStyle}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="mb-1 text-sm font-medium text-blue-100">
                  {greeting}
                </Text>
                <Text className="text-2xl font-bold text-white">
                  Dashboard
                </Text>
              </View>

              <TouchableOpacity
                className="rounded-full bg-white/20 p-2"
                activeOpacity={0.7}
                onPress={() => router.push("/profile" as any)}
              >
                <Ionicons name="person-circle" size={32} color="white" />
              </TouchableOpacity>
            </View>

            <Text className="mt-2 text-sm text-blue-100">
              DATCIE-powered trip cost intelligence
            </Text>
          </Animated.View>
        </LinearGradient>

        <View className="mb-6 -mt-4 px-5">
          <View className="flex-row justify-between rounded-2xl bg-white p-4 shadow-lg">
            <View className="flex-1 items-center">
              <Text className="text-xl font-bold text-slate-900">
                {Number(stats.totalTrips ?? 0)}
              </Text>
              <Text className="mt-1 text-xs text-slate-500">Trips</Text>
            </View>

            <View className="w-px bg-slate-200" />

            <View className="flex-1 items-center">
              <Text className="text-xl font-bold text-slate-900">
                {fuelAccuracyRate}%
              </Text>
              <Text className="mt-1 text-xs text-slate-500">
                Fuel Accuracy
              </Text>
            </View>

            <View className="w-px bg-slate-200" />

            <View className="flex-1 items-center">
              <Text className="text-xl font-bold text-slate-900">
                {totalFuelVariance > 0 ? "+" : ""}
                {Number(totalFuelVariance).toFixed(1)}L
              </Text>
              <Text className="mt-1 text-xs text-slate-500">Variance</Text>
            </View>
          </View>

          {stats.predictionsWithActuals > 0 &&
            stats.completedTrips > stats.predictionsWithActuals && (
              <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <View className="flex-row items-center">
                  <Ionicons
                    name="information-circle"
                    size={18}
                    color="#f59e0b"
                  />
                  <Text className="ml-2 text-xs font-medium text-amber-800">
                    Data Quality Filter Active
                  </Text>
                </View>
                <Text className="mt-1 text-xs text-amber-700">
                  {stats.completedTrips - stats.predictionsWithActuals} trips
                  excluded due to invalid or extreme outlier data.
                </Text>
              </View>
            )}
        </View>

        <View className="mb-6 px-5">
          <Text className="mb-4 text-lg font-bold text-slate-900">
            Overview
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {statCards.map((stat, index) => (
              <Animated.View
                key={stat.label}
                entering={FadeInDown.delay(index * 100).springify()}
                style={{ width: STAT_CARD_WIDTH }}
              >
                <View
                  className="mb-3 rounded-2xl bg-white p-4"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <View
                    className="mb-3 h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: stat.bgColor }}
                  >
                    <stat.iconSet
                      name={stat.icon as any}
                      size={20}
                      color={stat.color}
                    />
                  </View>

                  <Text className="mb-1 text-xs text-slate-500">
                    {stat.label}
                  </Text>

                  <Text className="text-xl font-bold text-slate-900">
                    {formatValue(stat.value, stat.format)}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        {normalizedFuelMetrics && predictionsWithActuals > 0 ? (
          <Animated.View entering={FadeInDown.delay(250)} className="mx-5 mb-6">
            <View
              className="rounded-2xl bg-white p-5"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="mb-4 flex-row items-center justify-between">
                <View>
                  <Text className="text-lg font-bold text-slate-900">
                    Fleet Performance
                  </Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    Normalized fuel performance by boat baseline
                  </Text>
                </View>

                <View
                  className={`rounded-full px-3 py-1 ${
                    normalizedFuelMetrics.overallVarianceRating === "excellent"
                      ? "bg-emerald-100"
                      : normalizedFuelMetrics.overallVarianceRating === "good"
                        ? "bg-blue-100"
                        : normalizedFuelMetrics.overallVarianceRating === "fair"
                          ? "bg-amber-100"
                          : "bg-red-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      normalizedFuelMetrics.overallVarianceRating === "excellent"
                        ? "text-emerald-700"
                        : normalizedFuelMetrics.overallVarianceRating === "good"
                          ? "text-blue-700"
                          : normalizedFuelMetrics.overallVarianceRating === "fair"
                            ? "text-amber-700"
                            : "text-red-700"
                    }`}
                  >
                    {String(
                      normalizedFuelMetrics.overallVarianceRating ?? "unknown",
                    ).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View className="mb-4 flex-row items-center justify-between rounded-xl bg-blue-50 p-3">
                <View className="flex-1">
                  <Text className="text-xs text-slate-600">
                    Fleet Efficiency
                  </Text>
                  <Text className="text-xl font-bold text-blue-600">
                    {Number(
                      normalizedFuelMetrics.averageEfficiencyScore ?? 0,
                    ).toFixed(0)}
                    /100
                  </Text>
                </View>

                <View className="h-10 w-px bg-slate-200" />

                <View className="flex-1 items-center">
                  <Text className="text-xs text-slate-600">Avg Variance</Text>
                  <Text
                    className={`text-xl font-bold ${
                      Math.abs(
                        Number(
                          normalizedFuelMetrics.averageNormalizedVariancePercent ??
                            0,
                        ),
                      ) <= 15
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {Number(
                      normalizedFuelMetrics.averageNormalizedVariancePercent ?? 0,
                    ) > 0
                      ? "+"
                      : ""}
                    {Number(
                      normalizedFuelMetrics.averageNormalizedVariancePercent ?? 0,
                    ).toFixed(1)}
                    %
                  </Text>
                </View>

                <View className="h-10 w-px bg-slate-200" />

                <View className="flex-1 items-end">
                  <Text className="text-xs text-slate-600">Total Fuel</Text>
                  <Text className="text-xl font-bold text-slate-700">
                    {Number(stats.totalActualFuel ?? 0).toFixed(0)}L
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start border-t border-slate-100 pt-3">
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color="#64748b"
                />
                <Text className="ml-1.5 flex-1 text-xs text-slate-500">
                  Performance is compared to boat type baselines. Efficiency
                  shows fuel usage versus expected behavior, and variance shows
                  deviation from the normalized baseline.
                </Text>
              </View>
            </View>
          </Animated.View>
        ) : (
          <View className="mx-5 mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <View className="mb-2 flex-row items-center">
              <Ionicons name="bug" size={18} color="#f59e0b" />
              <Text className="ml-2 font-bold text-amber-900">
                Boat Type Card Debug Info
              </Text>
            </View>

            <Text className="mb-1 text-xs text-amber-800">
              The Boat Type Performance card requires:
            </Text>

            <View className="ml-2">
              <Text className="text-xs text-amber-700">
                {predictionsWithActuals > 0 ? "✅" : "❌"} Trips with actual
                data: {predictionsWithActuals}
              </Text>
              <Text className="text-xs text-amber-700">
                {normalizedFuelMetrics ? "✅" : "❌"} Backend normalized metrics:{" "}
                {normalizedFuelMetrics ? "Yes" : "No"}
              </Text>
              {normalizedFuelMetrics && (
                <Text className="text-xs text-amber-700">
                  {Object.keys(
                    normalizedFuelMetrics.boatTypeBreakdown || {},
                  ).length > 0
                    ? "✅"
                    : "❌"}{" "}
                  Boat types:{" "}
                  {Object.keys(
                    normalizedFuelMetrics.boatTypeBreakdown || {},
                  ).length}
                </Text>
              )}
            </View>

            <Text className="mt-2 text-xs text-amber-600">
              {predictionsWithActuals === 0
                ? "→ Log actual data for completed trips to see this card"
                : !normalizedFuelMetrics
                  ? "→ Restart backend to get normalized metrics"
                  : "→ Need trips with boat type information"}
            </Text>
          </View>
        )}

        {totalFuelSaved > 0 && (
          <Animated.View entering={SlideInRight.delay(400)} className="mx-5 mb-6">
            <LinearGradient
              colors={["#10b981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-2xl p-5"
              style={{
                shadowColor: "#10b981",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="mb-2 flex-row items-center">
                    <MaterialCommunityIcons
                      name="fuel"
                      size={20}
                      color="white"
                    />
                    <Text className="ml-2 font-semibold text-white">
                      Fuel Efficiency
                    </Text>
                  </View>

                  <Text className="text-2xl font-bold text-white">
                    {totalFuelSaved}L
                  </Text>
                  <Text className="mt-1 text-xs text-emerald-100">
                    Total fuel saved compared to predictions
                  </Text>
                </View>

                <View className="rounded-full bg-white/20 p-3">
                  <MaterialCommunityIcons
                    name="leaf"
                    size={28}
                    color="white"
                  />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        <View className="px-5 pb-2">
          <Text className="mb-4 text-lg font-bold text-slate-900">
            Quick Actions
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {quickActionTiles.map((tile, index) => (
              <Animated.View
                key={tile.id}
                entering={FadeInUp.delay(200 + index * 50).springify()}
                style={{ width: ACTION_TILE_WIDTH }}
              >
                <TouchableOpacity
                  onPress={tile.action}
                  activeOpacity={0.7}
                  className="mb-3"
                >
                  <LinearGradient
                    colors={tile.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="items-center rounded-2xl p-4"
                    style={{
                      shadowColor: tile.color,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                      elevation: 4,
                    }}
                  >
                    <View className="mb-2 rounded-xl bg-white/20 p-3">
                      <tile.iconSet
                        name={tile.icon as any}
                        size={24}
                        color="white"
                      />
                    </View>
                    <Text className="text-center text-xs font-semibold text-white">
                      {tile.label}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>

        {trips.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(500)} className="px-5 pb-8">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-bold text-slate-900">
                  Recent Trips
                </Text>
                <Text className="text-xs text-slate-400">
                  Your latest fishing expeditions
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push("/fishtripcost/past-trips" as any)}
                className="rounded-full bg-blue-50 px-4 py-2"
              >
                <Text className="text-xs font-semibold text-blue-700">
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            {trips.slice(0, 3).map((trip: any, index) => {
              const statusColor =
                trip.status === "completed"
                  ? { bg: "#d1fae5", text: "#10b981" }
                  : trip.status === "in-progress"
                    ? { bg: "#fef3c7", text: "#f59e0b" }
                    : { bg: "#dbeafe", text: "#3b82f6" };

              return (
                <Animated.View
                  key={String(trip._id ?? index)}
                  entering={FadeInUp.delay(600 + index * 100).springify()}
                >
                  <TouchableOpacity
                    onPress={() =>
                      router.push(
                        `/fishtripcost/trip-details/${trip._id}` as any,
                      )
                    }
                    className="mb-3 rounded-xl bg-white p-4"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06,
                      shadowRadius: 6,
                      elevation: 3,
                    }}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <View className="mb-2 flex-row items-center">
                          <MaterialCommunityIcons
                            name="fish"
                            size={16}
                            color="#3b82f6"
                          />
                          <Text className="ml-2 text-sm font-bold text-slate-900">
                            Trip {String(trip._id ?? "------").slice(-6)}
                          </Text>
                        </View>

                        <View className="mb-2 flex-row items-center">
                          <Ionicons
                            name="calendar-outline"
                            size={12}
                            color="#94a3b8"
                          />
                          <Text className="ml-1 text-xs text-slate-500">
                            {trip.departureTime
                              ? new Date(trip.departureTime).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )
                              : "No date"}
                          </Text>
                        </View>

                        <View className="flex-row gap-3">
                          <View className="flex-row items-center">
                            <Ionicons
                              name="cash-outline"
                              size={12}
                              color="#f59e0b"
                            />
                            <Text className="ml-1 text-xs text-slate-600">
                              Rs{" "}
                              {Number(
                                trip.predictedTotalCost ??
                                  trip.predictedCost ??
                                  0,
                              ).toLocaleString()}
                            </Text>
                          </View>

                          <View className="flex-row items-center">
                            <MaterialCommunityIcons
                              name="fuel"
                              size={12}
                              color="#3b82f6"
                            />
                            <Text className="ml-1 text-xs text-slate-600">
                              {Number(trip.predictedFuelLiters ?? 0).toFixed(1)}L
                            </Text>
                          </View>
                        </View>

                        {trip.status === "in-progress" && (
                          <View className="mt-3">
                            <View className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <View
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: "45%" }}
                              />
                            </View>
                            <Text className="mt-1 text-xs text-slate-400">
                              45% complete
                            </Text>
                          </View>
                        )}
                      </View>

                      <View
                        className="rounded-full px-3 py-1"
                        style={{ backgroundColor: statusColor.bg }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: statusColor.text }}
                        >
                          {trip.status || "planned"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInUp} className="items-center px-5 pb-8">
            <View className="w-full items-center rounded-3xl bg-white p-8">
              <MaterialCommunityIcons
                name="fish"
                size={64}
                color="#cbd5e1"
              />
              <Text className="mt-4 text-lg font-bold text-slate-800">
                No trips yet
              </Text>
              <Text className="mt-2 text-center text-sm text-slate-400">
                Start planning your first fishing trip{"\n"}
                with AI-powered cost predictions
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(root)/(tabs)/fishtripcost" as any)}
                className="mt-6 rounded-full bg-blue-500 px-6 py-3"
              >
                <Text className="font-semibold text-white">
                  Plan Your First Trip
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </Animated.ScrollView>
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />
      <SafeAreaView className="flex-1 bg-slate-50">
        <FishTripNavBar />
        <View className="flex-1">{renderContent()}</View>
      </SafeAreaView>
    </>
  );
}