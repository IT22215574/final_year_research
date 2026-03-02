import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  predictFuelCost,
  predictTripCost,
  getOptimizationRecommendations,
} from "@/services/tripService";
import { router } from "expo-router";
import useFishingZoneStore from "@/stores/fishingZoneStore";
import BoatSelectionModal from "@/components/BoatSelectionModal";
import { boatTypes } from "@/constants";

const TripPlanner = () => {
  const [distance, setDistance] = useState("");
  const [engineHP, setEngineHP] = useState("");
  const [duration, setDuration] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [waveHeight, setWaveHeight] = useState("");
  const [fuelPrice, setFuelPrice] = useState("350");

  const [selectedBoatId, setSelectedBoatId] = useState<number | null>(null);
  const [selectedBoatName, setSelectedBoatName] = useState<string>("");
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [useEngineHPDropdown, setUseEngineHPDropdown] = useState(true);
  const [selectedEngineHPFromDropdown, setSelectedEngineHPFromDropdown] =
    useState<string>("");

  const { selectedZones, clearZones, keepLastZone } = useFishingZoneStore();

  const [predictedFuel, setPredictedFuel] = useState<number | null>(null);
  const [predictedCost, setPredictedCost] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<string[] | null>(null);
  const [riskScore, setRiskScore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedZones.length > 0) {
      const totalDist = selectedZones.reduce((sum: number, zone: any) => {
        let zoneDist = 0;
        if (typeof zone.distance === "number") zoneDist = zone.distance;
        else if (typeof zone.distance === "string") zoneDist = parseFloat(zone.distance) || 0;
        return sum + zoneDist;
      }, 0);
      setDistance(totalDist.toFixed(2));
    } else {
      setDistance("");
    }
  }, [selectedZones]);

  const getCurrentBoatEngineOptions = () => {
    if (!selectedBoatId) return [];
    const boat = boatTypes.find((b) => b.id === selectedBoatId);
    return boat?.engineHPOptions || [];
  };

  const getCurrentBoat = () => {
    if (!selectedBoatId) return null;
    return boatTypes.find((b) => b.id === selectedBoatId);
  };

  const handleBoatSelect = (boatId: number, boatName: string, defaultEngineHP: number, customEngineHP?: string) => {
    setSelectedBoatId(boatId);
    setSelectedBoatName(boatName);
    if (customEngineHP && customEngineHP.trim() !== "") {
      setEngineHP(customEngineHP);
      setUseEngineHPDropdown(false);
      setSelectedEngineHPFromDropdown("");
    } else {
      setSelectedEngineHPFromDropdown(defaultEngineHP.toString());
      setEngineHP(defaultEngineHP.toString());
      setUseEngineHPDropdown(true);
    }
  };

  const getFinalEngineHP = () => useEngineHPDropdown ? selectedEngineHPFromDropdown : engineHP;

  const handlePredict = async () => {
    const finalEngineHP = getFinalEngineHP();
    if (!distance || !finalEngineHP || !duration || !windSpeed || !waveHeight || !fuelPrice) {
      Alert.alert("Missing Fields", "Please fill all fields before predicting");
      return;
    }
    try {
      setLoading(true);
      const fuelPrediction = await predictFuelCost({
        distanceKm: parseFloat(distance),
        engineHorsePower: parseFloat(finalEngineHP),
        windSpeed: parseFloat(windSpeed),
        waveHeight: parseFloat(waveHeight),
        tripDurationHours: parseFloat(duration),
      });
      const costPrediction = await predictTripCost({
        distanceKm: parseFloat(distance),
        engineHorsePower: parseFloat(finalEngineHP),
        windSpeed: parseFloat(windSpeed),
        waveHeight: parseFloat(waveHeight),
        tripDurationHours: parseFloat(duration),
        fuelPricePerLiter: parseFloat(fuelPrice),
      });
      const mlRecommendations = await getOptimizationRecommendations({
        distanceKm: parseFloat(distance),
        windSpeed: parseFloat(windSpeed),
        waveHeight: parseFloat(waveHeight),
      });
      setPredictedFuel(fuelPrediction.predictedFuelLiters);
      setPredictedCost(costPrediction.predictedCost);
      setRecommendations(mlRecommendations.recommendations || []);
      setRiskScore(mlRecommendations.riskScore || null);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "ML service unavailable or invalid input");
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = () => router.push("/(root)/(tabs)/fishtripcost/mapview");

  const getRiskStyle = (risk: string | null) => {
    switch (risk?.toLowerCase()) {
      case "low": return { container: "bg-emerald-50 border border-emerald-200", bar: "bg-emerald-500", text: "text-emerald-700", badge: "bg-emerald-100" };
      case "medium": return { container: "bg-amber-50 border border-amber-200", bar: "bg-amber-500", text: "text-amber-700", badge: "bg-amber-100" };
      case "high": return { container: "bg-rose-50 border border-rose-200", bar: "bg-rose-500", text: "text-rose-700", badge: "bg-rose-100" };
      default: return { container: "bg-slate-50 border border-slate-200", bar: "bg-slate-400", text: "text-slate-700", badge: "bg-slate-100" };
    }
  };

  const formatDistance = (dist: any): string => {
    if (typeof dist === "number") return dist.toFixed(1);
    if (typeof dist === "string") return parseFloat(dist).toFixed(1);
    return "0.0";
  };

  const hasResults = predictedFuel !== null || predictedCost !== null || riskScore || (recommendations && recommendations.length > 0);
  const riskStyle = getRiskStyle(riskScore);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pt-3 pb-3 flex-row justify-between items-center bg-white border-b border-slate-100">
        <View>
          <Text className="text-xl font-bold text-slate-900 tracking-tight">Trip Planner</Text>
          <Text className="text-xs text-slate-400 mt-0.5">ML-powered cost prediction</Text>
        </View>
        <View className="flex-row gap-2">
          {selectedZones.length > 0 && (
            <TouchableOpacity
              onPress={clearZones}
              className="border border-rose-200 bg-rose-50 rounded-xl px-3 py-2 flex-row items-center"
              activeOpacity={0.7}
            >
              <Text className="text-rose-500 mr-1.5">🗑️</Text>
              <Text className="text-rose-600 font-medium text-sm">Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleMapPress}
            className="bg-blue-600 rounded-xl px-3 py-2 flex-row items-center"
            activeOpacity={0.7}
          >
            <Text className="text-white mr-1.5">🗺️</Text>
            <Text className="text-white font-semibold text-sm">Map View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Zones */}
      {selectedZones.length > 0 && (
        <View className="bg-blue-600 mx-4 mt-3 rounded-2xl p-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white font-semibold text-sm">
              {selectedZones.length} Zone{selectedZones.length > 1 ? "s" : ""} Selected
            </Text>
            <View className="bg-white/20 rounded-full px-3 py-1">
              <Text className="text-white font-bold text-xs">
                {parseFloat(distance || "0").toFixed(1)} km total
              </Text>
            </View>
          </View>

          {selectedZones.map((zone, index) => (
            <View key={zone.id} className="flex-row items-center mb-2 bg-white/10 rounded-xl px-3 py-2.5">
              <View className="w-7 h-7 rounded-full bg-white/20 items-center justify-center mr-3">
                <Text className="text-white font-bold text-xs">{index + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium text-sm">{zone.name}</Text>
                <Text className="text-blue-200 text-xs">{zone.fishType || "Various fish"}</Text>
              </View>
              <View className="items-end">
                <Text className="text-white font-bold text-sm">{formatDistance(zone.distance)} km</Text>
                <Text className="text-blue-200 text-xs">{zone.estimatedCatch || "Medium"} catch</Text>
              </View>
            </View>
          ))}

          <View className="flex-row gap-2 mt-2">
            <TouchableOpacity onPress={clearZones} className="flex-1 bg-white/10 rounded-xl py-2.5 items-center" activeOpacity={0.7}>
              <Text className="text-white text-sm font-medium">Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={keepLastZone} className="flex-1 bg-white/20 rounded-xl py-2.5 items-center" activeOpacity={0.7}>
              <Text className="text-white text-sm font-semibold">Keep Last</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Input Card */}
        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
          <View className="flex-row items-center mb-5">
            <View className="w-1.5 h-5 bg-blue-600 rounded-full mr-2.5" />
            <Text className="text-base font-semibold text-slate-800">Trip Parameters</Text>
          </View>

          {/* Boat Selection */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Vessel</Text>
            <TouchableOpacity
              onPress={() => setShowBoatModal(true)}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex-row justify-between items-center"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mr-3">
                  <Text className="text-xl">🚢</Text>
                </View>
                <View className="flex-1">
                  {selectedBoatName ? (
                    <>
                      <Text className="text-slate-800 font-semibold text-sm">{selectedBoatName}</Text>
                      <Text className="text-blue-500 text-xs mt-0.5">
                        {getCurrentBoat()?.engineModel} · {getCurrentBoat()?.fuelType}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text className="text-slate-700 font-medium text-sm">Select boat type</Text>
                      <Text className="text-slate-400 text-xs mt-0.5">5 options available</Text>
                    </>
                  )}
                </View>
              </View>
              <View className="bg-slate-200 rounded-lg w-7 h-7 items-center justify-center">
                <Text className="text-slate-500 text-sm font-bold">›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* No boat selected warning */}
          {!selectedBoatId && (
            <View className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 flex-row items-center">
              <Text className="text-base mr-2">⚠️</Text>
              <Text className="text-amber-700 text-xs flex-1 font-medium">
                Select a boat type to enable engine HP options
              </Text>
            </View>
          )}

          {/* Engine HP */}
          {selectedBoatId && (
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Engine HP
                  {getFinalEngineHP() ? (
                    <Text className="text-blue-600 normal-case font-bold"> · {getFinalEngineHP()} HP</Text>
                  ) : null}
                </Text>
                <TouchableOpacity
                  onPress={() => setUseEngineHPDropdown(!useEngineHPDropdown)}
                  className="bg-slate-100 rounded-lg px-2.5 py-1"
                >
                  <Text className="text-xs text-slate-600 font-medium">
                    {useEngineHPDropdown ? "✏️ Manual" : "📋 List"}
                  </Text>
                </TouchableOpacity>
              </View>
              {useEngineHPDropdown ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {getCurrentBoatEngineOptions().map((hp) => (
                      <TouchableOpacity
                        key={hp}
                        onPress={() => { setSelectedEngineHPFromDropdown(hp.toString()); setEngineHP(hp.toString()); }}
                        className={`px-4 py-2.5 rounded-xl border ${selectedEngineHPFromDropdown === hp.toString() ? "bg-blue-600 border-blue-600" : "bg-white border-slate-200"}`}
                        activeOpacity={0.7}
                      >
                        <Text className={`font-semibold text-sm ${selectedEngineHPFromDropdown === hp.toString() ? "text-white" : "text-slate-700"}`}>
                          {hp} HP
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <TextInput
                  placeholder="Enter engine HP"
                  keyboardType="numeric"
                  value={engineHP}
                  onChangeText={setEngineHP}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
                  placeholderTextColor="#94a3b8"
                />
              )}
            </View>
          )}

          {/* Fields label */}
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Route & Conditions</Text>

          {/* Row 1 */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1.5 font-medium">Distance (km)</Text>
              <TextInput
                placeholder="0"
                keyboardType="numeric"
                value={distance}
                onChangeText={setDistance}
                editable={selectedZones.length === 0}
                className={`border rounded-xl p-3.5 text-slate-800 ${selectedZones.length > 0 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-slate-50 border-slate-200"}`}
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1.5 font-medium">Duration (hrs)</Text>
              <TextInput
                placeholder="0"
                keyboardType="numeric"
                value={duration}
                onChangeText={setDuration}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* Row 2 */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1.5 font-medium">Fuel Price (Rs/L)</Text>
              <TextInput
                placeholder="350"
                keyboardType="numeric"
                value={fuelPrice}
                onChangeText={setFuelPrice}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1.5 font-medium">Wind Speed (km/h)</Text>
              <TextInput
                placeholder="0"
                keyboardType="numeric"
                value={windSpeed}
                onChangeText={setWindSpeed}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* Wave Height */}
          <View className="mb-5">
            <Text className="text-xs text-slate-500 mb-1.5 font-medium">Wave Height (m)</Text>
            <TextInput
              placeholder="0"
              keyboardType="numeric"
              value={waveHeight}
              onChangeText={setWaveHeight}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Predict Button */}
          <TouchableOpacity
            onPress={handlePredict}
            disabled={loading}
            activeOpacity={0.8}
            className={`rounded-xl py-4 items-center ${loading ? "bg-blue-400" : "bg-blue-600"}`}
            style={{ shadowColor: "#2563eb", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            <Text className="text-white font-bold text-base tracking-wide">
              {loading ? "⏳  Calculating..." : "⚡  Predict Cost"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {hasResults && (
          <View className="gap-3">
            {/* Fuel & Cost row */}
            {(predictedFuel !== null || predictedCost !== null) && (
              <View className="flex-row gap-3">
                {predictedFuel !== null && (
                  <View className="flex-1 bg-white rounded-2xl border border-slate-100 p-4" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
                    <View className="w-9 h-9 bg-sky-50 rounded-xl items-center justify-center mb-2.5">
                      <Text className="text-lg">⛽</Text>
                    </View>
                    <Text className="text-2xl font-bold text-slate-800">{predictedFuel.toFixed(1)}</Text>
                    <Text className="text-xs text-slate-400 mt-0.5 font-medium">Liters fuel</Text>
                  </View>
                )}
                {predictedCost !== null && (
                  <View className="flex-1 bg-white rounded-2xl border border-slate-100 p-4" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
                    <View className="w-9 h-9 bg-emerald-50 rounded-xl items-center justify-center mb-2.5">
                      <Text className="text-lg">💰</Text>
                    </View>
                    <Text className="text-xl font-bold text-emerald-600">Rs. {predictedCost.toFixed(0)}</Text>
                    <Text className="text-xs text-slate-400 mt-0.5 font-medium">Trip cost</Text>
                  </View>
                )}
              </View>
            )}

            {/* Risk Score */}
            {riskScore && (
              <View className={`rounded-2xl p-4 ${riskStyle.container}`}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className={`w-9 h-9 ${riskStyle.badge} rounded-xl items-center justify-center mr-3`}>
                      <Text className="text-lg">⚠️</Text>
                    </View>
                    <View>
                      <Text className="text-xs text-slate-500 font-medium">Risk Level</Text>
                      <Text className={`font-bold text-lg capitalize ${riskStyle.text}`}>{riskScore}</Text>
                    </View>
                  </View>
                  <View className={`${riskStyle.badge} rounded-full px-3 py-1`}>
                    <Text className={`text-xs font-semibold ${riskStyle.text}`}>ML Analysis</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <View className="bg-white rounded-2xl border border-slate-100 p-5" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
                <View className="flex-row items-center mb-4">
                  <View className="w-9 h-9 bg-violet-50 rounded-xl items-center justify-center mr-3">
                    <Text className="text-lg">📝</Text>
                  </View>
                  <Text className="text-base font-semibold text-slate-800">Recommendations</Text>
                </View>
                {recommendations.map((rec, idx) => (
                  <View key={idx} className="flex-row items-start mb-3">
                    <View className="w-5 h-5 rounded-full bg-blue-600 items-center justify-center mr-3 mt-0.5">
                      <Text className="text-white text-xs font-bold">{idx + 1}</Text>
                    </View>
                    <Text className="flex-1 text-slate-600 text-sm leading-5">{rec}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <BoatSelectionModal
        visible={showBoatModal}
        onClose={() => setShowBoatModal(false)}
        onSelectBoat={handleBoatSelect}
        selectedBoatId={selectedBoatId || undefined}
      />
    </SafeAreaView>
  );
};

export default TripPlanner;