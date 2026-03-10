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
  KeyboardAvoidingView,
  Platform,
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
  const prediction = useTripStore((s) => s.datciePrediction);

  const [actualFuelLiters, setActualFuelLiters] = useState("");
  const [actualCatchKg, setActualCatchKg] = useState("");
  const [actualRevenue, setActualRevenue] = useState("");
  const [actualNotes, setActualNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    tripDetails: true,
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
    <SafeAreaView className="flex-1 bg-gray-50">
      <FishTripNavBar />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingHorizontal: 20, 
            paddingTop: 16, 
            paddingBottom: 32 
          }}
        >
          {/* Header Section */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <View className="bg-indigo-100 rounded-xl px-3 py-1.5 mr-2">
                <Text className="text-indigo-700 text-xs font-bold uppercase tracking-wider">
                  DATCIE
                </Text>
              </View>
              <View className="bg-emerald-100 rounded-xl px-3 py-1.5">
                <Text className="text-emerald-700 text-xs font-bold uppercase tracking-wider">
                  Training Mode
                </Text>
              </View>
            </View>

            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Log Actuals
            </Text>
            <Text className="text-base text-gray-600 leading-6">
              Record your actual trip results to improve future predictions and train your boat's AI model.
            </Text>
          </View>

          {/* Trip Status Card */}
          {!summary.tripId ? (
            <View className="bg-amber-50 rounded-2xl border border-amber-200 p-6 mb-6">
              <View className="flex-row items-start mb-4">
                <View className="w-12 h-12 rounded-xl bg-amber-100 items-center justify-center mr-4">
                  <Text className="text-2xl">⚠️</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-amber-900 font-bold text-lg mb-1">
                    No Trip Selected
                  </Text>
                  <Text className="text-amber-700 text-sm leading-5">
                    You need to save a trip first before logging actual data.
                  </Text>
                </View>
              </View>

              <View className="bg-white rounded-xl p-5 mb-4">
                <Text className="text-amber-900 font-semibold text-sm mb-4">
                  Quick Setup Guide:
                </Text>
                <View className="space-y-3">
                  <StepRow number="1" text="Go to Trip Planner" />
                  <StepRow number="2" text="Enter trip details & predict cost" />
                  <StepRow number="3" text="Open the Result screen" />
                  <StepRow number="4" text='Tap "Save Trip"' />
                  <StepRow number="5" text="Return here to log actuals" />
                </View>
              </View>

              <TouchableOpacity
                onPress={() => router.push("/(root)/(tabs)/fishtripcost")}
                className="bg-amber-600 rounded-xl py-4 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-white font-semibold text-base">
                  Go to Trip Planner →
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 mb-6">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-xl bg-emerald-100 items-center justify-center mr-4">
                  <Text className="text-2xl">✅</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-emerald-900 font-bold text-base mb-1">
                    Trip Loaded Successfully
                  </Text>
                  <Text className="text-emerald-700 text-sm">
                    ID: ••••{String(summary.tripId).slice(-6)}
                  </Text>
                </View>
                <View className="bg-emerald-100 rounded-full px-3 py-1.5">
                  <Text className="text-emerald-700 text-xs font-medium">
                    Ready
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Prediction Summary Card */}
          <View className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sm font-semibold text-gray-700">
                Prediction Summary
              </Text>
              <View className="bg-gray-100 rounded-full px-3 py-1">
                <Text className="text-xs text-gray-600">
                  {summary.tripId ? "Active Trip" : "No Active Trip"}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 bg-blue-50 rounded-xl p-4">
                <Text className="text-xs text-blue-600 font-medium mb-2">
                  Predicted Fuel
                </Text>
                <Text className="text-2xl font-bold text-blue-700 mb-1">
                  {summary.predictedFuel !== null
                    ? Number(summary.predictedFuel).toFixed(1)
                    : "-"}
                </Text>
                <Text className="text-xs text-blue-500">liters</Text>
              </View>

              <View className="flex-1 bg-emerald-50 rounded-xl p-4">
                <Text className="text-xs text-emerald-600 font-medium mb-2">
                  Predicted Cost
                </Text>
                <Text className="text-2xl font-bold text-emerald-700 mb-1">
                  {summary.predictedTotal !== null
                    ? Math.round(Number(summary.predictedTotal)).toLocaleString()
                    : "-"}
                </Text>
                <Text className="text-xs text-emerald-500">LKR</Text>
              </View>
            </View>

            {!summary.tripId && (
              <View className="mt-4 bg-amber-50 rounded-xl p-4">
                <Text className="text-amber-700 text-sm">
                  ⚠️ Save a trip first to see predictions and log actuals
                </Text>
              </View>
            )}
          </View>

          {/* ML Info Section */}
          <TouchableOpacity
            onPress={() => toggleSection("mlInfo")}
            activeOpacity={0.7}
            className="bg-white rounded-2xl border border-gray-200 p-5 mb-6"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-xl bg-purple-100 items-center justify-center mr-3">
                  <Text className="text-xl">🧠</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">
                    How This Trains AI
                  </Text>
                  <Text className="text-sm text-gray-500 mt-0.5">
                    {expandedSections.mlInfo ? "Tap to collapse" : "Tap to learn more"}
                  </Text>
                </View>
              </View>
              <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <Text className="text-gray-600 font-bold text-lg">
                  {expandedSections.mlInfo ? "−" : "+"}
                </Text>
              </View>
            </View>

            {expandedSections.mlInfo && (
              <View className="mt-4 pt-4 border-t border-gray-100">
                <View className="space-y-3">
                  <InfoRow
                    icon="📊"
                    text="Your actual trip data becomes a new training sample for the model"
                  />
                  <InfoRow
                    icon="⚙️"
                    text="The AI learns patterns specific to your boat and fishing style"
                  />
                  <InfoRow
                    icon="🎯"
                    text="Predictions become more accurate with each logged trip"
                  />
                  <InfoRow
                    icon="📈"
                    text="Boat-specific coefficients are updated using real outcomes"
                  />
                </View>
                <View className="mt-4 bg-indigo-50 rounded-xl p-4">
                  <Text className="text-indigo-700 text-sm">
                    💡 The more trips you log, the smarter your boat's AI becomes!
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Boat Specs Section */}
          {summary.tripId && (
            <TouchableOpacity
              onPress={() => toggleSection("boatSpecs")}
              activeOpacity={0.7}
              className="bg-white rounded-2xl border border-gray-200 p-5 mb-6"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center mr-3">
                    <Text className="text-xl">🚤</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900">
                      Boat Specifications
                    </Text>
                    <Text className="text-sm text-gray-500 mt-0.5">
                      {expandedSections.boatSpecs ? "Hide details" : "Show details"}
                    </Text>
                  </View>
                </View>
                <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <Text className="text-gray-600 font-bold text-lg">
                    {expandedSections.boatSpecs ? "−" : "+"}
                  </Text>
                </View>
              </View>

              {expandedSections.boatSpecs && (
                <View className="mt-4 pt-4 border-t border-gray-100">
                  <DetailRow label="Boat Name" value={summary.boatName} />
                  <DetailRow label="Boat Type" value={summary.boatType} />
                  <DetailRow label="Engine Power" value={`${summary.engineHP} HP`} isLast />
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Trip Details Section */}
          {summary.tripId && (
            <TouchableOpacity
              onPress={() => toggleSection("tripDetails")}
              activeOpacity={0.7}
              className="bg-white rounded-2xl border border-gray-200 p-5 mb-6"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center mr-3">
                    <Text className="text-xl">📍</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900">
                      Trip Details
                    </Text>
                    <Text className="text-sm text-gray-500 mt-0.5">
                      {expandedSections.tripDetails ? "Hide details" : "Show details"}
                    </Text>
                  </View>
                </View>
                <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <Text className="text-gray-600 font-bold text-lg">
                    {expandedSections.tripDetails ? "−" : "+"}
                  </Text>
                </View>
              </View>

              {expandedSections.tripDetails && (
                <View className="mt-4 pt-4 border-t border-gray-100">
                  <DetailRow label="Distance" value={`${Number(summary.distance).toFixed(1)} km`} />
                  <DetailRow label="Speed" value={`${summary.speed} knots`} />
                  <DetailRow label="Fishing Hours" value={`${summary.fishingHours} hrs`} />
                  <DetailRow label="Trip Days" value={`${summary.numberOfDays} day(s)`} />
                  <DetailRow label="Crew Count" value={`${summary.crewCount} people`} />

                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-3">
                    Weather Conditions
                  </Text>
                  <DetailRow label="Wind Speed" value={`${summary.windSpeed} knots`} />
                  <DetailRow label="Wave Height" value={`${summary.waveHeight} m`} />
                  <DetailRow 
                    label="Severity Index" 
                    value={(summary.weatherSeverity * 100).toFixed(0) + "%"} 
                    isLast 
                  />
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Input Form */}
          <View className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-5">
              Enter Actual Values
            </Text>

            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-gray-700">
                  Actual Fuel Used <Text className="text-red-500">*</Text>
                </Text>
                {summary.predictedFuel !== null && (
                  <View className="bg-blue-50 rounded-full px-3 py-1">
                    <Text className="text-xs text-blue-600">
                      Predicted: {Number(summary.predictedFuel).toFixed(1)} L
                    </Text>
                  </View>
                )}
              </View>
              <TextInput
                value={actualFuelLiters}
                onChangeText={setActualFuelLiters}
                placeholder="e.g. 185.5"
                keyboardType="decimal-pad"
                editable={!!summary.tripId}
                className={`rounded-xl px-4 py-3.5 text-base ${
                  summary.tripId
                    ? "bg-gray-50 border border-gray-300 text-gray-900"
                    : "bg-gray-100 border border-gray-300 text-gray-400"
                }`}
                placeholderTextColor="#9ca3af"
              />
              <Text className="text-xs text-gray-500 mt-2">
                Check fuel gauge before and after the trip
              </Text>
            </View>

            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Actual Catch <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={actualCatchKg}
                onChangeText={setActualCatchKg}
                placeholder="e.g. 142"
                keyboardType="decimal-pad"
                editable={!!summary.tripId}
                className={`rounded-xl px-4 py-3.5 text-base ${
                  summary.tripId
                    ? "bg-gray-50 border border-gray-300 text-gray-900"
                    : "bg-gray-100 border border-gray-300 text-gray-400"
                }`}
                placeholderTextColor="#9ca3af"
              />
              <Text className="text-xs text-gray-500 mt-2">
                Total weight in kilograms
              </Text>
            </View>

            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Actual Revenue <Text className="text-gray-400">(Optional)</Text>
              </Text>
              <TextInput
                value={actualRevenue}
                onChangeText={setActualRevenue}
                placeholder="e.g. 85200"
                keyboardType="decimal-pad"
                editable={!!summary.tripId}
                className={`rounded-xl px-4 py-3.5 text-base ${
                  summary.tripId
                    ? "bg-gray-50 border border-gray-300 text-gray-900"
                    : "bg-gray-100 border border-gray-300 text-gray-400"
                }`}
                placeholderTextColor="#9ca3af"
              />
              <Text className="text-xs text-gray-500 mt-2">
                Total sales amount in LKR
              </Text>
            </View>

            <View className="mb-3">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Trip Notes <Text className="text-gray-400">(Optional)</Text>
              </Text>
              <TextInput
                value={actualNotes}
                onChangeText={setActualNotes}
                placeholder="e.g. Good weather, found school early"
                multiline
                numberOfLines={4}
                editable={!!summary.tripId}
                className={`rounded-xl px-4 py-3.5 text-base min-h-[100px] ${
                  summary.tripId
                    ? "bg-gray-50 border border-gray-300 text-gray-900"
                    : "bg-gray-100 border border-gray-300 text-gray-400"
                }`}
                placeholderTextColor="#9ca3af"
                textAlignVertical="top"
              />
            </View>

            <View className="mt-4 bg-indigo-50 rounded-xl p-4">
              <Text className="text-indigo-700 text-sm leading-5">
                🤖 These actual values will be used to train your boat-specific AI model, making future predictions more accurate.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-4">
              Actions
            </Text>

            <TouchableOpacity
              onPress={onSubmit}
              disabled={saving || !summary.tripId}
              activeOpacity={0.7}
              className={`rounded-xl py-4 items-center mb-3 ${
                saving || !summary.tripId ? "bg-indigo-300" : "bg-indigo-600"
              }`}
            >
              {saving ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="white" />
                  <Text className="text-white font-semibold ml-2 text-base">
                    Saving...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-base">
                  Submit & Train Model
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(root)/(tabs)/fishtripcost/history")}
              activeOpacity={0.7}
              className="rounded-xl py-4 items-center bg-gray-900"
            >
              <Text className="text-white font-semibold text-base">
                View History
              </Text>
            </TouchableOpacity>

            <Text className="text-xs text-gray-500 text-center mt-4 leading-5">
              Your boat's learning coefficients will update automatically based on the difference between predicted and actual results.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Helper Components
const StepRow = ({ number, text }: { number: string; text: string }) => (
  <View className="flex-row items-center">
    <View className="w-6 h-6 rounded-full bg-amber-100 items-center justify-center mr-3">
      <Text className="text-amber-700 text-xs font-bold">{number}</Text>
    </View>
    <Text className="text-amber-800 text-sm flex-1">{text}</Text>
  </View>
);

const InfoRow = ({ icon, text }: { icon: string; text: string }) => (
  <View className="flex-row items-start">
    <View className="w-8 h-8 rounded-lg bg-purple-100 items-center justify-center mr-3">
      <Text className="text-base">{icon}</Text>
    </View>
    <Text className="text-gray-700 text-sm flex-1 leading-5">{text}</Text>
  </View>
);

const DetailRow = ({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) => (
  <View className={`flex-row justify-between py-2.5 ${!isLast ? "border-b border-gray-100" : ""}`}>
    <Text className="text-gray-600 text-sm">{label}</Text>
    <Text className="text-gray-900 font-medium text-sm">{value}</Text>
  </View>
);

export default LogActualScreen;