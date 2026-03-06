// mobile/app/(root)/(tabs)/fishtripcost/log-actual.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import useTripStore from "@/stores/tripStore";
import { logActualTripDatcie } from "@/services/tripService";

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const LogActualScreen = () => {
  const router = useRouter();

  const lastSavedTripId = useTripStore((s) => s.lastSavedTripId);
  const lastSavedTrip = useTripStore((s) => s.lastSavedTrip);

  // ✅ FIX: use datciePrediction (store field name)
  const prediction = useTripStore((s) => s.datciePrediction);

  const [actualFuelLiters, setActualFuelLiters] = useState("");
  const [actualCatchKg, setActualCatchKg] = useState("");
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    const predictedFuel =
      prediction?.fuel?.predictedFuelLiters ??
      prediction?.predictedFuelLiters ??
      null;

    const predictedTotal =
      prediction?.cost?.predictedTotalCost ??
      prediction?.predictedTotalCost ??
      null;

    return {
      predictedFuel,
      predictedTotal,
      tripId: lastSavedTripId || lastSavedTrip?._id || lastSavedTrip?.id || null,
    };
  }, [prediction, lastSavedTripId, lastSavedTrip]);

  const onSubmit = async () => {
    const tripId = summary.tripId;

    if (!tripId) {
      Alert.alert(
        "No saved trip found",
        "First go to Result → Save Trip (predict-and-save). Then come here."
      );
      return;
    }

    const fuel = num(actualFuelLiters);
    const catchKg = num(actualCatchKg);

    if (!Number.isFinite(fuel) || fuel <= 0) {
      Alert.alert("Invalid Fuel", "Enter a valid actual fuel liters (e.g. 95).");
      return;
    }

    if (!Number.isFinite(catchKg) || catchKg < 0) {
      Alert.alert("Invalid Catch", "Enter a valid catch in kg (e.g. 420).");
      return;
    }

    try {
      setSaving(true);

      await logActualTripDatcie(String(tripId), {
        actualFuelLiters: fuel,
        actualCatchKg: catchKg,
      });

      Alert.alert("✅ Logged", "Actual fuel & catch saved successfully.");

      router.replace("/(root)/(tabs)/fishtripcost/history");
    } catch (e: any) {
      Alert.alert("Log actual failed", e?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pt-3 pb-3 flex-row justify-between items-center bg-white border-b border-slate-100">
        <View>
          <Text className="text-xl font-bold text-slate-900">Log Actuals</Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            Save real fuel & catch for training data
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-slate-100 rounded-xl px-3 py-2"
          activeOpacity={0.85}
        >
          <Text className="text-slate-700 font-semibold">← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Trip summary card */}
        <View
          className="bg-white rounded-2xl border border-slate-100 p-5 mb-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Text className="text-xs text-slate-400 font-semibold uppercase mb-3">
            Trip Summary
          </Text>

          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-600 text-sm">Trip ID</Text>
            <Text className="text-slate-900 font-semibold text-sm">
              {summary.tripId ? String(summary.tripId) : "Not saved yet"}
            </Text>
          </View>

          <View className="flex-row gap-3 mt-3">
            <MiniCard
              title="Pred Fuel (L)"
              value={
                summary.predictedFuel !== null
                  ? Number(summary.predictedFuel).toFixed(1)
                  : "-"
              }
            />
            <MiniCard
              title="Pred Cost (Rs)"
              value={
                summary.predictedTotal !== null
                  ? Math.round(Number(summary.predictedTotal)).toLocaleString(
                      "en-LK"
                    )
                  : "-"
              }
              highlight
            />
          </View>

          {!summary.tripId && (
            <View className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
              <Text className="text-amber-700 text-xs font-medium">
                You must Save Trip first (Result screen → “Save Trip”) to get a
                tripId. Then log actuals.
              </Text>
            </View>
          )}
        </View>

        {/* Inputs */}
        <View
          className="bg-white rounded-2xl border border-slate-100 p-5 mb-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Text className="text-xs text-slate-400 font-semibold uppercase mb-3">
            Enter Actual Values
          </Text>

          <View className="mb-4">
            <Text className="text-xs text-slate-500 mb-1.5 font-medium">
              Actual Fuel Used (liters)
            </Text>
            <TextInput
              value={actualFuelLiters}
              onChangeText={setActualFuelLiters}
              placeholder="e.g. 95"
              keyboardType="numeric"
              className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View className="mb-2">
            <Text className="text-xs text-slate-500 mb-1.5 font-medium">
              Actual Catch (kg)
            </Text>
            <TextInput
              value={actualCatchKg}
              onChangeText={setActualCatchKg}
              placeholder="e.g. 420"
              keyboardType="numeric"
              className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <Text className="text-[11px] text-slate-400 mt-2">
            These values feed your dataset/training rows via backend logging.
          </Text>
        </View>

        {/* Actions */}
        <View className="bg-white rounded-2xl border border-slate-100 p-5">
          <Text className="text-xs text-slate-400 font-semibold uppercase mb-3">
            Actions
          </Text>

          <TouchableOpacity
            onPress={onSubmit}
            disabled={saving || !summary.tripId}
            activeOpacity={0.85}
            className={`rounded-xl py-4 items-center ${
              saving || !summary.tripId ? "bg-blue-300" : "bg-blue-600"
            }`}
          >
            {saving ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="white" />
                <Text className="text-white font-bold ml-2">
                  Saving actuals...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-bold text-base">
                ✅ Submit Actuals
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(root)/(tabs)/fishtripcost/history")}
            activeOpacity={0.85}
            className="rounded-xl py-4 items-center bg-slate-900 mt-3"
          >
            <Text className="text-white font-bold text-base">
              📋 Go to History
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const MiniCard = ({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) => {
  return (
    <View className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <Text className="text-xs text-slate-400 font-semibold uppercase mb-2">
        {title}
      </Text>
      <Text
        className={`text-xl font-bold ${
          highlight ? "text-emerald-600" : "text-slate-800"
        }`}
      >
        {value}
      </Text>
    </View>
  );
};

export default LogActualScreen;