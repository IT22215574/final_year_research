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
import FishTripNavBar from "./components/FishTripNavBar";

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
  const [actualRevenue, setActualRevenue] = useState("");
  const [actualNotes, setActualNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    tripDetails: false,
    boatSpecs: false,
    mlInfo: false,
  });

  const summary = useMemo(() => {
    const predictedFuel =
      prediction?.fuel?.predictedFuelLiters ??
      prediction?.predictedFuelLiters ??
      null;

    const predictedTotal =
      prediction?.cost?.predictedTotalCost ??
      prediction?.predictedTotalCost ??
      null;

    const tripId =
      lastSavedTripId || lastSavedTrip?._id || lastSavedTrip?.id || null;

    // Extract trip details from lastSavedTrip or prediction
    const boatName =
      lastSavedTrip?.boat?.boatName ||
      lastSavedTrip?.boatName ||
      "Unknown Boat";
    const boatType =
      lastSavedTrip?.boat?.boatType || lastSavedTrip?.boatType || "N/A";
    const engineHP =
      lastSavedTrip?.boat?.engineHorsePower ||
      lastSavedTrip?.engineHorsePower ||
      "N/A";
    const distance =
      lastSavedTrip?.distanceKm ||
      prediction?.distance?.predictedDistanceKm ||
      0;
    const speed = lastSavedTrip?.speed || lastSavedTrip?.averageSpeed || 0;
    const fishingHours = lastSavedTrip?.fishingHours || 0;
    const numberOfDays = lastSavedTrip?.numberOfDays || 0;
    const crewCount = lastSavedTrip?.crewCount || 0;
    const windSpeed = lastSavedTrip?.windSpeed || 0;
    const waveHeight = lastSavedTrip?.waveHeight || 0;
    const weatherSeverity =
      lastSavedTrip?.weatherSeverityIndex || prediction?.weather?.wsi || 0;

    return {
      predictedFuel,
      predictedTotal,
      tripId,
      boatName,
      boatType,
      engineHP,
      distance,
      speed,
      fishingHours,
      numberOfDays,
      crewCount,
      windSpeed,
      waveHeight,
      weatherSeverity,
    };
  }, [prediction, lastSavedTripId, lastSavedTrip]);

  const toggleSection = (section: "tripDetails" | "boatSpecs" | "mlInfo") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const onSubmit = async () => {
    const tripId = summary.tripId;

    console.log("🔍 Log Actual Debug:", {
      tripId,
      lastSavedTripId,
      hasLastSavedTrip: !!lastSavedTrip,
      actualFuelLiters,
      actualCatchKg,
    });

    if (!tripId) {
      Alert.alert(
        "❌ No Saved Trip Found",
        "You need to save a trip first!\n\n" +
          "Steps:\n" +
          "1. Go to Trip Planner\n" +
          "2. Fill in trip details\n" +
          "3. Click 'Predict Cost'\n" +
          "4. Go to Result tab\n" +
          "5. Click 'Save Trip'\n" +
          "6. Then come back here to log actuals",
      );
      return;
    }

    const fuel = num(actualFuelLiters);
    const catchKg = num(actualCatchKg);

    if (!Number.isFinite(fuel) || fuel <= 0) {
      Alert.alert(
        "⛽ Invalid Fuel",
        "Please enter actual fuel used in liters.\n\nExample: 185.5",
      );
      return;
    }

    if (!Number.isFinite(catchKg) || catchKg < 0) {
      Alert.alert(
        "🐟 Invalid Catch",
        "Please enter total fish caught in kg.\n\nExample: 142\n\nTip: Enter 0 if no catch.",
      );
      return;
    }

    try {
      setSaving(true);

      const revenue = num(actualRevenue);

      const payload = {
        actualFuelLiters: fuel,
        actualCatchKg: catchKg,
        ...(Number.isFinite(revenue) && revenue > 0
          ? { actualRevenue: revenue }
          : {}),
        ...(actualNotes.trim() ? { actualNotes: actualNotes.trim() } : {}),
      };

      console.log("📤 Sending log-actual request:", {
        tripId,
        payload,
      });

      await logActualTripDatcie(String(tripId), payload);

      console.log("✅ Log-actual successful");

      Alert.alert(
        "✅ ML Training Complete",
        "Actual data logged successfully!\n\n" +
          "• Your boat's prediction model has been updated\n" +
          "• Future predictions will be more accurate\n" +
          "• Learning data added to dataset\n\n" +
          `Fuel Used: ${fuel} L\n` +
          `Catch: ${catchKg} kg`,
      );

      // Clear form
      setActualFuelLiters("");
      setActualCatchKg("");
      setActualRevenue("");
      setActualNotes("");

      router.push("/(root)/(tabs)/fishtripcost/history");
    } catch (e: any) {
      console.error("❌ Log-actual error:", e);
      Alert.alert(
        "❌ Log Actual Failed",
        e?.message ||
          "Request failed. Please check your internet connection and try again.",
      );
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
        {/* Trip Status Card */}
        {!summary.tripId ? (
          <View className="bg-orange-50 rounded-2xl border border-orange-200 p-5 mb-4">
            <View className="flex-row items-center mb-3">
              <Text className="text-2xl mr-2">⚠️</Text>
              <Text className="text-orange-900 font-bold text-base flex-1">
                No Trip Selected
              </Text>
            </View>
            <Text className="text-orange-700 text-sm leading-5 mb-3">
              You need to save a trip before logging actual data.
            </Text>
            <View className="bg-white rounded-xl p-3 border border-orange-100">
              <Text className="text-orange-900 font-semibold text-xs mb-2">
                📋 Quick Steps:
              </Text>
              <Text className="text-orange-700 text-xs leading-4">
                1. Go to Trip Planner tab{"\n"}
                2. Fill trip details & predict cost{"\n"}
                3. Go to Result tab{"\n"}
                4. Click "Save Trip" button{"\n"}
                5. Return here to log actuals
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(root)/(tabs)/fishtripcost")}
              className="bg-orange-600 rounded-xl py-3 items-center mt-3"
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold">← Go to Trip Planner</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-green-50 rounded-2xl border border-green-200 p-4 mb-4">
            <View className="flex-row items-center">
              <Text className="text-2xl mr-2">✅</Text>
              <View className="flex-1">
                <Text className="text-green-900 font-bold text-sm">
                  Trip Loaded
                </Text>
                <Text className="text-green-700 text-xs mt-0.5">
                  ID: {summary.tripId.slice(-8)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ML Training Info Card */}
        <TouchableOpacity
          onPress={() => toggleSection("mlInfo")}
          activeOpacity={0.8}
          className="bg-blue-50 rounded-2xl border border-blue-100 p-5 mb-4"
          style={{
            shadowColor: "#3b82f6",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Text className="text-2xl mr-2">🧠</Text>
              <Text className="text-blue-900 font-bold text-base">
                How This Trains AI
              </Text>
            </View>
            <Text className="text-blue-600 font-bold">
              {expandedSections.mlInfo ? "▼" : "▶"}
            </Text>
          </View>

          {expandedSections.mlInfo && (
            <View className="mt-3">
              <InfoRow
                icon="📊"
                text="Your actual data becomes a training sample"
              />
              <InfoRow
                icon="⚙️"
                text="ML model learns boat-specific patterns"
              />
              <InfoRow
                icon="🎯"
                text="Predictions get more accurate over time"
              />
              <InfoRow icon="📈" text="Fuel efficiency factors auto-adjust" />
              <View className="mt-3 bg-white rounded-xl p-3">
                <Text className="text-blue-700 text-xs font-medium">
                  💡 More actuals = Better predictions for YOUR boat!
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

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
              {summary.tripId
                ? String(summary.tripId).slice(-8)
                : "Not saved yet"}
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
                      "en-LK",
                    )
                  : "-"
              }
              highlight
            />
          </View>

          {!summary.tripId && (
            <View className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
              <Text className="text-amber-700 text-xs font-medium">
                ⚠️ You must Save Trip first (Result screen → "Save Trip") to get
                a tripId. Then log actuals.
              </Text>
            </View>
          )}
        </View>

        {/* Boat Specifications */}
        {summary.tripId && (
          <TouchableOpacity
            onPress={() => toggleSection("boatSpecs")}
            activeOpacity={0.8}
            className="bg-white rounded-2xl border border-slate-100 p-5 mb-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs text-slate-400 font-semibold uppercase">
                🚤 Boat Specifications
              </Text>
              <Text className="text-slate-500 font-bold">
                {expandedSections.boatSpecs ? "▼" : "▶"}
              </Text>
            </View>

            {expandedSections.boatSpecs && (
              <>
                <DetailRow label="Boat Name" value={summary.boatName} />
                <DetailRow label="Type" value={summary.boatType} />
                <DetailRow
                  label="Engine Power"
                  value={`${summary.engineHP} HP`}
                />
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Trip Details */}
        {summary.tripId && (
          <TouchableOpacity
            onPress={() => toggleSection("tripDetails")}
            activeOpacity={0.8}
            className="bg-white rounded-2xl border border-slate-100 p-5 mb-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs text-slate-400 font-semibold uppercase">
                📍 Trip Details
              </Text>
              <Text className="text-slate-500 font-bold">
                {expandedSections.tripDetails ? "▼" : "▶"}
              </Text>
            </View>

            {expandedSections.tripDetails && (
              <>
                <DetailRow
                  label="Distance"
                  value={`${summary.distance.toFixed(1)} km`}
                />
                <DetailRow label="Speed" value={`${summary.speed} knots`} />
                <DetailRow
                  label="Fishing Hours"
                  value={`${summary.fishingHours} hrs`}
                />
                <DetailRow
                  label="Trip Days"
                  value={`${summary.numberOfDays} day(s)`}
                />
                <DetailRow
                  label="Crew Count"
                  value={`${summary.crewCount} people`}
                />
                <View className="mt-2 pt-2 border-t border-slate-100">
                  <Text className="text-xs text-slate-400 font-semibold mb-2">
                    Weather
                  </Text>
                  <DetailRow
                    label="Wind Speed"
                    value={`${summary.windSpeed} knots`}
                  />
                  <DetailRow
                    label="Wave Height"
                    value={`${summary.waveHeight} m`}
                  />
                  <DetailRow
                    label="Severity Index"
                    value={(summary.weatherSeverity * 100).toFixed(0) + "%"}
                  />
                </View>
              </>
            )}
          </TouchableOpacity>
        )}

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
            📝 Enter Actual Values (Required)
          </Text>

          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs text-slate-500 font-medium">
                Actual Fuel Used (liters){" "}
                <Text className="text-red-500">*</Text>
              </Text>
              {summary.predictedFuel && (
                <Text className="text-[10px] text-blue-600 font-semibold">
                  Predicted: {summary.predictedFuel.toFixed(1)} L
                </Text>
              )}
            </View>
            <TextInput
              value={actualFuelLiters}
              onChangeText={setActualFuelLiters}
              placeholder="e.g. 185.5"
              keyboardType="decimal-pad"
              className={`rounded-xl p-3.5 font-semibold ${
                summary.tripId
                  ? "bg-slate-50 border border-slate-200 text-slate-800"
                  : "bg-slate-100 border border-slate-300 text-slate-400"
              }`}
              placeholderTextColor="#94a3b8"
            />
            <Text className="text-[10px] text-slate-400 mt-1">
              💡 Check fuel gauge before/after trip for accuracy
            </Text>
          </View>

          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs text-slate-500 font-medium">
                Actual Catch (kg) <Text className="text-red-500">*</Text>
              </Text>
            </View>
            <TextInput
              value={actualCatchKg}
              onChangeText={setActualCatchKg}
              placeholder="e.g. 142"
              keyboardType="decimal-pad"
              className={`rounded-xl p-3.5 font-semibold ${
                summary.tripId
                  ? "bg-slate-50 border border-slate-200 text-slate-800"
                  : "bg-slate-100 border border-slate-300 text-slate-400"
              }`}
              placeholderTextColor="#94a3b8"
            />
            <Text className="text-[10px] text-slate-400 mt-1">
              🐟 Total weight of all fish caught
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-xs text-slate-500 mb-1.5 font-medium">
              Actual Revenue (Rs){" "}
              <Text className="text-slate-400">(Optional)</Text>
            </Text>
            <TextInput
              value={actualRevenue}
              onChangeText={setActualRevenue}
              placeholder="e.g. 85200"
              keyboardType="decimal-pad"
              className={`rounded-xl p-3.5 ${
                summary.tripId
                  ? "bg-slate-50 border border-slate-200 text-slate-800"
                  : "bg-slate-100 border border-slate-300 text-slate-400"
              }`}
              placeholderTextColor="#94a3b8"
            />
            <Text className="text-[10px] text-slate-400 mt-1">
              💰 Total money from fish sales
            </Text>
          </View>

          <View className="mb-2">
            <Text className="text-xs text-slate-500 mb-1.5 font-medium">
              Trip Notes <Text className="text-slate-400">(Optional)</Text>
            </Text>
            <TextInput
              value={actualNotes}
              onChangeText={setActualNotes}
              placeholder="e.g. Good weather, found school early"
              multiline
              numberOfLines={3}
              className={`rounded-xl p-3.5 ${
                summary.tripId
                  ? "bg-slate-50 border border-slate-200 text-slate-800"
                  : "bg-slate-100 border border-slate-300 text-slate-400"
              }`}
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />
          </View>

          <View className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <Text className="text-blue-700 text-[11px] font-medium">
              🤖 These values train your boat's AI model to predict more
              accurately next time!
            </Text>
          </View>
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
                🚀 Submit & Train Model
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

          <View className="mt-4 bg-slate-50 rounded-xl p-3">
            <Text className="text-slate-500 text-[10px] text-center">
              After submission, your boat's ML coefficients will auto-update
              {"\n"}
              based on prediction vs actual comparison 📊
            </Text>
          </View>
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

const DetailRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <View className="flex-row justify-between items-center py-2 border-b border-slate-50">
      <Text className="text-slate-500 text-sm">{label}</Text>
      <Text className="text-slate-800 font-semibold text-sm">{value}</Text>
    </View>
  );
};

const InfoRow = ({ icon, text }: { icon: string; text: string }) => {
  return (
    <View className="flex-row items-start">
      <Text className="mr-2">{icon}</Text>
      <Text className="text-blue-700 text-xs flex-1">{text}</Text>
    </View>
  );
};

export default LogActualScreen;
