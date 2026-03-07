import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

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
      Alert.alert("Error", error?.message || "Failed to load learning insights");
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
      Alert.alert("Error", error?.message || "Failed to load prediction history");
    } finally {
      setExtraLoading(false);
    }
  };

  const handleDelete = () => {
    if (!boat) return;

    Alert.alert(
      "Delete Boat",
      `Delete ${boat.boatName || "this boat"}?`,
      [
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
                  onPress: () => router.replace("/(root)/(tabs)/boats"),
                },
              ]);
            } catch (error: any) {
              Alert.alert(
                "Delete Failed",
                error?.message || "Failed to delete boat"
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
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
          onPress={() => router.push(`/(root)/(tabs)/boats/edit/${boat._id}`)}
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
              style={{ width: "100%", height: 200, borderRadius: 16, marginBottom: 14 }}
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
            <Text className="text-slate-700">Mode: {boat.mode || "island"}</Text>
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
            Average Fuel Prediction Error: {boat.averageFuelPredictionError ?? "-"}
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
            <Text className="text-white font-bold">Load Prediction History</Text>
          </TouchableOpacity>

          {extraLoading ? (
            <View className="mt-4 items-center">
              <ActivityIndicator />
            </View>
          ) : null}

          {learningData ? (
            <View className="mt-4 bg-slate-50 rounded-xl p-3">
              <Text className="font-bold text-slate-800 mb-2">
                Learning Insights
              </Text>
              <Text className="text-slate-600">
                {JSON.stringify(learningData, null, 2)}
              </Text>
            </View>
          ) : null}

          {historyData ? (
            <View className="mt-4 bg-slate-50 rounded-xl p-3">
              <Text className="font-bold text-slate-800 mb-2">
                Prediction History
              </Text>
              <Text className="text-slate-600">
                {JSON.stringify(historyData, null, 2)}
              </Text>
            </View>
          ) : null}
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