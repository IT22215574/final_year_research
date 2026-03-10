import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
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
  interpolate,
  Extrapolate,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const STAT_CARD_WIDTH = (width - 48) / 2;

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
  const [activeView, setActiveView] = useState<"dashboard" | "planner">(
    "dashboard",
  );
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

  /**
   * Temporary adapter: Converts old backend stats format to new DashboardStats format
   * AND calculates metrics from trips if backend hasn't been updated yet
   * 
   * Remove this once backend TripMetricsService is implemented!
   */
  const normalizeStats = (
    statsData: any, // Old backend format
    tripsData: Trip[] = []
  ): DashboardStats => {
    // If backend already returns new format, use it directly
    if (statsData?.fuelAccuracyRate !== undefined) {
      return {
        ...DEFAULT_STATS,
        ...statsData,
      };
    }

    // Otherwise, adapt old format + calculate from trips
    const tripsArray = Array.isArray(tripsData) ? tripsData : [];
    
    // Calculate completed trips
    const completedTrips = tripsArray.filter(t => t.status === 'completed').length;
    
    // Calculate predictions with actuals
    const withActuals = tripsArray.filter(t => 
      t.actualFuelLiters != null && t.predictedFuelLiters != null
    ).length;
    
    // Calculate fuel accuracy rate
    const accurateFuelPredictions = tripsArray.filter(t => {
      if (t.actualFuelLiters == null || t.predictedFuelLiters == null || t.predictedFuelLiters === 0) {
        return false;
      }
      const errorPercent = Math.abs(t.actualFuelLiters - t.predictedFuelLiters) / t.predictedFuelLiters * 100;
      return errorPercent <= 15;
    }).length;
    
    const fuelAccuracyRate = withActuals > 0 
      ? Math.round((accurateFuelPredictions / withActuals) * 100) 
      : 0;
    
    // Calculate total fuel variance
    const totalFuelVariance = tripsArray.reduce((sum, t) => {
      if (t.actualFuelLiters != null && t.predictedFuelLiters != null) {
        return sum + (t.actualFuelLiters - t.predictedFuelLiters);
      }
      return sum;
    }, 0);

    return {
      totalTrips: Number(statsData?.totalTrips ?? tripsArray.length),
      completedTrips,
      predictionsWithActuals: withActuals,
      fuelAccuracyRate,
      costAccuracyRate: 0, // Can't calculate without cost data
      averagePredictedCost: Number(statsData?.averageCost ?? 0),
      averageActualCost: Number(statsData?.averageCost ?? 0),
      averageFuelErrorPercent: 0,
      averageCostErrorPercent: 0,
      totalPredictedFuel: 0,
      totalActualFuel: Number(statsData?.totalFuelUsed ?? 0),
      totalFuelVariance: Math.round(totalFuelVariance * 10) / 10,
      totalPredictedCost: 0,
      totalActualCost: Number(statsData?.totalCost ?? 0),
      totalCostVariance: 0,
      totalFuelUsed: Number(statsData?.totalFuelUsed ?? 0),
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

      if (statsData) {
        // Calculate accuracy rate
        const withActuals = tripsArray.filter(
          (t: any) => t.actualFuelLiters != null,
        ).length;
        const accuratePredictions = tripsArray.filter((t: any) => {
          if (!t.actualFuelLiters || !t.predictedFuelLiters) return false;
          const diff = Math.abs(t.actualFuelLiters - t.predictedFuelLiters);
          return diff / t.predictedFuelLiters <= 0.15;
        }).length;

        const accuracyRate =
          withActuals > 0
            ? Math.round((accuratePredictions / withActuals) * 100)
            : 0;

        const totalFuelSaved = tripsArray.reduce((sum: number, t: any) => {
          if (t.actualFuelLiters && t.predictedFuelLiters) {
            return (
              sum + Math.max(0, t.predictedFuelLiters - t.actualFuelLiters)
            );
          }
          return sum;
        }, 0);

        setStats({
          totalTrips: statsData.totalTrips || 0,
          completedTrips:
            tripsArray.filter((t: any) => t.status === "completed").length || 0,
          averageCost: Math.round(statsData.averageCost || 0),
          predictionsWithActuals: withActuals,
          totalFuelUsed: statsData.totalFuelUsed || 0,
          totalFuelSaved: Math.round(totalFuelSaved * 10) / 10,
          accuracyRate,
        });
      } else {
        const completed = tripsArray.filter(
          (t: any) => t.status === "completed",
        ).length;
        const withActuals = tripsArray.filter(
          (t: any) => t.actualFuelLiters != null,
        ).length;
        const avgCost =
          tripsArray.length > 0
            ? tripsArray.reduce(
                (sum: number, t: any) => sum + (t.predictedTotalCost || 0),
                0,
              ) / tripsArray.length
            : 0;

        const accuratePredictions = tripsArray.filter((t: any) => {
          if (!t.actualFuelLiters || !t.predictedFuelLiters) return false;
          const diff = Math.abs(t.actualFuelLiters - t.predictedFuelLiters);
          return diff / t.predictedFuelLiters <= 0.15;
        }).length;

        const accuracyRate =
          withActuals > 0
            ? Math.round((accuratePredictions / withActuals) * 100)
            : 0;

        const totalFuelSaved = tripsArray.reduce((sum: number, t: any) => {
          if (t.actualFuelLiters && t.predictedFuelLiters) {
            return (
              sum + Math.max(0, t.predictedFuelLiters - t.actualFuelLiters)
            );
          }
          return sum;
        }, 0);

        setStats({
          totalTrips: tripsArray.length,
          completedTrips: completed,
          averageCost: Math.round(avgCost),
          predictionsWithActuals: withActuals,
          totalFuelUsed: 0,
          totalFuelSaved: Math.round(totalFuelSaved * 10) / 10,
          accuracyRate,
        });
      }
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

  const quickActionTiles = [
    {
      id: "planner",
      label: "New Trip",
      icon: "add-circle",
      iconSet: Ionicons,
      color: "#3b82f6",
      gradient: ["#3b82f6", "#2563eb"] as const,
      action: () => setActiveView("planner"),
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
      bgColor: "#f5f3ff",
      gradient: ["#8b5cf6", "#7c3aed"],
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
      format: "number",
    },
    {
      label: "Completed",
      value: Number(stats.completedTrips ?? 0),
      icon: "checkmark-circle",
      iconSet: Ionicons,
      color: "#10b981",
      bgColor: "#d1fae5",
      format: "number",
    },
    {
      label: "Avg Cost",
      value: Number(stats.averageActualCost ?? stats.averagePredictedCost ?? 0),
      icon: "cash-outline",
      iconSet: Ionicons,
      color: "#f59e0b",
      bgColor: "#fef3c7",
      format: "currency",
    },
    {
      label: "Fuel Accuracy",
      value: Number(stats.fuelAccuracyRate ?? 0),
      icon: "analytics",
      iconSet: Ionicons,
      color: "#8b5cf6",
      bgColor: "#ede9fe",
      format: "percent",
    },
  ] as const;

  const formatValue = (
    value: number,
    format: "number" | "currency" | "percent",
  ) => {
    const safeValue = Number(value ?? 0);

    if (format === "currency") return `Rs ${safeValue.toLocaleString()}`;
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

          {/* Data Quality Notice */}
          {stats.predictionsWithActuals > 0 && 
           stats.completedTrips > stats.predictionsWithActuals && (
            <View className="mt-3 rounded-xl bg-amber-50 p-3 border border-amber-200">
              <View className="flex-row items-center">
                <Ionicons name="information-circle" size={18} color="#f59e0b" />
                <Text className="ml-2 text-xs font-medium text-amber-800">
                  Data Quality Filter Active
                </Text>
              </View>
              <Text className="mt-1 text-xs text-amber-700">
                {stats.completedTrips - stats.predictionsWithActuals} trips excluded due to 
                invalid or extreme outlier data (10x+ prediction vs actual difference).
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

        {/* 🔍 DEBUG: Show why boat type card isn't showing */}
        {!(predictionsWithActuals > 0 && stats.normalizedFuelMetrics && 
           Object.keys(stats.normalizedFuelMetrics?.boatTypeBreakdown || {}).length > 0) && (
          <View className="mx-5 mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="bug" size={18} color="#f59e0b" />
              <Text className="ml-2 font-bold text-amber-900">
                Boat Type Card Debug Info
              </Text>
            </View>
            <Text className="text-xs text-amber-800 mb-1">
              The Boat Type Performance card requires:
            </Text>
            <View className="ml-2">
              <Text className="text-xs text-amber-700">
                {predictionsWithActuals > 0 ? '✅' : '❌'} Trips with actual data: {predictionsWithActuals}
              </Text>
              <Text className="text-xs text-amber-700">
                {stats.normalizedFuelMetrics ? '✅' : '❌'} Backend normalized metrics: {stats.normalizedFuelMetrics ? 'Yes' : 'No'}
              </Text>
              {stats.normalizedFuelMetrics && (
                <Text className="text-xs text-amber-700">
                  {Object.keys(stats.normalizedFuelMetrics.boatTypeBreakdown || {}).length > 0 ? '✅' : '❌'} Boat types: {Object.keys(stats.normalizedFuelMetrics.boatTypeBreakdown || {}).length}
                </Text>
              )}
            </View>
            <Text className="text-xs text-amber-600 mt-2">
              {predictionsWithActuals === 0 
                ? '→ Log actual data for completed trips to see this card'
                : !stats.normalizedFuelMetrics
                ? '→ Restart backend to get normalized metrics'
                : '→ Need trips with boat type information'}
            </Text>
          </View>
        )}

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
            <View className="rounded-2xl bg-white p-5"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Animated.View style={headerAnimatedStyle}>
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-sm text-blue-100 font-medium mb-1">
                      {greeting}
                    </Text>
                    <Text className="text-2xl font-bold text-white">
                      Dashboard
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="bg-white/20 p-2 rounded-full"
                    activeOpacity={0.7}
                    onPress={() => router.push("/profile" as any)}
                  >
                    <Ionicons name="person-circle" size={32} color="white" />
                  </TouchableOpacity>
                </View>
                
                {/* Overall Rating */}
                <View className={`rounded-full px-3 py-1 ${
                  stats.normalizedFuelMetrics.overallVarianceRating === 'excellent' ? 'bg-emerald-100' :
                  stats.normalizedFuelMetrics.overallVarianceRating === 'good' ? 'bg-blue-100' :
                  stats.normalizedFuelMetrics.overallVarianceRating === 'fair' ? 'bg-amber-100' :
                  'bg-red-100'
                }`}>
                  <Text className={`text-xs font-bold ${
                    stats.normalizedFuelMetrics.overallVarianceRating === 'excellent' ? 'text-emerald-700' :
                    stats.normalizedFuelMetrics.overallVarianceRating === 'good' ? 'text-blue-700' :
                    stats.normalizedFuelMetrics.overallVarianceRating === 'fair' ? 'text-amber-700' :
                    'text-red-700'
                  }`}>
                    {stats.normalizedFuelMetrics.overallVarianceRating.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Fleet Summary Stats */}
              <View className="mb-4 flex-row items-center justify-between rounded-xl bg-blue-50 p-3">
                <View className="flex-1">
                  <Text className="text-xs text-slate-600">Fleet Efficiency</Text>
                  <Text className="text-xl font-bold text-blue-600">
                    {stats.normalizedFuelMetrics.averageEfficiencyScore}/100
                  </Text>
                </View>
                <View className="h-10 w-px bg-slate-200" />
                <View className="flex-1 items-center">
                  <Text className="text-xs text-slate-600">Avg Variance</Text>
                  <Text className={`text-xl font-bold ${
                    Math.abs(stats.normalizedFuelMetrics.averageNormalizedVariancePercent) <= 15
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}>
                    {stats.normalizedFuelMetrics.averageNormalizedVariancePercent > 0 ? '+' : ''}
                    {stats.normalizedFuelMetrics.averageNormalizedVariancePercent.toFixed(1)}%
                  </Text>
                </View>
                <View className="h-10 w-px bg-slate-200" />
                <View className="flex-1 items-end">
                  <Text className="text-xs text-slate-600">Total Fuel</Text>
                  <Text className="text-xl font-bold text-slate-700">
                    {stats.totalActualFuel.toFixed(0)}L
                  </Text>
                </View>
              </View>

            {/* Stats Cards */}
            <View className="px-5 mb-6">
              <Text className="text-lg font-bold text-slate-900 mb-4">
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
                      className="bg-white rounded-2xl p-4 mb-3"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                    >
                      <View
                        className="rounded-xl w-10 h-10 items-center justify-center mb-3"
                        style={{ backgroundColor: stat.bgColor }}
                      >
                        <stat.iconSet
                          name={stat.icon as any}
                          size={20}
                          color={stat.color}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Info Footer */}
              <View className="flex-row items-start border-t border-slate-100 pt-3">
                <Ionicons name="information-circle-outline" size={14} color="#64748b" />
                <Text className="ml-1.5 flex-1 text-xs text-slate-500">
                  Performance compared to boat type baselines. Efficiency shows fuel usage vs expected, 
                  variance shows deviation from baseline.
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

            {/* Fuel Efficiency Card */}
            {stats.totalFuelSaved > 0 && (
              <Animated.View
                entering={SlideInRight.delay(400)}
                className="mx-5 mb-6"
              >
                <TouchableOpacity
                  onPress={tile.action}
                  activeOpacity={0.7}
                  className="mb-3"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <MaterialCommunityIcons
                          name="fuel"
                          size={20}
                          color="white"
                        />
                        <Text className="text-white font-semibold ml-2">
                          Fuel Efficiency
                        </Text>
                      </View>
                      <Text className="text-white text-2xl font-bold">
                        {stats.totalFuelSaved}L
                      </Text>
                      <Text className="text-emerald-100 text-xs mt-1">
                        Total fuel saved compared to predictions
                      </Text>
                    </View>
                    <View className="bg-white/20 p-3 rounded-full">
                      <MaterialCommunityIcons
                        name="leaf"
                        size={28}
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

        {trips.length > 0 && (
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

              <View className="flex-row flex-wrap justify-between">
                {quickActionTiles.map((tile, index) => (
                  <Animated.View
                    key={tile.id}
                    entering={FadeInUp.delay(200 + index * 50).springify()}
                    style={{ width: (width - 60) / 3 }}
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
                        className="rounded-2xl p-4 items-center"
                        style={{
                          shadowColor: tile.color,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.2,
                          shadowRadius: 6,
                          elevation: 4,
                        }}
                      >
                        <View className="bg-white/20 p-3 rounded-xl mb-2">
                          <tile.iconSet
                            name={tile.icon as any}
                            size={24}
                            color="white"
                          />
                        </View>
                        <Text className="text-white text-xs font-semibold text-center">
                          {tile.label}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </View>

            {/* Recent Activity */}
            {trips.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(500)}
                className="px-5 pb-8"
              >
                <View className="flex-row justify-between items-center mb-4">
                  <View>
                    <Text className="text-lg font-bold text-slate-900">
                      Recent Trips
                    </Text>
                    <Text className="text-xs text-slate-400">
                      Your latest fishing expeditions
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      router.push("/fishtripcost/past-trips" as any)
                    }
                    className="bg-blue-50 px-4 py-2 rounded-full"
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
                            Trip {tripId ? tripId.slice(-6) : "------"}
                          </Text>
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
                      key={trip._id}
                      entering={FadeInUp.delay(600 + index * 100).springify()}
                    >
                      <TouchableOpacity
                        onPress={() =>
                          router.push(
                            `/fishtripcost/trip-details/${trip._id}` as any,
                          )
                        }
                        className="bg-white rounded-xl p-4 mb-3"
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.06,
                          shadowRadius: 6,
                          elevation: 3,
                        }}
                      >
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1">
                            <View className="flex-row items-center mb-2">
                              <MaterialCommunityIcons
                                name="fish"
                                size={16}
                                color="#3b82f6"
                              />
                              <Text className="text-sm font-bold text-slate-900 ml-2">
                                Trip {trip._id.slice(-6)}
                              </Text>
                            </View>

                            <View className="flex-row items-center mb-2">
                              <Ionicons
                                name="calendar-outline"
                                size={12}
                                color="#94a3b8"
                              />
                              <Text className="text-xs text-slate-500 ml-1">
                                {new Date(
                                  trip.departureTime,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </Text>
                            </View>

                            <View className="flex-row gap-3">
                              <View className="flex-row items-center">
                                <Ionicons
                                  name="cash-outline"
                                  size={12}
                                  color="#f59e0b"
                                />
                                <Text className="text-xs text-slate-600 ml-1">
                                  Rs{" "}
                                  {(
                                    trip.predictedTotalCost || 0
                                  ).toLocaleString()}
                                </Text>
                              </View>
                              <View className="flex-row items-center">
                                <MaterialCommunityIcons
                                  name="fuel"
                                  size={12}
                                  color="#3b82f6"
                                />
                                <Text className="text-xs text-slate-600 ml-1">
                                  {(trip.predictedFuelLiters || 0).toFixed(1)}L
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View
                            className="px-3 py-1 rounded-full"
                            style={{ backgroundColor: statusColor.bg }}
                          >
                            <Text
                              className="text-xs font-semibold"
                              style={{ color: statusColor.text }}
                            >
                              {trip.status || "planned"}
                            </Text>
                          </View>

                        {trip.status === "in-progress" && (
                          <View className="mt-3">
                            <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <View
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: "45%" }}
                              />
                            </View>
                            <Text className="text-xs text-slate-400 mt-1">
                              45% complete
                            </Text>
                          </View>
                        </View>
                      </View>

            {/* Empty State */}
            {trips.length === 0 && !loading && (
              <Animated.View
                entering={FadeInUp}
                className="px-5 pb-8 items-center"
              >
                <View className="bg-white rounded-3xl p-8 items-center w-full">
                  <MaterialCommunityIcons
                    name="fish"
                    size={64}
                    color="#cbd5e1"
                  />
                  <Text className="text-slate-800 font-bold text-lg mt-4">
                    No trips yet
                  </Text>
                  <Text className="text-slate-400 text-sm text-center mt-2">
                    Start planning your first fishing trip{"\n"}
                    with AI-powered cost predictions
                  </Text>
                  <TouchableOpacity
                    onPress={() => setActiveView("planner")}
                    className="bg-blue-500 px-6 py-3 rounded-full mt-6"
                  >
                    <Text className="text-white font-semibold">
                      Plan Your First Trip
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

        {trips.length === 0 && !loading && (
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
                onPress={() => setActiveView("planner")}
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