// mobile/app/(root)/(tabs)/fishtripcost/history.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getMyTrips } from "@/services/tripService";
import FishTripNavBar from "./components/FishTripNavBar";

const money = (n: any) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "0";
  return Math.round(num).toLocaleString("en-LK");
};

const HistoryScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getMyTrips();
      setTrips(Array.isArray(data) ? data : []);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <FishTripNavBar />
      <View className="px-5 pt-3 pb-3 flex-row justify-between items-center bg-white border-b border-slate-100">
        <View>
          <Text className="text-xl font-bold text-slate-900">Trip History</Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            Saved trips + predicted/actual values
          </Text>
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={load}
            className="bg-slate-100 rounded-xl px-3 py-2"
            activeOpacity={0.8}
          >
            <Text className="text-slate-700 font-semibold">↻ Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-slate-100 rounded-xl px-3 py-2"
            activeOpacity={0.8}
          >
            <Text className="text-slate-700 font-semibold">← Back</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="text-slate-500 mt-2">Loading trips...</Text>
        </View>
      ) : trips.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-slate-800 font-semibold text-lg mb-2">
            No trips yet
          </Text>
          <Text className="text-slate-500 text-center mb-4">
            Predict → Save trip to see it here.
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
        <FlatList
          data={trips}
          keyExtractor={(item) => String(item?._id ?? item?.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          renderItem={({ item }) => {
            const id = item?._id ?? item?.id;

            const createdAt = item?.createdAt
              ? new Date(item.createdAt).toLocaleString()
              : "—";

            const predictedTotal =
              item?.predictedTotalCost ??
              item?.predictedCost ??
              item?.cost?.predictedTotalCost ??
              null;

            const predictedFuel =
              item?.predictedFuelLiters ??
              item?.fuel?.predictedFuelLiters ??
              null;

            const actualFuel =
              item?.actualFuelLiters ??
              item?.fuelUsedLiters ??
              item?.actuals?.fuelLiters ??
              null;

            const canLearn =
              !!id &&
              !!item?.boatId &&
              predictedFuel !== null &&
              predictedFuel !== undefined;

            return (
              <View
                className="bg-white rounded-2xl border border-slate-100 p-4 mb-3"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    Alert.alert(
                      "Trip",
                      `Trip ID: ${id}\nCreated: ${createdAt}\nPredicted Total: Rs ${money(
                        predictedTotal,
                      )}\nPredicted Fuel: ${
                        predictedFuel ?? "—"
                      }\nActual Fuel: ${actualFuel ?? "—"}`,
                    );
                  }}
                >
                  <View className="flex-row justify-between items-center">
                    <Text className="text-slate-800 font-bold">
                      Trip #{String(id).slice(-6)}
                    </Text>
                    <View className="bg-slate-100 rounded-full px-3 py-1">
                      <Text className="text-slate-600 text-xs font-semibold">
                        Saved
                      </Text>
                    </View>
                  </View>

                  <Text className="text-slate-400 text-xs mt-1">
                    {createdAt}
                  </Text>

                  <View className="flex-row gap-3 mt-3">
                    <MiniStat
                      label="Predicted Total"
                      value={`Rs ${money(predictedTotal)}`}
                    />
                    <MiniStat
                      label="Actual Fuel"
                      value={actualFuel !== null ? `${actualFuel}` : "—"}
                    />
                  </View>

                  <View className="mt-3">
                    <MiniStat
                      label="Predicted Fuel"
                      value={predictedFuel !== null ? `${predictedFuel}` : "—"}
                    />
                  </View>
                </TouchableOpacity>

                <View className="mt-4">
                  {canLearn ? (
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/(root)/(tabs)/fishtripcost/log-actual",
                          params: { tripId: String(id) },
                        })
                      }
                      className="bg-slate-900 rounded-xl py-3 items-center"
                      activeOpacity={0.85}
                    >
                      <Text className="text-white font-bold">
                        🧾 Log Actual for This Trip
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="bg-slate-100 rounded-xl py-3 items-center">
                      <Text className="text-slate-500 font-semibold text-center px-3">
                        Learning not available for this trip
                      </Text>
                      <Text className="text-slate-400 text-xs mt-1">
                        This trip has no DATCIE prediction data
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const MiniStat = ({ label, value }: { label: string; value: string }) => {
  return (
    <View className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3">
      <Text className="text-xs text-slate-400 font-semibold uppercase">
        {label}
      </Text>
      <Text className="text-slate-800 font-bold mt-1">{value}</Text>
    </View>
  );
};

export default HistoryScreen;
