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
import useTripStore from "@/stores/tripStore";
import { getMyTrips, getMyStats } from "@/services/tripService";
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

export default function FishTripCostDashboard() {
  const [activeView, setActiveView] = useState<"dashboard" | "costs">(
    "dashboard",
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState("Good morning");
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    averageCost: 0,
    predictionsWithActuals: 0,
    totalFuelUsed: 0,
    totalFuelSaved: 0,
    accuracyRate: 0,
  });
  const [trips, setTrips] = useState<any[]>([]);

  // Animation values
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);

  // Set greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Animate header on mount
  useEffect(() => {
    headerOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });
    headerTranslateY.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    });
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const loadDashboardData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [tripsData, statsData] = await Promise.all([
        getMyTrips(),
        getMyStats().catch(() => null),
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
      iconSet: Ionicons,
      color: "#3b82f6",
      bgColor: "#eff6ff",
      gradient: ["#3b82f6", "#2563eb"],
      action: () => setActiveView("planner"),
    },
    {
      id: "past-trips",
      label: "Past Trips",
      icon: "list",
      iconSet: Ionicons,
      color: "#10b981",
      bgColor: "#ecfdf5",
      gradient: ["#10b981", "#059669"],
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
      bgColor: "#fef3c7",
      gradient: ["#f59e0b", "#d97706"],
      action: () => router.push("/fishtripcost/learning-summary" as any),
    },
    {
      id: "history",
      label: "Analytics",
      icon: "stats-chart",
      iconSet: Ionicons,
      color: "#06b6d4",
      bgColor: "#ecfeff",
      gradient: ["#06b6d4", "#0891b2"],
      action: () => router.push("/fishtripcost/history" as any),
    },
    {
      id: "costs",
      label: "Costs",
      icon: "cash",
      iconSet: Ionicons,
      color: "#ef4444",
      bgColor: "#fef2f2",
      gradient: ["#ef4444", "#dc2626"],
      action: () => router.push("/(root)/(tabs)/costs" as any),
    },
  ];

  const statCards = [
    {
      label: "Total Trips",
      value: stats.totalTrips,
      icon: "navigate",
      iconSet: Ionicons,
      color: "#3b82f6",
      bgColor: "#dbeafe",
      suffix: "",
      format: "number",
    },
    {
      label: "Completed",
      value: stats.completedTrips,
      icon: "checkmark-circle",
      iconSet: Ionicons,
      color: "#10b981",
      bgColor: "#d1fae5",
      suffix: "",
      format: "number",
    },
    {
      label: "Avg Cost",
      value: stats.averageCost,
      icon: "cash-outline",
      iconSet: Ionicons,
      color: "#f59e0b",
      bgColor: "#fef3c7",
      suffix: "Rs",
      format: "currency",
    },
    {
      label: "Accuracy",
      value: stats.accuracyRate,
      icon: "analytics",
      iconSet: Ionicons,
      color: "#8b5cf6",
      bgColor: "#ede9fe",
      suffix: "%",
      format: "percent",
    },
  ];

  const formatValue = (value: number, format: string, suffix: string) => {
    if (format === "currency") {
      return `Rs ${value.toLocaleString()}`;
    } else if (format === "percent") {
      return `${value}%`;
    }
    return value.toString();
  };

  const renderContent = () => {
    switch (activeView) {
      case "costs":
        return null;
      case "dashboard":
      default:
        if (loading) {
          return (
            <View className="flex-1 items-center justify-center bg-slate-50">
              <Animated.View entering={FadeInUp.delay(200).springify()}>
                <View className="bg-white p-8 rounded-3xl shadow-xl items-center">
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text className="text-slate-600 mt-4 font-medium">
                    Loading your dashboard...
                  </Text>
                  <Text className="text-slate-400 text-sm mt-2">
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
            {/* Header - Matching Quality screen style */}
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
                <Text className="text-sm text-blue-100 mt-2">
                  DATCIE-powered trip cost intelligence
                </Text>
              </Animated.View>
            </LinearGradient>

            {/* Quick Stats Row */}
            <View className="px-5 -mt-4 mb-6">
              <View className="bg-white rounded-2xl p-4 flex-row justify-between shadow-lg">
                <View className="items-center flex-1">
                  <Text className="text-xl font-bold text-slate-900">
                    {stats.totalTrips}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-1">Total</Text>
                </View>
                <View className="w-px bg-slate-200" />
                <View className="items-center flex-1">
                  <Text className="text-xl font-bold text-slate-900">
                    {stats.completedTrips}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-1">Done</Text>
                </View>
                <View className="w-px bg-slate-200" />
                <View className="items-center flex-1">
                  <Text className="text-xl font-bold text-slate-900">
                    {stats.totalFuelSaved.toFixed(1)}L
                  </Text>
                  <Text className="text-xs text-slate-500 mt-1">Saved</Text>
                </View>
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
                      <Text className="text-xs text-slate-500 mb-1">
                        {stat.label}
                      </Text>
                      <Text className="text-xl font-bold text-slate-900">
                        {formatValue(stat.value, stat.format, stat.suffix)}
                      </Text>
                    </View>
                  </Animated.View>
                ))}
              </View>
            </View>

            {/* Fuel Efficiency Card */}
            {stats.totalFuelSaved > 0 && (
              <Animated.View
                entering={SlideInRight.delay(400)}
                className="mx-5 mb-6"
              >
                <LinearGradient
                  colors={["#10b981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="rounded-2xl p-5"
                  style={{
                    shadowColor: "#059669",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
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
                  </View>
                </LinearGradient>
              </Animated.View>
            )}

            {/* Quick Action Tiles */}
            <View className="px-5 mb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-slate-900">
                  Quick Actions
                </Text>
                <Text className="text-xs text-slate-400">
                  {quickActionTiles.length} options
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
                    <Text className="text-sm text-blue-600 font-semibold">
                      See All
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
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </Animated.View>
            )}

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
                </View>
              </Animated.View>
            )}
          </Animated.ScrollView>
        );
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />
      <SafeAreaView className="flex-1 bg-slate-50">
        <FishTripNavBar />
        {activeView === "dashboard" && (
          <View className="flex-1">{renderContent()}</View>
        )}
        {activeView === "planner" && (
          <View className="flex-1">{renderContent()}</View>
        )}
      </SafeAreaView>
    </>
  );
}
