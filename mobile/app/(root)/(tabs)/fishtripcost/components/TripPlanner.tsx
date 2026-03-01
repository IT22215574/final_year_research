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

  // Boat selection states
  const [selectedBoatId, setSelectedBoatId] = useState<number | null>(null);
  const [selectedBoatName, setSelectedBoatName] = useState<string>("");
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [useEngineHPDropdown, setUseEngineHPDropdown] = useState(true);
  const [selectedEngineHPFromDropdown, setSelectedEngineHPFromDropdown] = useState<string>("");

  // Use Zustand store instead of local state
  const { selectedZones, clearZones, keepLastZone } = useFishingZoneStore();

  const [predictedFuel, setPredictedFuel] = useState<number | null>(null);
  const [predictedCost, setPredictedCost] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<string[] | null>(null);
  const [riskScore, setRiskScore] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // Calculate total distance from selected zones
  useEffect(() => {
    if (selectedZones.length > 0) {
      const totalDist = selectedZones.reduce((sum: number, zone: any) => {
        let zoneDist = 0;
        if (typeof zone.distance === "number") {
          zoneDist = zone.distance;
        } else if (typeof zone.distance === "string") {
          zoneDist = parseFloat(zone.distance) || 0;
        }
        return sum + zoneDist;
      }, 0);
      
      setDistance(totalDist.toFixed(2));
    } else {
      setDistance("");
    }
  }, [selectedZones]);

  // Get current boat's engine HP options
  const getCurrentBoatEngineOptions = () => {
    if (!selectedBoatId) return [];
    const boat = boatTypes.find((b) => b.id === selectedBoatId);
    return boat?.engineHPOptions || [];
  };

  // Get current boat details
  const getCurrentBoat = () => {
    if (!selectedBoatId) return null;
    return boatTypes.find((b) => b.id === selectedBoatId);
  };

  // Handle boat selection from modal
  const handleBoatSelect = (boatId: number, boatName: string, defaultEngineHP: number, customEngineHP?: string) => {
    setSelectedBoatId(boatId);
    setSelectedBoatName(boatName);
    
    // If custom engine HP is provided, use it and switch to manual mode
    if (customEngineHP && customEngineHP.trim() !== '') {
      setEngineHP(customEngineHP);
      setUseEngineHPDropdown(false);
      setSelectedEngineHPFromDropdown('');
    } else {
      // Otherwise use the default HP from the boat type
      setSelectedEngineHPFromDropdown(defaultEngineHP.toString());
      setEngineHP(defaultEngineHP.toString());
      setUseEngineHPDropdown(true);
    }
  };

  // Get final engine HP value
  const getFinalEngineHP = () => {
    return useEngineHPDropdown ? selectedEngineHPFromDropdown : engineHP;
  };

  const handlePredict = async () => {
    const finalEngineHP = getFinalEngineHP();
    
    if (
      !distance ||
      !finalEngineHP ||
      !duration ||
      !windSpeed ||
      !waveHeight ||
      !fuelPrice
    ) {
      Alert.alert("Error", "Please fill all fields before predicting");
      return;
    }

    try {
      setLoading(true);
      
      const finalEngineHP = getFinalEngineHP();

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

  // Map button handler - simple navigation since store persists data
  const handleMapPress = () => {
    router.push("/(root)/(tabs)/fishtripcost/mapview");
  };

  const getRiskColor = (risk: string | null) => {
    switch (risk?.toLowerCase()) {
      case "low":
        return "bg-emerald-50 border-l-4 border-emerald-500";
      case "medium":
        return "bg-amber-50 border-l-4 border-amber-500";
      case "high":
        return "bg-rose-50 border-l-4 border-rose-500";
      default:
        return "bg-gray-50 border-l-4 border-gray-400";
    }
  };

  const getRiskTextColor = (risk: string | null) => {
    switch (risk?.toLowerCase()) {
      case "low":
        return "text-emerald-700";
      case "medium":
        return "text-amber-700";
      case "high":
        return "text-rose-700";
      default:
        return "text-gray-700";
    }
  };

  // Calculate individual zone distances for display
  const formatDistance = (dist: any): string => {
    if (typeof dist === "number") return dist.toFixed(1);
    if (typeof dist === "string") return parseFloat(dist).toFixed(1);
    return "0.0";
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header with Map Button */}
      <View className="px-4 pt-2 pb-2 flex-row justify-between items-center bg-white border-b border-slate-100">
        <View>
          <Text className="text-2xl font-bold text-slate-800">
            Trip Planner
          </Text>
          <Text className="text-sm text-slate-500">
            ML-powered cost prediction
          </Text>
        </View>
        <View className="flex-row">
          {selectedZones.length > 0 && (
            <TouchableOpacity
              onPress={clearZones}
              className="bg-red-500 rounded-xl px-4 py-2.5 flex-row items-center shadow-sm mr-2"
              activeOpacity={0.7}
            >
              <Text className="text-white mr-2">🗑️</Text>
              <Text className="text-white font-semibold">Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleMapPress}
            className="bg-blue-500 rounded-xl px-4 py-2.5 flex-row items-center shadow-sm"
            activeOpacity={0.7}
          >
            <Text className="text-white mr-2">🗺️</Text>
            <Text className="text-white font-semibold">Map View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Zones Component - Enhanced Display */}
      {selectedZones.length > 0 && (
        <View className="bg-blue-50 mx-4 mb-4 rounded-xl p-4 border border-blue-200">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-blue-800 font-semibold">
              Selected Fishing Zones ({selectedZones.length})
            </Text>
            <View className="bg-blue-200 rounded-full px-3 py-1">
              <Text className="text-blue-800 font-medium text-xs">
                Total: {parseFloat(distance || "0").toFixed(1)} km
              </Text>
            </View>
          </View>

          {/* Individual Zones List */}
          {selectedZones.map((zone, index) => (
            <View
              key={zone.id}
              className="flex-row items-center mb-2 bg-white/50 rounded-lg p-2"
            >
              <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-2">
                <Text className="text-blue-600 font-bold">{index + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-blue-800 font-medium">{zone.name}</Text>
                <Text className="text-blue-600 text-xs">
                  {zone.fishType || "Various fish"}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-blue-800 font-bold">
                  {formatDistance(zone.distance)} km
                </Text>
                <Text className="text-blue-600 text-xs">
                  {zone.estimatedCatch || "Medium"} catch
                </Text>
              </View>
            </View>
          ))}
          
          {/* Action Buttons */}
          <View className="flex-row justify-between mt-3">
            <TouchableOpacity
              onPress={clearZones}
              className="bg-red-100 rounded-lg px-4 py-2 flex-1 mr-2 items-center"
            >
              <Text className="text-red-600 font-medium">Clear All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={keepLastZone}
              className="bg-blue-100 rounded-lg px-4 py-2 flex-1 ml-2 items-center"
            >
              <Text className="text-blue-600 font-medium">Keep Last</Text>
            </TouchableOpacity>
          </View>

          {/* Trip Summary */}
          <View className="border-t border-blue-200 mt-3 pt-3">
            <View className="flex-row justify-between">
              <Text className="text-blue-700">Total Distance:</Text>
              <Text className="text-blue-800 font-bold">
                {parseFloat(distance || "0").toFixed(1)} km
              </Text>
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-blue-700">Number of Zones:</Text>
              <Text className="text-blue-800 font-bold">
                {selectedZones.length}
              </Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Input Section */}
        <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          {/* Trip Parameters Header */}
          <View className="flex-row items-center mb-4">
            <View className="w-1 h-6 bg-blue-500 rounded-full mr-2" />
            <Text className="text-lg font-semibold text-slate-800">
              Trip Parameters
            </Text>
          </View>

          {/* Input Fields */}
          <View className="space-y-3">
            {/* Boat Type Selection */}
            <View>
              <Text className="text-xs font-medium text-slate-500 mb-1 ml-1">
                Boat Type
              </Text>
              <TouchableOpacity
                onPress={() => setShowBoatModal(true)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex-row justify-between items-center"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center flex-1">
                  <Text className="text-2xl mr-2">🚢</Text>
                  <View className="flex-1">
                    {selectedBoatName ? (
                      <>
                        <Text className="text-slate-800 font-semibold">
                          {selectedBoatName}
                        </Text>
                        <Text className="text-xs text-blue-600">
                          {getCurrentBoat()?.engineModel} • {getCurrentBoat()?.fuelType}
                        </Text>
                        <Text className="text-xs text-slate-500 mt-0.5">
                          Tap to change boat type
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text className="text-slate-800 font-medium">
                          Select your boat type
                        </Text>
                        <Text className="text-xs text-slate-500">
                          Choose from 5 boat options
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <Text className="text-slate-400 text-xl">›</Text>
              </TouchableOpacity>
            </View>

            {/* Engine HP Section */}
            {selectedBoatId && (
              <View>
                <View className="flex-row justify-between items-center mb-1 ml-1">
                  <Text className="text-xs font-medium text-slate-500">
                    Engine HP {getFinalEngineHP() && (
                      <Text className="text-blue-600 font-bold">
                        (Current: {getFinalEngineHP()} HP)
                      </Text>
                    )}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setUseEngineHPDropdown(!useEngineHPDropdown)}
                    className="bg-blue-100 rounded-full px-2 py-1"
                  >
                    <Text className="text-xs text-blue-700 font-medium">
                      {useEngineHPDropdown ? "✏️ Manual" : "📋 Dropdown"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {useEngineHPDropdown ? (
                  // Dropdown for Engine HP
                  <View className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="p-2"
                    >
                      <View className="flex-row gap-2">
                        {getCurrentBoatEngineOptions().map((hp) => (
                          <TouchableOpacity
                            key={hp}
                            onPress={() => {
                              setSelectedEngineHPFromDropdown(hp.toString());
                              setEngineHP(hp.toString());
                            }}
                            className={`px-4 py-2 rounded-lg ${
                              selectedEngineHPFromDropdown === hp.toString()
                                ? 'bg-blue-500'
                                : 'bg-white border border-slate-300'
                            }`}
                          >
                            <Text
                              className={`font-medium ${
                                selectedEngineHPFromDropdown === hp.toString()
                                  ? 'text-white'
                                  : 'text-slate-700'
                              }`}
                            >
                              {hp} HP
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ) : (
                  // Manual Input for Engine HP
                  <TextInput
                    placeholder="Enter Engine HP"
                    keyboardType="numeric"
                    value={engineHP}
                    onChangeText={setEngineHP}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 placeholder:text-slate-400"
                  />
                )}
              </View>
            )}

            {/* Show manual engine HP if no boat selected */}
            {!selectedBoatId && (
              <View>
                <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2">
                  <View className="flex-row items-start">
                    <Text className="text-lg mr-2">ℹ️</Text>
                    <View className="flex-1">
                      <Text className="text-xs font-semibold text-amber-800 mb-1">
                        Select a Boat Type First
                      </Text>
                      <Text className="text-xs text-amber-700">
                        Choose your boat from 5 options: 55-59.5 FT, 42 FT, 30 FT, 18-19.5 FT Flat, or Canoes/Wallam
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium text-slate-500 mb-1 ml-1">
                    Engine HP
                  </Text>
                  <TextInput
                    placeholder="Select a boat type first"
                    keyboardType="numeric"
                    value={engineHP}
                    onChangeText={setEngineHP}
                    editable={false}
                    className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-400"
                  />
                </View>
              </View>
            )}

            {/* Row 1 */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs font-medium text-slate-500 mb-1 ml-1">
                  Distance (km)
                </Text>
                <TextInput
                  placeholder="0"
                  keyboardType="numeric"
                  value={distance}
                  onChangeText={setDistance}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 placeholder:text-slate-400"
                  editable={selectedZones.length === 0} // Disable if zones are selected
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-medium text-slate-500 mb-1 ml-1">
                  Duration (hrs)
                </Text>
                <TextInput
                  placeholder="0"
                  keyboardType="numeric"
                  value={duration}
                  onChangeText={setDuration}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 placeholder:text-slate-400"
                />
              </View>
            </View>

            {/* Row 2 */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs font-medium text-slate-500 mb-1 ml-1">
                  Fuel Price (Rs/L)
                </Text>
                <TextInput
                  placeholder="350"
                  keyboardType="numeric"
                  value={fuelPrice}
                  onChangeText={setFuelPrice}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 placeholder:text-slate-400"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-medium text-slate-500 mb-1 ml-1">
                  Wind Speed (km/h)
                </Text>
                <TextInput
                  placeholder="0"
                  keyboardType="numeric"
                  value={windSpeed}
                  onChangeText={setWindSpeed}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 placeholder:text-slate-400"
                />
              </View>
            </View>

            {/* Row 3 - Wave Height */}
            <View>
              <Text className="text-xs font-medium text-slate-500 mb-1 ml-1">
                Wave Height (m)
              </Text>
              <TextInput
                placeholder="0"
                keyboardType="numeric"
                value={waveHeight}
                onChangeText={setWaveHeight}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 placeholder:text-slate-400"
              />
            </View>
          </View>

          {/* Predict Button */}
          <TouchableOpacity
            onPress={handlePredict}
            disabled={loading}
            className="mt-5"
            activeOpacity={0.7}
          >
            <View
              className={`bg-blue-500 rounded-xl p-4 ${loading ? "opacity-70" : ""}`}
            >
              <Text className="text-white text-center font-semibold text-lg">
                {loading ? "CALCULATING..." : "PREDICT COST"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        {(predictedFuel !== null ||
          predictedCost !== null ||
          riskScore ||
          (recommendations && recommendations.length > 0)) && (
          <View className="space-y-4 pb-6">
            {/* Predicted Fuel */}
            {predictedFuel !== null && (
              <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <Text className="text-2xl mr-2">⛽</Text>
                    <View>
                      <Text className="text-sm text-slate-500">
                        Predicted Fuel
                      </Text>
                      <Text className="font-medium text-slate-700">
                        Estimated consumption
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-2xl font-bold text-blue-600">
                      {predictedFuel.toFixed(2)}
                    </Text>
                    <Text className="text-sm text-slate-500">liters</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Predicted Cost */}
            {predictedCost !== null && (
              <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <Text className="text-2xl mr-2">💰</Text>
                    <View>
                      <Text className="text-sm text-slate-500">
                        Predicted Cost
                      </Text>
                      <Text className="font-medium text-slate-700">
                        Total trip expense
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-2xl font-bold text-emerald-600">
                      Rs. {predictedCost.toFixed(2)}
                    </Text>
                    <Text className="text-sm text-slate-500">rupees</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Risk Score */}
            {riskScore && (
              <View className={`rounded-2xl p-4 ${getRiskColor(riskScore)}`}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Text className="text-2xl mr-2">⚠️</Text>
                    <View>
                      <Text className="text-sm text-slate-600">Risk Score</Text>
                      <Text
                        className={`font-bold text-lg ${getRiskTextColor(riskScore)}`}
                      >
                        {riskScore}
                      </Text>
                    </View>
                  </View>
                  <View className="bg-white/50 rounded-full px-3 py-1">
                    <Text className="text-xs font-medium text-slate-600">
                      ML Analysis
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <View className="flex-row items-center mb-3">
                  <Text className="text-2xl mr-2">📝</Text>
                  <Text className="text-lg font-semibold text-slate-800">
                    Recommendations
                  </Text>
                </View>
                {recommendations.map((rec, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-start mb-3 last:mb-0"
                  >
                    <View className="w-5 h-5 rounded-full bg-blue-100 items-center justify-center mr-3 mt-0.5">
                      <Text className="text-xs font-bold text-blue-600">
                        {idx + 1}
                      </Text>
                    </View>
                    <Text className="flex-1 text-slate-700 leading-5">
                      {rec}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Boat Selection Modal */}
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