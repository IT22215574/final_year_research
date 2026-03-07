import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { icons } from "@/constants";
import { LinearGradient } from "expo-linear-gradient";
import useTripStore from "@/stores/tripStore";
import TripPlanner from "./components/TripPlanner";

export default function FishTripCostDashboard() {
  const { savedTrips } = useTripStore();
  const [activeView, setActiveView] = useState<
    "dashboard" | "planner" | "boats" | "costs"
  >("dashboard");
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    averageCost: 0,
    predictionsWithActuals: 0,
  });

  useEffect(() => {
    // Calculate statistics from saved trips
    if (savedTrips && savedTrips.length > 0) {
      const completed = savedTrips.filter((t: any) => t.actualLog).length;
      const avgCost =
        savedTrips.reduce(
          (sum: number, t: any) => sum + (t.prediction?.totalCost || 0),
          0,
        ) / savedTrips.length;

      setStats({
        totalTrips: savedTrips.length,
        completedTrips: completed,
        averageCost: Math.round(avgCost),
        predictionsWithActuals: completed,
      });
    }
  }, [savedTrips]);

  const topNavItems = [
    { id: "dashboard", label: "Dashboard", icon: icons.nav_home },
    { id: "planner", label: "New Trip", icon: icons.plus },
    { id: "boats", label: "Boats", icon: icons.fisher },
    { id: "costs", label: "Costs", icon: icons.cost },
  ];

  const dashboardCards = [
    {
      id: 1,
      title: "New Trip Prediction",
      description: "Plan and predict trip costs using DATCIE",
      icon: icons.plus,
      action: () => setActiveView("planner"),
      gradient: ["#0066CC", "#00A3FF"],
    },
    {
      id: 2,
      title: "Past Trips",
      description: `${stats.totalTrips} trips saved`,
      icon: icons.list,
      action: () => router.push("/fishtripcost/past-trips" as any),
      gradient: ["#10B981", "#059669"],
    },
    {
      id: 3,
      title: "Learning Summary",
      description: "View DATCIE learning insights",
      icon: icons.star,
      action: () => router.push("/fishtripcost/learning-summary" as any),
      gradient: ["#F59E0B", "#D97706"],
    },
    {
      id: 4,
      title: "Trip Analytics",
      description: "Analyze trip performance trends",
      icon: icons.point,
      action: () => router.push("/fishtripcost/history" as any),
      gradient: ["#8B5CF6", "#7C3AED"],
    },
  ];

  const statCards = [
    { label: "Total Trips", value: stats.totalTrips, icon: icons.list },
    { label: "Completed", value: stats.completedTrips, icon: icons.check },
    {
      label: "Avg Cost",
      value: `Rs ${stats.averageCost.toLocaleString()}`,
      icon: icons.dollar,
    },
    {
      label: "With Actuals",
      value: stats.predictionsWithActuals,
      icon: icons.star,
    },
  ];

  const renderContent = () => {
    switch (activeView) {
      case "planner":
        return <TripPlanner />;
      case "boats":
        router.push("/(root)/(tabs)/boats" as any);
        setActiveView("dashboard");
        return null;
      case "costs":
        router.push("/(root)/(tabs)/costs" as any);
        setActiveView("dashboard");
        return null;
      case "dashboard":
      default:
        return (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="px-5 pt-6 pb-4">
              <Text className="text-2xl font-bold text-slate-900">
                Fish Trip Cost
              </Text>
              <Text className="text-sm text-slate-600 mt-1">
                DATCIE-powered trip cost prediction and analysis
              </Text>
            </View>

            {/* Stats Cards */}
            <View className="px-5 mb-4">
              <View className="flex-row justify-between">
                {statCards.slice(0, 2).map((stat) => (
                  <View
                    key={stat.label}
                    className="bg-white rounded-xl p-4 shadow-sm"
                    style={{ width: "48%" }}
                  >
                    <Text className="text-xs text-slate-600 mb-1">
                      {stat.label}
                    </Text>
                    <Text className="text-2xl font-bold text-slate-900">
                      {stat.value}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="flex-row justify-between mt-3">
                {statCards.slice(2, 4).map((stat) => (
                  <View
                    key={stat.label}
                    className="bg-white rounded-xl p-4 shadow-sm"
                    style={{ width: "48%" }}
                  >
                    <Text className="text-xs text-slate-600 mb-1">
                      {stat.label}
                    </Text>
                    <Text className="text-xl font-bold text-slate-900">
                      {stat.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Main Action Cards */}
            <View className="px-5 pb-6">
              <Text className="text-base font-semibold text-slate-900 mb-3">
                Quick Actions
              </Text>
              {dashboardCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  onPress={card.action}
                  activeOpacity={0.7}
                  className="mb-3"
                >
                  <LinearGradient
                    colors={card.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="rounded-2xl p-5 flex-row items-center justify-between shadow-lg"
                  >
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-white mb-1">
                        {card.title}
                      </Text>
                      <Text className="text-sm text-white/90">
                        {card.description}
                      </Text>
                    </View>
                    <View className="bg-white/20 rounded-full p-3">
                      <Image
                        source={card.icon}
                        className="w-6 h-6"
                        tintColor="white"
                        resizeMode="contain"
                      />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Top Navigation Tabs */}
      <View className="bg-white px-3 py-3 shadow-sm">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {topNavItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setActiveView(item.id as any)}
                className={`flex-row items-center px-4 py-2 rounded-lg ${
                  activeView === item.id ? "bg-blue-600" : "bg-slate-100"
                }`}
              >
                <Image
                  source={item.icon}
                  className="w-5 h-5 mr-2"
                  tintColor={activeView === item.id ? "white" : "#475569"}
                  resizeMode="contain"
                />
                <Text
                  className={`font-semibold ${
                    activeView === item.id ? "text-white" : "text-slate-700"
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Content Area */}
      <View className="flex-1">{renderContent()}</View>
    </SafeAreaView>
  );
}
