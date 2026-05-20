// mobile/app/(root)/(tabs)/fishtripcost/result.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PieChart, BarChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";

import useTripStore from "@/stores/tripStore";
import { predictAndSaveTripDatcie } from "@/services/tripService";
import {
  getBoatLearningInsights,
  getBoatPredictionHistory,
} from "@/services/boatService";
import ExternalCostSummaryCard from "./components/ExternalCostSummaryCard";
import TotalCostCard from "./components/TotalCostCard";
import FishTripNavBar from "./components/FishTripNavBar";

const screenWidth = Dimensions.get("window").width;

const money = (n: any) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "0";
  return Math.round(num).toLocaleString("en-LK");
};

const num1 = (n: any) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "0.0";
  return num.toFixed(1);
};

const ResultScreen = () => {
  const router = useRouter();

  const datcieBody = useTripStore((s) => s.datcieBody);
  const prediction = useTripStore((s) => s.datciePrediction);
  const optimization = useTripStore((s) => s.datcieOptimization);

  const setLastSavedTripId = useTripStore((s) => s.setLastSavedTripId);
  const setLastSavedTrip = useTripStore((s) => s.setLastSavedTrip);

  const [saving, setSaving] = useState(false);
  const [boatInsights, setBoatInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const hasPrediction = !!prediction;
  const boatId = datcieBody?.boatId;

  // Fetch boat-specific analytics for per-prediction context
  useEffect(() => {
    if (boatId && hasPrediction) {
      loadBoatAnalytics();
    }
  }, [boatId, hasPrediction]);

  const loadBoatAnalytics = async () => {
    if (!boatId) return;
    try {
      setLoadingInsights(true);
      const insights = await getBoatLearningInsights(boatId);
      setBoatInsights(insights);
    } catch (err) {
      console.log("Failed to load boat insights:", err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const cards = useMemo(() => {
    // Debug: Log the prediction structure
    console.log("🔍 Prediction Data:", JSON.stringify(prediction, null, 2));

    const fuelLiters =
      prediction?.fuel?.adjustedFuelLiters ??
      prediction?.fuel?.predictedFuelLiters ??
      prediction?.predictedFuelLiters ??
      null;

    const fuelCost =
      prediction?.cost?.predictedFuelCost ??
      prediction?.cost?.fuelCost ??
      prediction?.predictedFuelCost ??
      null;

    const operationalCost =
      prediction?.cost?.predictedOperationalCost ??
      prediction?.cost?.baseOperationalCost ??
      prediction?.cost?.operationalCost ??
      prediction?.predictedOperationalCost ??
      null;

    const externalCostTotal =
      prediction?.cost?.predictedExternalCostTotal ??
      prediction?.cost?.externalCostTotal ??
      prediction?.predictedExternalCostTotal ??
      null;

    const totalCost =
      prediction?.cost?.predictedTotalCost ??
      prediction?.cost?.totalCost ??
      prediction?.predictedTotalCost ??
      null;

    // Debug: Log extracted cost values
    console.log("💰 Extracted Cost Values:", {
      fuelCost,
      operationalCost,
      externalCostTotal,
      totalCost,
      hasValidTotalCost: typeof totalCost === "number",
    });

    const externalCosts =
      prediction?.cost?.predictedExternalCosts ??
      prediction?.cost?.externalCosts ??
      prediction?.predictedExternalCosts ??
      [];

    const carbonKg =
      prediction?.carbon?.carbonEmissionKg ??
      prediction?.carbon?.carbonKg ??
      null;

    const risk =
      prediction?.profitability?.riskCategory ??
      prediction?.profitability?.risk ??
      null;

    const recsRaw = prediction?.recommendations ?? prediction?.tips ?? [];
    const recs = Array.isArray(recsRaw)
      ? recsRaw.filter(
          (item: string) =>
            !/profit|revenue|market|catch/i.test(String(item || "")),
        )
      : [];

    return {
      fuelLiters,
      fuelCost,
      operationalCost,
      externalCostTotal,
      totalCost,
      externalCosts,
      carbonKg,
      risk,
      recs,
    };
  }, [prediction]);

  const onSaveTrip = async () => {
    if (!datcieBody) {
      Alert.alert("Missing data", "Go back to Planner and run Predict first.");
      return;
    }
    try {
      setSaving(true);
      // Ensure speed is set for save operation
      const bodyWithSpeed = {
        ...datcieBody,
        speed: datcieBody.speed || 10, // Default to 10 if not set (from optimization)
      };
      const res = await predictAndSaveTripDatcie(bodyWithSpeed);

      const trip = res?.trip ?? res;
      const tripId = trip?._id ?? trip?.id ?? res?.tripId;

      if (tripId) setLastSavedTripId(String(tripId));
      setLastSavedTrip(trip);

      Alert.alert("✅ Trip Saved", `Trip ID: ${tripId || "unknown"}`);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "predict-and-save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <FishTripNavBar />
      {/* Header */}
      <View className="px-5 pt-3 pb-3 flex-row justify-between items-center bg-white border-b border-slate-100">
        <View>
          <Text className="text-xl font-bold text-slate-900">
            Prediction Result
          </Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            DATCIE • fuel • cost • carbon
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-slate-100 rounded-xl px-3 py-2"
          activeOpacity={0.8}
        >
          <Text className="text-slate-700 font-semibold">← Back</Text>
        </TouchableOpacity>
      </View>

      {!hasPrediction ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-slate-700 font-semibold text-lg mb-2">
            No prediction found
          </Text>
          <Text className="text-slate-500 text-center mb-5">
            Go to Planner → Predict. Then come back here.
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/(root)/(tabs)/fishtripcost")}
            className="bg-blue-600 rounded-xl px-5 py-3"
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold">Go to Planner</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <View className="flex-row gap-3 mb-3">
            <Card
              title="⛽ Fuel (L)"
              value={
                typeof cards.fuelLiters === "number"
                  ? num1(cards.fuelLiters)
                  : "-"
              }
            />
            <Card
              title="💰 Total Cost (Rs)"
              value={
                typeof cards.totalCost === "number"
                  ? money(cards.totalCost)
                  : "-"
              }
              highlight
            />
          </View>

          <View className="flex-row gap-3 mb-3">
            <Card
              title="Fuel Cost (Rs)"
              value={
                typeof cards.fuelCost === "number"
                  ? money(cards.fuelCost)
                  : "-"
              }
            />
            <Card
              title="External Costs (Rs)"
              value={
                typeof cards.externalCostTotal === "number"
                  ? money(cards.externalCostTotal)
                  : "-"
              }
            />
          </View>

          <View className="flex-row gap-3 mb-3">
            <Card
              title="CO2 Emission (kg)"
              value={
                typeof cards.carbonKg === "number" ? num1(cards.carbonKg) : "-"
              }
            />
            <Card
              title="Risk"
              value={cards.risk ? String(cards.risk).toUpperCase() : "-"}
            />
          </View>

          {/* 🎯 PER-PREDICTION ANALYTICS - Boat Historical Context */}
          {boatInsights?.hasData && (
            <View className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5 mb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="analytics" size={20} color="#6366f1" />
                <Text className="text-base font-bold text-indigo-900 ml-2">
                  Per-Prediction Analytics
                </Text>
              </View>

              <View className="bg-white/80 rounded-xl p-3 mb-2">
                <Text className="text-xs text-indigo-600 font-semibold mb-2">
                  THIS PREDICTION vs BOAT'S HISTORY
                </Text>

                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-slate-600 text-sm">
                    Boat's Avg Accuracy
                  </Text>
                  <Text className="text-indigo-700 font-bold">
                    {boatInsights.avgAccuracy
                      ? `${(boatInsights.avgAccuracy * 100).toFixed(1)}%`
                      : "N/A"}
                  </Text>
                </View>

                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-slate-600 text-sm">
                    Boat's Avg Error
                  </Text>
                  <Text className="text-slate-700 font-semibold">
                    {boatInsights.avgPredictionError
                      ? `${boatInsights.avgPredictionError.toFixed(1)} L`
                      : "N/A"}
                  </Text>
                </View>

                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-slate-600 text-sm">
                    Total Trips Learned
                  </Text>
                  <Text className="text-emerald-700 font-bold">
                    {boatInsights.totalTrips ?? 0} trips
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-slate-600 text-sm">
                    Model Confidence
                  </Text>
                  <Text className="text-purple-700 font-bold">
                    {boatInsights.confidence
                      ? `${(boatInsights.confidence * 100).toFixed(0)}%`
                      : "N/A"}
                  </Text>
                </View>
              </View>

              <View className="bg-indigo-100 rounded-lg p-2.5 mt-2">
                <Text className="text-indigo-800 text-xs font-medium text-center">
                  ℹ️ This prediction uses {boatInsights.totalTrips ?? 0}{" "}
                  historical trips from this boat
                </Text>
              </View>
            </View>
          )}

          {/* 📊 COST BREAKDOWN PIE CHART */}
          {typeof cards.fuelCost === "number" &&
            typeof cards.totalCost === "number" && (
              <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
                <Text className="text-base font-semibold text-slate-800 mb-4">
                  💰 Cost Breakdown (Research Visualization)
                </Text>

                <PieChart
                  data={[
                    {
                      name: "Fuel",
                      value: cards.fuelCost || 0,
                      color: "#3b82f6",
                      legendFontColor: "#64748b",
                      legendFontSize: 13,
                    },
                    {
                      name: "Operational",
                      value: cards.operationalCost || 0,
                      color: "#10b981",
                      legendFontColor: "#64748b",
                      legendFontSize: 13,
                    },
                    {
                      name: "External",
                      value: cards.externalCostTotal || 0,
                      color: "#f59e0b",
                      legendFontColor: "#64748b",
                      legendFontSize: 13,
                    },
                  ]}
                  width={screenWidth - 72}
                  height={200}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="value"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />

                <View className="mt-3 bg-slate-50 rounded-xl p-3">
                  <View className="flex-row justify-between mb-1.5">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                      <Text className="text-slate-600 text-sm">Fuel Cost</Text>
                    </View>
                    <Text className="text-slate-900 font-bold">
                      Rs {money(cards.fuelCost)}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-1.5">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                      <Text className="text-slate-600 text-sm">
                        Operational
                      </Text>
                    </View>
                    <Text className="text-slate-900 font-bold">
                      Rs {money(cards.operationalCost)}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                      <Text className="text-slate-600 text-sm">
                        External Costs
                      </Text>
                    </View>
                    <Text className="text-slate-900 font-bold">
                      Rs {money(cards.externalCostTotal)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

          {/*
            Economic analysis is hidden here on purpose. Actual catch and
            revenue are collected in Log Actuals after the trip, then saved for
            later learning and evaluation.
          */}

          {/* External Costs Summary */}
          {cards.externalCosts && cards.externalCosts.length > 0 && (
            <View className="mb-3">
              <ExternalCostSummaryCard
                externalCosts={cards.externalCosts}
                title="External Costs Breakdown"
                showBreakdown={true}
              />
            </View>
          )}

          {/* Total Cost Breakdown */}
          {typeof cards.totalCost === "number" && (
            <View className="mb-3">
              <TotalCostCard
                fuelCost={cards.fuelCost}
                operationalCost={cards.operationalCost}
                externalCostTotal={cards.externalCostTotal}
                totalCost={cards.totalCost}
                title="Complete Cost Breakdown"
                showBreakdown={true}
              />
            </View>
          )}

          {cards.risk && (
            <View
              className={`rounded-2xl border-2 p-5 mb-4 ${
                cards.risk === "low"
                  ? "bg-green-50 border-green-300"
                  : cards.risk === "medium"
                    ? "bg-amber-50 border-amber-300"
                    : "bg-rose-50 border-rose-300"
              }`}
            >
              <View className="flex-row items-center mb-3">
                <Ionicons
                  name={
                    cards.risk === "low"
                      ? "shield-checkmark"
                      : cards.risk === "medium"
                        ? "warning"
                        : "alert-circle"
                  }
                  size={24}
                  color={
                    cards.risk === "low"
                      ? "#15803d"
                      : cards.risk === "medium"
                        ? "#d97706"
                        : "#dc2626"
                  }
                />
                <Text className="text-lg font-bold text-slate-900 ml-2">
                  Risk Assessment
                </Text>
              </View>

              <View
                className={`rounded-xl p-4 ${
                  cards.risk === "low"
                    ? "bg-green-100"
                    : cards.risk === "medium"
                      ? "bg-amber-100"
                      : "bg-rose-100"
                }`}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-slate-700 font-semibold">
                    Risk Level
                  </Text>
                  <View
                    className={`px-4 py-2 rounded-full ${
                      cards.risk === "low"
                        ? "bg-green-600"
                        : cards.risk === "medium"
                          ? "bg-amber-600"
                          : "bg-rose-600"
                    }`}
                  >
                    <Text className="text-white font-bold text-base uppercase">
                      {String(cards.risk)}
                    </Text>
                  </View>
                </View>

                <Text
                  className={`text-sm mt-2 ${
                    cards.risk === "low"
                      ? "text-green-800"
                      : cards.risk === "medium"
                        ? "text-amber-800"
                        : "text-rose-800"
                  }`}
                >
                  {cards.risk === "low"
                    ? "✅ Favorable conditions. Fuel and cost risk look low for this trip."
                    : cards.risk === "medium"
                      ? "⚠️ Moderate risk. Monitor weather and fuel consumption."
                      : "🚨 High risk detected. Consider postponing or adjusting route."}
                </Text>
              </View>

              <View className="bg-white rounded-lg p-3 mt-3">
                <Text className="text-slate-600 text-xs font-medium text-center">
                  🤖 Risk analysis based on weather, fuel, cost, and
                  historical patterns
                </Text>
              </View>
            </View>
          )}

          {optimization?.best && (
            <View className="bg-white rounded-2xl border border-slate-100 p-4 mb-3">
              <Text className="text-xs text-slate-400 font-semibold uppercase mb-2">
                Optimization
              </Text>
              <Text className="text-slate-800 font-bold text-lg">
                Best Speed: {optimization.best.speed} knots
              </Text>
              <Text className="text-slate-500 mt-1">
                Optimized Cost: Rs {money(optimization.best.predictedTotalCost)}
              </Text>
            </View>
          )}

          {Array.isArray(cards.recs) && cards.recs.length > 0 && (
            <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
              <Text className="text-base font-semibold text-slate-800 mb-3">
                📝 Recommendations
              </Text>
              {cards.recs.map((r: string, idx: number) => (
                <View key={idx} className="flex-row items-start mb-2.5">
                  <View className="w-5 h-5 rounded-full bg-blue-600 items-center justify-center mr-3 mt-0.5">
                    <Text className="text-white text-xs font-bold">
                      {idx + 1}
                    </Text>
                  </View>
                  <Text className="flex-1 text-slate-600 text-sm leading-5">
                    {r}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View className="bg-white rounded-2xl border border-slate-100 p-5">
            <Text className="text-xs text-slate-400 font-semibold uppercase mb-3">
              Actions
            </Text>

            <TouchableOpacity
              onPress={onSaveTrip}
              disabled={saving}
              activeOpacity={0.85}
              className={`rounded-xl py-4 items-center ${saving ? "bg-blue-400" : "bg-blue-600"}`}
            >
              {saving ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="white" />
                  <Text className="text-white font-bold ml-2">Saving...</Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-base">
                  ✅ Save Trip (predict-and-save)
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push("/(root)/(tabs)/fishtripcost/log-actual")
              }
              activeOpacity={0.85}
              className="rounded-xl py-4 items-center bg-slate-900 mt-3"
            >
              <Text className="text-white font-bold text-base">
                🧾 Log Actual (Fuel & Catch)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push("/(root)/(tabs)/fishtripcost/learning-summary")
              }
              activeOpacity={0.85}
              className="rounded-xl py-4 items-center bg-emerald-600 mt-3"
            >
              <Text className="text-white font-bold text-base">
                🧠 View Learning Summary
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const Card = ({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) => {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-slate-100 p-4">
      <Text className="text-xs text-slate-400 font-semibold uppercase mb-2">
        {title}
      </Text>
      <Text
        className={`text-2xl font-bold ${highlight ? "text-emerald-600" : "text-slate-800"}`}
      >
        {value}
      </Text>
    </View>
  );
};

export default ResultScreen;
