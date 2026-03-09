import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LineChart, BarChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";

import {
  deleteBoat,
  getBoatById,
  getBoatLearningInsights,
  getBoatPredictionHistory,
  type Boat,
} from "@/services/boatService";

export default function BoatDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [boat, setBoat] = useState<Boat | null>(null);
  const [loading, setLoading] = useState(true);
  const [learningData, setLearningData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadBoat = async () => {
    try {
      setLoading(true);
      const data = await getBoatById(String(id));
      setBoat(data);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load boat");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadBoat();
    }
  }, [id]);

  const handleLoadLearningInsights = async () => {
    try {
      setExtraLoading(true);
      const data = await getBoatLearningInsights(String(id));
      setLearningData(data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message || "Failed to load learning insights",
      );
    } finally {
      setExtraLoading(false);
    }
  };

  const handleLoadPredictionHistory = async () => {
    try {
      setExtraLoading(true);
      const data = await getBoatPredictionHistory(String(id), 30);
      setHistoryData(data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message || "Failed to load prediction history",
      );
    } finally {
      setExtraLoading(false);
    }
  };

  const handleDelete = () => {
    if (!boat) return;

    Alert.alert("Delete Boat", `Delete ${boat.boatName || "this boat"}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteBoat(boat._id);
            Alert.alert("Success", "Boat deleted successfully", [
              {
                text: "OK",
                onPress: () => router.replace("/fishtripcost/boats"),
              },
            ]);
          } catch (error: any) {
            Alert.alert(
              "Delete Failed",
              error?.message || "Failed to delete boat",
            );
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="text-slate-500 mt-3">Loading boat details...</Text>
      </SafeAreaView>
    );
  }

  if (!boat) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-xl font-bold text-slate-800">Boat not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-blue-600 px-5 py-3 rounded-xl mt-4"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const boatImageUrl = boat.boatImage
    ? `${process.env.EXPO_PUBLIC_API_BASE_URL}${boat.boatImage}`
    : null;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-3 pb-4 bg-white border-b border-slate-100 flex-row justify-between items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-slate-100 px-3 py-2 rounded-xl"
        >
          <Text className="text-slate-700 font-semibold">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push(`/fishtripcost/boats/edit/${boat._id}`)}
          className="bg-blue-600 px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-bold">Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          {boatImageUrl ? (
            <Image
              source={{ uri: boatImageUrl }}
              style={{
                width: "100%",
                height: 200,
                borderRadius: 16,
                marginBottom: 14,
              }}
              resizeMode="cover"
            />
          ) : (
            <View className="h-48 rounded-2xl bg-slate-100 items-center justify-center mb-4">
              <Text className="text-slate-400">No boat image</Text>
            </View>
          )}

          <Text className="text-2xl font-bold text-slate-900">
            {boat.boatName || "Unnamed Boat"}
          </Text>
          <Text className="text-slate-500 mt-1">{boat.boatType || "-"}</Text>

          <View className="mt-4 space-y-2">
            <Text className="text-slate-700">
              Engine HP: {boat.engineHorsePower ?? boat.engineHP ?? "-"}
            </Text>
            <Text className="text-slate-700">
              Length: {boat.boatLength ?? "-"}
            </Text>
            <Text className="text-slate-700">
              Width: {boat.boatWidth ?? "-"}
            </Text>
            <Text className="text-slate-700">
              Value: {boat.boatValue ?? "-"}
            </Text>
            <Text className="text-slate-700">
              Mode: {boat.mode || "island"}
            </Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <Text className="text-lg font-bold text-slate-900 mb-3">
            Learning Fields
          </Text>

          <Text className="text-slate-700">
            Fuel Efficiency Factor: {boat.fuelEfficiencyFactor ?? "-"}
          </Text>
          <Text className="text-slate-700 mt-2">
            Engine Degradation Factor: {boat.engineDegradationFactor ?? "-"}
          </Text>
          <Text className="text-slate-700 mt-2">
            Average Fuel Prediction Error:{" "}
            {boat.averageFuelPredictionError ?? "-"}
          </Text>
        </View>

        <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
          <Text className="text-lg font-bold text-slate-900 mb-3">
            ML / History Actions
          </Text>

          <TouchableOpacity
            onPress={handleLoadLearningInsights}
            className="bg-indigo-600 rounded-xl py-3 items-center mb-3"
            disabled={extraLoading}
          >
            <Text className="text-white font-bold">Load Learning Insights</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLoadPredictionHistory}
            className="bg-emerald-600 rounded-xl py-3 items-center"
            disabled={extraLoading}
          >
            <Text className="text-white font-bold">
              Load Prediction History
            </Text>
          </TouchableOpacity>

          {extraLoading ? (
            <View className="mt-4 items-center">
              <ActivityIndicator />
            </View>
          ) : null}

          {learningData ? <LearningInsightsView data={learningData} /> : null}

          {historyData ? <PredictionHistoryView data={historyData} /> : null}
        </View>

        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting}
          className={`rounded-xl py-4 items-center ${
            deleting ? "bg-rose-300" : "bg-rose-600"
          }`}
        >
          <Text className="text-white font-bold">
            {deleting ? "Deleting..." : "Delete Boat"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Learning Insights Component
function LearningInsightsView({ data }: { data: any }) {
  const screenWidth = Dimensions.get("window").width - 48;

  if (!data || !data.hasData) {
    return (
      <View className="mt-4 bg-slate-50 rounded-2xl p-6 items-center border border-slate-200">
        <Ionicons name="analytics-outline" size={48} color="#CBD5E1" />
        <Text className="text-slate-500 mt-2 font-semibold">
          No learning data yet
        </Text>
        <Text className="text-xs text-slate-400 mt-1 text-center">
          Complete trips with actual fuel data to see AI learning insights
        </Text>
      </View>
    );
  }

  // Extract key metrics from the correct structure
  const learningStats = data.learningStats || {};
  const coefficients = data.coefficients || {};
  const accuracyTrend = data.accuracyTrend || [];

  const accuracy = learningStats.averageAccuracy || 0;
  const updateCount =
    learningStats.updateCount || data.totalLearningUpdates || 0;
  const confidence = coefficients.confidence || 0;
  const dataPoints = coefficients.dataPoints || 0;
  const lastUpdate = data.lastUpdated || learningStats.lastUpdate;

  return (
    <View className="mt-4 bg-indigo-50 rounded-2xl p-4 border border-indigo-200">
      <View className="flex-row items-center mb-4">
        <Ionicons name="analytics" size={24} color="#6366F1" />
        <Text className="font-bold text-lg text-slate-900 ml-2">
          Learning Insights
        </Text>
      </View>

      {/* Accuracy Score */}
      <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
        <Text className="text-sm text-slate-600 mb-2">Model Accuracy</Text>
        <View className="flex-row items-end">
          <Text className="text-4xl font-bold text-indigo-600">
            {(accuracy * 100).toFixed(1)}
          </Text>
          <Text className="text-xl text-indigo-400 ml-1 mb-1">%</Text>
        </View>
        <View className="mt-3 bg-slate-100 h-3 rounded-full overflow-hidden">
          <View
            className="bg-indigo-600 h-full rounded-full"
            style={{ width: `${accuracy * 100}%` }}
          />
        </View>
      </View>

      {/* Stats Grid */}
      <View className="flex-row justify-between mb-3">
        <View className="bg-white rounded-xl p-4 flex-1 mr-2 shadow-sm">
          <View className="flex-row items-center mb-1">
            <Ionicons name="refresh-circle" size={18} color="#10B981" />
            <Text className="text-xs text-slate-600 ml-1">Trips</Text>
          </View>
          <Text className="text-2xl font-bold text-slate-900">
            {updateCount}
          </Text>
          <Text className="text-xs text-slate-500 mt-1">
            {dataPoints} data points
          </Text>
        </View>

        <View className="bg-white rounded-xl p-4 flex-1 ml-2 shadow-sm">
          <View className="flex-row items-center mb-1">
            <Ionicons name="shield-checkmark" size={18} color="#6366F1" />
            <Text className="text-xs text-slate-600 ml-1">Confidence</Text>
          </View>
          <Text className="text-2xl font-bold text-slate-900">
            {(confidence * 100).toFixed(0)}%
          </Text>
          <Text className="text-xs text-slate-500 mt-1">Model confidence</Text>
        </View>
      </View>

      {/* Accuracy Trend Chart */}
      {accuracyTrend.length > 1 && (
        <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
          <Text className="text-sm font-semibold text-slate-700 mb-3">
            Accuracy Trend Over Time
          </Text>
          <LineChart
            data={{
              labels: accuracyTrend
                .map((item: any, idx: number) =>
                  item.timestamp
                    ? new Date(item.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : `#${idx + 1}`,
                )
                .filter(
                  (_: any, i: number) =>
                    i % Math.max(1, Math.floor(accuracyTrend.length / 6)) === 0,
                ),
              datasets: [
                {
                  data: accuracyTrend.map(
                    (item: any) => (item.accuracy || 0) * 100,
                  ),
                  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                  strokeWidth: 3,
                },
              ],
            }}
            width={screenWidth - 24}
            height={200}
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#f8fafc",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(51, 65, 85, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#6366F1" },
            }}
            bezier
            style={{ borderRadius: 12 }}
            yAxisSuffix="%"
          />
          <Text className="text-xs text-slate-500 text-center mt-2">
            Shows prediction accuracy improving as the model learns
          </Text>
        </View>
      )}

      {/* Coefficients if available */}
      {coefficients && Object.keys(coefficients).length > 0 && (
        <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
          <Text className="text-sm font-semibold text-slate-700 mb-3">
            Model Coefficients
          </Text>
          {Object.entries(coefficients).map(([key, value]: [string, any]) => (
            <View key={key} className="flex-row justify-between mb-2">
              <Text className="text-xs text-slate-600 capitalize">
                {key.replace(/_/g, " ")}
              </Text>
              <Text className="text-xs font-mono text-slate-900">
                {typeof value === "number" ? value.toFixed(4) : value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <View className="flex-row items-center justify-center mt-2">
          <Ionicons name="time-outline" size={14} color="#94A3B8" />
          <Text className="text-xs text-slate-500 ml-1">
            Last updated: {new Date(lastUpdate).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  );
}

// Prediction History Component
function PredictionHistoryView({ data }: { data: any }) {
  const screenWidth = Dimensions.get("window").width - 48;

  // Extract history data from the correct structure
  const coeffHistory = data?.coefficientHistory || [];
  const history = Array.isArray(coeffHistory) ? coeffHistory : [];
  const improvementOverTime = data?.improvementOverTime || [];
  const limitedHistory = history.slice(-10); // Last 10 predictions

  if (!data?.hasData || limitedHistory.length === 0) {
    return (
      <View className="mt-4 bg-slate-50 rounded-2xl p-6 items-center border border-slate-200">
        <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
        <Text className="text-slate-500 mt-2 font-semibold">
          No prediction history available
        </Text>
        <Text className="text-xs text-slate-400 mt-1 text-center">
          Complete trips with actual fuel consumption data to build prediction
          history
        </Text>
      </View>
    );
  }

  // Prepare chart data
  const labels = limitedHistory.map((item: any, idx: number) =>
    item.timestamp
      ? new Date(item.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : `#${idx + 1}`,
  );

  const predictedData = limitedHistory.map(
    (item: any) => item.predictedFuel || 0,
  );
  const actualData = limitedHistory.map((item: any) => item.actualFuel || 0);
  const errorData = limitedHistory.map((item: any) =>
    Math.abs(item.predictionError || 0),
  );

  // Calculate statistics
  const avgError =
    errorData.reduce((a: number, b: number) => a + b, 0) / errorData.length;
  const maxError = Math.max(...errorData);
  const minError = Math.min(...errorData);

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#f8fafc",
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 65, 85, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#10B981",
    },
  };

  return (
    <View className="mt-4 bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
      <View className="flex-row items-center mb-4">
        <Ionicons name="bar-chart" size={24} color="#10B981" />
        <Text className="font-bold text-lg text-slate-900 ml-2">
          Prediction History
        </Text>
        <View className="bg-emerald-100 px-2 py-1 rounded-md ml-auto">
          <Text className="text-xs font-semibold text-emerald-700">
            {limitedHistory.length} trips
          </Text>
        </View>
      </View>

      {/* Statistics Cards */}
      <View className="flex-row justify-between mb-4">
        <View className="bg-white rounded-xl p-3 flex-1 mr-2 shadow-sm">
          <Text className="text-xs text-slate-600 mb-1">Avg Error</Text>
          <Text className="text-xl font-bold text-emerald-600">
            {avgError.toFixed(1)}L
          </Text>
        </View>
        <View className="bg-white rounded-xl p-3 flex-1 mx-1 shadow-sm">
          <Text className="text-xs text-slate-600 mb-1">Min Error</Text>
          <Text className="text-xl font-bold text-blue-600">
            {minError.toFixed(1)}L
          </Text>
        </View>
        <View className="bg-white rounded-xl p-3 flex-1 ml-2 shadow-sm">
          <Text className="text-xs text-slate-600 mb-1">Max Error</Text>
          <Text className="text-xl font-bold text-rose-600">
            {maxError.toFixed(1)}L
          </Text>
        </View>
      </View>

      {/* Prediction vs Actual Line Chart */}
      {predictedData.length > 0 && actualData.length > 0 && (
        <View className="bg-white rounded-2xl p-3 mb-3 shadow-sm">
          <Text className="text-sm font-semibold text-slate-700 mb-3">
            Predicted vs Actual Fuel Consumption
          </Text>
          <LineChart
            data={{
              labels:
                labels.length > 6
                  ? labels.filter((_: any, i: number) => i % 2 === 0)
                  : labels,
              datasets: [
                {
                  data: predictedData,
                  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                  strokeWidth: 2,
                },
                {
                  data: actualData,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  strokeWidth: 2,
                },
              ],
              legend: ["Predicted", "Actual"],
            }}
            width={screenWidth - 24}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            }}
            bezier
            style={{
              borderRadius: 12,
            }}
          />
        </View>
      )}

      {/* Error Distribution Bar Chart */}
      {errorData.length > 0 && (
        <View className="bg-white rounded-2xl p-3 mb-3 shadow-sm">
          <Text className="text-sm font-semibold text-slate-700 mb-3">
            Prediction Error Distribution
          </Text>
          <BarChart
            data={{
              labels:
                labels.length > 6
                  ? labels.filter((_: any, i: number) => i % 2 === 0)
                  : labels,
              datasets: [
                {
                  data:
                    errorData.length > 6
                      ? errorData.filter((_: any, i: number) => i % 2 === 0)
                      : errorData,
                },
              ],
            }}
            width={screenWidth - 24}
            height={200}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
            }}
            style={{
              borderRadius: 12,
            }}
            yAxisSuffix="L"
          />
        </View>
      )}

      {/* Improvement Over Time Chart */}
      {improvementOverTime.length > 1 && (
        <View className="bg-white rounded-2xl p-3 mb-3 shadow-sm">
          <Text className="text-sm font-semibold text-slate-700 mb-3">
            Model Improvement Over Time
          </Text>
          <LineChart
            data={{
              labels: improvementOverTime.map((item: any) => item.period || ""),
              datasets: [
                {
                  data: improvementOverTime.map(
                    (item: any) => item.averageError || 0,
                  ),
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  strokeWidth: 3,
                },
              ],
            }}
            width={screenWidth - 24}
            height={200}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            }}
            bezier
            style={{
              borderRadius: 12,
            }}
            yAxisSuffix="L"
          />
          <Text className="text-xs text-slate-500 text-center mt-2">
            Lower is better - Shows prediction error decreasing as model learns
          </Text>
        </View>
      )}

      {/* Recent Predictions List */}
      <View className="mt-4">
        <Text className="text-sm font-semibold text-slate-700 mb-2">
          Recent Predictions
        </Text>
        {limitedHistory
          .slice(-5)
          .reverse()
          .map((item: any, idx: number) => {
            const predicted = item.predictedFuel || 0;
            const actual = item.actualFuel || 0;
            const error = Math.abs(item.predictionError || 0);
            const errorPercent = actual ? (error / actual) * 100 : 0;

            return (
              <View
                key={idx}
                className="bg-white rounded-xl p-3 mb-2 shadow-sm flex-row justify-between items-center"
              >
                <View className="flex-1">
                  <Text className="text-xs text-slate-500">
                    {item.timestamp
                      ? new Date(item.timestamp).toLocaleDateString()
                      : `Prediction ${idx + 1}`}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Text className="text-sm text-slate-700">
                      Predicted:{" "}
                      <Text className="font-semibold">
                        {predicted.toFixed(1)}L
                      </Text>
                    </Text>
                    <Text className="text-slate-400 mx-2">•</Text>
                    <Text className="text-sm text-slate-700">
                      Actual:{" "}
                      <Text className="font-semibold">
                        {actual.toFixed(1)}L
                      </Text>
                    </Text>
                  </View>
                </View>
                <View
                  className={`px-3 py-1 rounded-lg ${errorPercent < 5 ? "bg-emerald-100" : errorPercent < 10 ? "bg-amber-100" : "bg-rose-100"}`}
                >
                  <Text
                    className={`text-xs font-semibold ${errorPercent < 5 ? "text-emerald-700" : errorPercent < 10 ? "text-amber-700" : "text-rose-700"}`}
                  >
                    {errorPercent.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })}
      </View>
    </View>
  );
}
