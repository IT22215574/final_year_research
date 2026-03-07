import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getLearningSummary } from "@/services/tripService";

type LearningBoat = {
  boatId: string;
  totalTrips?: number;
  confidence?: number;
  avgPredictionError?: number;
  improvementTrend?: string;
  maturityLevel?: string;
};

type LearningSummary = {
  totalBoats: number;
  totalTripsLearned: number;
  averageConfidence: number;
  averagePredictionError: number;
  improvementStatus: string;
  topPerformingBoats: LearningBoat[];
  needsAttentionBoats: LearningBoat[];
  lastUpdated: string | null;
};

const LearningSummaryScreen = () => {
  const router = useRouter();
  const [data, setData] = useState<LearningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getLearningSummary();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load learning summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" />
        <Text className="mt-3 text-slate-600">Loading learning summary...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 px-4 justify-center">
        <Text className="text-red-500 text-center mb-4">{error}</Text>
        <TouchableOpacity
          onPress={loadSummary}
          className="bg-slate-900 rounded-xl py-3 items-center"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-3 pb-3 flex-row justify-between items-center bg-white border-b border-slate-100">
        <View>
          <Text className="text-xl font-bold text-slate-900">Learning Summary</Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            DATCIE adaptive learning overview
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

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <Text className="text-base font-semibold text-slate-800 mb-3">
            Fleet Learning Overview
          </Text>

          <Text className="text-slate-700 mb-1">Total Boats: {data?.totalBoats ?? 0}</Text>
          <Text className="text-slate-700 mb-1">
            Total Trips Learned: {data?.totalTripsLearned ?? 0}
          </Text>
          <Text className="text-slate-700 mb-1">
            Average Confidence: {data?.averageConfidence ?? 0}
          </Text>
          <Text className="text-slate-700 mb-1">
            Average Prediction Error: {data?.averagePredictionError ?? 0}
          </Text>
          <Text className="text-slate-700 mb-1">
            Improvement Status: {data?.improvementStatus ?? "-"}
          </Text>
          <Text className="text-slate-700">
            Last Updated: {data?.lastUpdated ?? "N/A"}
          </Text>
        </View>

        <Text className="text-base font-semibold text-slate-800 mb-3">
          Top Performing Boats
        </Text>

        {data?.topPerformingBoats?.length ? (
          data.topPerformingBoats.map((boat, index) => (
            <View
              key={`${boat.boatId}-${index}`}
              className="bg-white rounded-2xl border border-slate-100 p-4 mb-3"
            >
              <Text className="text-slate-900 font-bold mb-1">Boat: {boat.boatId}</Text>
              <Text className="text-slate-600">Trips: {boat.totalTrips ?? 0}</Text>
              <Text className="text-slate-600">Confidence: {boat.confidence ?? 0}</Text>
              <Text className="text-slate-600">
                Avg Error: {boat.avgPredictionError ?? 0}
              </Text>
              <Text className="text-slate-600">
                Trend: {boat.improvementTrend ?? "-"}
              </Text>
              <Text className="text-slate-600">
                Maturity: {boat.maturityLevel ?? "-"}
              </Text>
            </View>
          ))
        ) : (
          <View className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
            <Text className="text-slate-500">No data yet</Text>
          </View>
        )}

        <Text className="text-base font-semibold text-slate-800 mb-3">
          Boats Needing Attention
        </Text>

        {data?.needsAttentionBoats?.length ? (
          data.needsAttentionBoats.map((boat, index) => (
            <View
              key={`${boat.boatId}-${index}`}
              className="bg-white rounded-2xl border border-slate-100 p-4 mb-3"
            >
              <Text className="text-slate-900 font-bold mb-1">Boat: {boat.boatId}</Text>
              <Text className="text-slate-600">Trips: {boat.totalTrips ?? 0}</Text>
              <Text className="text-slate-600">Confidence: {boat.confidence ?? 0}</Text>
              <Text className="text-slate-600">
                Avg Error: {boat.avgPredictionError ?? 0}
              </Text>
              <Text className="text-slate-600">
                Trend: {boat.improvementTrend ?? "-"}
              </Text>
              <Text className="text-slate-600">
                Maturity: {boat.maturityLevel ?? "-"}
              </Text>
            </View>
          ))
        ) : (
          <View className="bg-white rounded-2xl border border-slate-100 p-4">
            <Text className="text-slate-500">No data yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LearningSummaryScreen;