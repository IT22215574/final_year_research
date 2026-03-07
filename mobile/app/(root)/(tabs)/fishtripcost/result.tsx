// mobile/app/(root)/(tabs)/fishtripcost/result.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import useTripStore from "@/stores/tripStore";
import { predictAndSaveTripDatcie } from "@/services/tripService";
import ExternalCostSummaryCard from "./components/ExternalCostSummaryCard";
import TotalCostCard from "./components/TotalCostCard";

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

  const hasPrediction = !!prediction;

  const cards = useMemo(() => {
    const fuelLiters =
      prediction?.fuel?.predictedFuelLiters ??
      prediction?.predictedFuelLiters ??
      null;

    const fuelCost =
      prediction?.cost?.predictedFuelCost ??
      prediction?.predictedFuelCost ??
      null;

    const operationalCost =
      prediction?.cost?.predictedOperationalCost ??
      prediction?.predictedOperationalCost ??
      null;

    const externalCostTotal =
      prediction?.cost?.predictedExternalCostTotal ??
      prediction?.predictedExternalCostTotal ??
      null;

    const totalCost =
      prediction?.cost?.predictedTotalCost ??
      prediction?.cost?.totalCost ??
      prediction?.predictedTotalCost ??
      null;

    const externalCosts =
      prediction?.cost?.predictedExternalCosts ??
      prediction?.predictedExternalCosts ??
      [];

    const carbonKg =
      prediction?.carbon?.carbonEmissionKg ??
      prediction?.carbon?.carbonKg ??
      null;

    const profitProb =
      prediction?.profitability?.profitabilityProbability ??
      prediction?.profitability?.probability ??
      null;

    const risk =
      prediction?.profitability?.riskCategory ??
      prediction?.profitability?.risk ??
      null;

    const recs = prediction?.recommendations ?? prediction?.tips ?? [];

    return {
      fuelLiters,
      fuelCost,
      operationalCost,
      externalCostTotal,
      totalCost,
      externalCosts,
      carbonKg,
      profitProb,
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
      {/* Header */}
      <View className="px-5 pt-3 pb-3 flex-row justify-between items-center bg-white border-b border-slate-100">
        <View>
          <Text className="text-xl font-bold text-slate-900">
            Prediction Result
          </Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            DATCIE • fuel • cost • carbon • profitability
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
              value={cards.fuelLiters ? num1(cards.fuelLiters) : "-"}
            />
            <Card
              title="💰 Total Cost (Rs)"
              value={cards.totalCost ? money(cards.totalCost) : "-"}
              highlight
            />
          </View>

          <View className="flex-row gap-3 mb-3">
            <Card
              title="🌿 Carbon (kg)"
              value={cards.carbonKg ? num1(cards.carbonKg) : "-"}
            />
            <Card
              title="📈 Profitability"
              value={
                cards.profitProb !== null
                  ? `${Math.round(Number(cards.profitProb) * 100)}%`
                  : "-"
              }
            />
          </View>

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
          {cards.totalCost && (
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
            <View className="bg-white rounded-2xl border border-slate-100 p-4 mb-3">
              <Text className="text-xs text-slate-400 font-semibold uppercase mb-2">
                Risk Category
              </Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-slate-800 capitalize">
                  {String(cards.risk)}
                </Text>
                <View className="bg-slate-100 px-3 py-1 rounded-full">
                  <Text className="text-slate-700 font-semibold text-xs">
                    ML Analysis
                  </Text>
                </View>
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
