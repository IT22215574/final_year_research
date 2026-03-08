import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LineChart, BarChart, ProgressChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { getLearningSummary } from "@/services/tripService";
import FishTripNavBar from "./components/FishTripNavBar";

const screenWidth = Dimensions.get("window").width;

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
      <FishTripNavBar />
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
        {/* 🎯 SYSTEM-WIDE OVERVIEW */}
        <View className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-5 mb-4">
          <View className="flex-row items-center mb-4">
            <Ionicons name="stats-chart" size={24} color="#3b82f6" />
            <Text className="text-xl font-bold text-blue-900 ml-2">
              System-Wide Learning Analytics
            </Text>
          </View>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-white rounded-xl p-3 border border-blue-100">
              <Text className="text-blue-600 text-xs font-semibold mb-1">TOTAL BOATS</Text>
              <Text className="text-blue-900 font-bold text-2xl">{data?.totalBoats ?? 0}</Text>
            </View>

            <View className="flex-1 bg-white rounded-xl p-3 border border-emerald-100">
              <Text className="text-emerald-600 text-xs font-semibold mb-1">TRIPS LEARNED</Text>
              <Text className="text-emerald-900 font-bold text-2xl">{data?.totalTripsLearned ?? 0}</Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-white rounded-xl p-3 border border-purple-100">
              <Text className="text-purple-600 text-xs font-semibold mb-1">AVG CONFIDENCE</Text>
              <Text className="text-purple-900 font-bold text-2xl">
                {data?.averageConfidence ? `${(data.averageConfidence * 100).toFixed(0)}%` : 'N/A'}
              </Text>
            </View>

            <View className="flex-1 bg-white rounded-xl p-3 border border-rose-100">
              <Text className="text-rose-600 text-xs font-semibold mb-1">AVG ERROR (L)</Text>
              <Text className="text-rose-900 font-bold text-2xl">
                {data?.averagePredictionError ? data.averagePredictionError.toFixed(1) : 'N/A'}
              </Text>
            </View>
          </View>

          <View className="bg-white rounded-xl p-3 mt-3 border border-slate-200">
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-600 font-semibold">System Status</Text>
              <View className={`px-3 py-1.5 rounded-full ${
                data?.improvementStatus === 'improving' ? 'bg-green-100' : 
                data?.improvementStatus === 'stable' ? 'bg-blue-100' : 
                'bg-amber-100'
              }`}>
                <Text className={`font-bold text-sm ${
                  data?.improvementStatus === 'improving' ? 'text-green-700' : 
                  data?.improvementStatus === 'stable' ? 'text-blue-700' : 
                  'text-amber-700'
                }`}>
                  {data?.improvementStatus ?? 'Unknown'}
                </Text>
              </View>
            </View>
            <Text className="text-slate-500 text-xs mt-2">
              Last Updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString() : "N/A"}
            </Text>
          </View>
        </View>

        {/* 📊 CONFIDENCE VISUALIZATION */}
        {data?.averageConfidence && (
          <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
            <Text className="text-base font-bold text-slate-800 mb-3">
              🎯 System Confidence Level
            </Text>
            
            <ProgressChart
              data={{
                labels: ['Confidence'],
                data: [data.averageConfidence],
              }}
              width={screenWidth - 72}
              height={180}
              strokeWidth={16}
              radius={60}
              chartConfig={{
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                strokeWidth: 2,
                barPercentage: 0.5,
              }}
              hideLegend={false}
            />

            <View className="bg-indigo-50 rounded-xl p-3 mt-3">
              <Text className="text-indigo-800 text-xs font-medium text-center">
                {data.averageConfidence > 0.8 
                  ? '🌟 Excellent - Model is highly confident in predictions' 
                  : data.averageConfidence > 0.6 
                  ? '✅ Good - Model is moderately confident' 
                  : '⚠️ Building Confidence - Need more training data'}
              </Text>
            </View>
          </View>
        )}

        {/* 📈 TOP PERFORMING BOATS */}
        <Text className="text-lg font-bold text-slate-800 mb-3 mt-2">
          🏆 Top Performing Boats
        </Text>

        {data?.topPerformingBoats && data.topPerformingBoats.length > 0 ? (
          <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
            {data.topPerformingBoats.map((boat, index) => (
              <View
                key={`${boat.boatId}-${index}`}
                className="mb-4 pb-4 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <View className={`w-8 h-8 rounded-full items-center justify-center ${
                        index === 0 ? 'bg-yellow-400' : 
                        index === 1 ? 'bg-gray-300' : 
                        'bg-orange-300'
                      }`}>
                        <Text className="font-bold text-white">#{index + 1}</Text>
                      </View>
                      <Text className="text-slate-900 font-bold text-base ml-3">
                        Boat ID: {String(boat.boatId).slice(0, 8)}...
                      </Text>
                    </View>
                  </View>

                  <View className={`px-3 py-1 rounded-full ${
                    boat.maturityLevel === 'expert' ? 'bg-green-100' : 
                    boat.maturityLevel === 'experienced' ? 'bg-blue-100' : 
                    'bg-amber-100'
                  }`}>
                    <Text className={`text-xs font-bold ${
                      boat.maturityLevel === 'expert' ? 'text-green-700' : 
                      boat.maturityLevel === 'experienced' ? 'text-blue-700' : 
                      'text-amber-700'
                    }`}>
                      {boat.maturityLevel ?? 'Learning'}
                    </Text>
                  </View>
                </View>

                <View className="bg-slate-50 rounded-xl p-3 mt-2">
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-slate-600 text-sm">Total Trips</Text>
                    <Text className="text-slate-900 font-semibold">{boat.totalTrips ?? 0}</Text>
                  </View>

                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-slate-600 text-sm">Confidence</Text>
                    <Text className="text-indigo-700 font-bold">
                      {boat.confidence ? `${(boat.confidence * 100).toFixed(0)}%` : 'N/A'}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-slate-600 text-sm">Avg Error</Text>
                    <Text className="text-slate-900 font-semibold">
                      {boat.avgPredictionError ? `${boat.avgPredictionError.toFixed(1)} L` : 'N/A'}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <Text className="text-slate-600 text-sm">Trend</Text>
                    <View className="flex-row items-center">
                      <Ionicons 
                        name={boat.improvementTrend === 'improving' ? 'trending-up' : 
                              boat.improvementTrend === 'stable' ? 'remove' : 'trending-down'} 
                        size={16} 
                        color={boat.improvementTrend === 'improving' ? '#10b981' : 
                               boat.improvementTrend === 'stable' ? '#3b82f6' : '#ef4444'} 
                      />
                      <Text className={`font-semibold text-sm ml-1 ${
                        boat.improvementTrend === 'improving' ? 'text-green-600' : 
                        boat.improvementTrend === 'stable' ? 'text-blue-600' : 
                        'text-rose-600'
                      }`}>
                        {boat.improvementTrend ?? '-'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            <View className="bg-green-50 rounded-lg p-3 mt-3">
              <Text className="text-green-800 text-xs font-medium text-center">
                ✨ These boats have the most accurate predictions based on learning data
              </Text>
            </View>
          </View>
        ) : (
          <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
            <Text className="text-slate-500 text-center">No top performing boats yet. Log actual trips to build learning data.</Text>
          </View>
        )}

        {/* ⚠️ BOATS NEEDING ATTENTION */}
        {data?.needsAttentionBoats && data.needsAttentionBoats.length > 0 && (
          <>
            <Text className="text-lg font-bold text-slate-800 mb-3 mt-2">
              ⚠️ Boats Needing Attention
            </Text>

            <View className="bg-amber-50 rounded-2xl border border-amber-200 p-5 mb-4">
              {data.needsAttentionBoats.map((boat, index) => (
                <View
                  key={`${boat.boatId}-${index}`}
                  className="mb-3 pb-3 border-b border-amber-100 last:border-b-0 last:mb-0 last:pb-0"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-slate-900 font-bold">
                      Boat ID: {String(boat.boatId).slice(0, 8)}...
                    </Text>
                    <Ionicons name="warning" size={20} color="#f59e0b" />
                  </View>

                  <View className="bg-white rounded-lg p-2.5">
                    <Text className="text-amber-800 text-sm">
                      • Trips: {boat.totalTrips ?? 0} • Error: {boat.avgPredictionError?.toFixed(1) ?? 'N/A'} L
                    </Text>
                    <Text className="text-amber-700 text-xs mt-1">
                      Reason: {boat.improvementTrend === 'declining' 
                        ? 'Accuracy declining - needs recalibration' 
                        : 'Insufficient training data'}
                    </Text>
                  </View>
                </View>
              ))}

              <View className="bg-amber-100 rounded-lg p-3 mt-2">
                <Text className="text-amber-900 text-xs font-medium text-center">
                  💡 Log more actual trips for these boats to improve prediction accuracy
                </Text>
              </View>
            </View>
          </>
        )}

        {/* 📊 RESEARCH INSIGHTS */}
        <View className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-5 mb-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="школяр" size={22} color="#9333ea" />
            <Text className="text-base font-bold text-purple-900 ml-2">
              Adaptive Learning Insights
            </Text>
          </View>
          
          <View className="bg-white rounded-xl p-4">
            <Text className="text-slate-700 text-sm leading-5 mb-2">
              ✅ <Text className="font-semibold">Boat-Specific Adaptation:</Text> Each boat's unique characteristics are learned over time.
            </Text>
            <Text className="text-slate-700 text-sm leading-5 mb-2">
              ✅ <Text className="font-semibold">Continuous Improvement:</Text> Model accuracy increases with every logged trip.
            </Text>
            <Text className="text-slate-700 text-sm leading-5 mb-2">
              ✅ <Text className="font-semibold">Historical Context:</Text> Predictions leverage past performance for better accuracy.
            </Text>
            <Text className="text-slate-700 text-sm leading-5">
              ✅ <Text className="font-semibold">Economic Intelligence:</Text> System learns realistic cost patterns beyond just fuel.
            </Text>
          </View>

          <View className="bg-purple-100 rounded-lg p-3 mt-3">
            <Text className="text-purple-900 text-xs font-bold text-center">
              🔬 Research Novelty: Adaptive, boat-specific trip cost intelligence with external cost modeling
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LearningSummaryScreen;
