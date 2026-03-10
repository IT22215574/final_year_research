// mobile/app/(root)/(tabs)/fishtripcost/history.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getMyTrips } from "@/services/tripService";
import { getMyBoats } from "@/services/boatService";
import FishTripNavBar from "./components/FishTripNavBar";

const money = (n: any) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "0";
  return Math.round(num).toLocaleString("en-LK");
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
  });
};

const getTripDisplayName = (trip: any) => {
  const createdAt = trip?.createdAt ? new Date(trip.createdAt) : null;
  const status = trip?.status || "planned";
  const mode = trip?.mode || "island";
  const boatName = trip?.boat?.boatName || trip?.boatName;

  const dateStr = createdAt
    ? createdAt.toLocaleDateString("en-LK", { month: "short", day: "numeric" })
    : "Unknown";

  const statusEmojiMap: Record<string, string> = {
    planned: "📋",
    completed: "✅",
    cancelled: "❌",
  };
  const statusEmoji = statusEmojiMap[status] || "🎣";

  const modeText = mode === "international" ? "Int." : "Island";

  if (boatName) {
    return `${statusEmoji} ${boatName} - ${dateStr}`;
  }

  return `${statusEmoji} ${modeText} Trip - ${dateStr}`;
};

const HistoryScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [boats, setBoats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const load = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [tripsData, boatsData] = await Promise.all([
        getMyTrips(),
        getMyBoats(),
      ]);
      setTrips(Array.isArray(tripsData) ? tripsData : []);
      setBoats(Array.isArray(boatsData) ? boatsData : []);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    load(true);
  };

  const openTripDetails = (trip: any) => {
    setSelectedTrip(trip);
    setModalVisible(true);
  };

  const filteredTrips = trips.filter((trip) => {
    // Filter by selected boat
    if (selectedBoatId && trip.boatId !== selectedBoatId) {
      return false;
    }

    // Filter by search query
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const tripId = String(trip?._id ?? trip?.id).toLowerCase();
    const boatName = (
      trip?.boat?.boatName ||
      trip?.boatName ||
      ""
    ).toLowerCase();
    const boatType = (
      trip?.boat?.boatType ||
      trip?.boatType ||
      ""
    ).toLowerCase();
    const tripName = getTripDisplayName(trip).toLowerCase();
    const date = trip?.createdAt
      ? new Date(trip.createdAt).toLocaleString().toLowerCase()
      : "";

    return (
      tripId.includes(query) ||
      boatName.includes(query) ||
      boatType.includes(query) ||
      tripName.includes(query) ||
      date.includes(query)
    );
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <FishTripNavBar />

      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-3 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-9 h-9 rounded-lg bg-gray-100 items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Text className="text-gray-600 text-lg">←</Text>
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-bold text-gray-900">History</Text>
              <Text className="text-xs text-gray-500">
                {filteredTrips.length} {selectedBoatId ? 'filtered' : 'saved'} trips
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            className="w-9 h-9 rounded-lg bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <Text className="text-gray-600 text-lg">↻</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="mt-3">
          <View className="bg-gray-100 rounded-lg px-3 py-2 flex-row items-center">
            <Text className="text-gray-400 text-sm mr-2">🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search trips, boats, dates..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-gray-900 text-sm py-1"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Text className="text-gray-400 text-sm">✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Boat Filter */}
        {boats.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            contentContainerStyle={{ paddingRight: 16 }}
          >
            <TouchableOpacity
              onPress={() => setSelectedBoatId(null)}
              className={`mr-2 px-4 py-2 rounded-full ${
                selectedBoatId === null ? "bg-indigo-600" : "bg-gray-100"
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedBoatId === null ? "text-white" : "text-gray-700"
                }`}
              >
                All Boats ({trips.length})
              </Text>
            </TouchableOpacity>
            {boats.map((boat) => {
              const boatTripCount = trips.filter(
                (t) => t.boatId === boat._id,
              ).length;
              const isSelected = selectedBoatId === boat._id;

              return (
                <TouchableOpacity
                  key={boat._id}
                  onPress={() => setSelectedBoatId(boat._id)}
                  className={`mr-2 px-4 py-2 rounded-full ${
                    isSelected ? "bg-indigo-600" : "bg-gray-100"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isSelected ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {boat.boatName} ({boatTripCount})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : trips.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-2xl bg-gray-100 items-center justify-center mb-4">
            <Text className="text-3xl">🗺️</Text>
          </View>
          <Text className="text-gray-900 font-bold text-lg mb-2">
            No Trips Yet
          </Text>
          <Text className="text-gray-500 text-center text-sm mb-4">
            Plan and save your first trip
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(root)/(tabs)/fishtripcost")}
            className="bg-indigo-600 rounded-lg px-5 py-3"
          >
            <Text className="text-white font-semibold text-sm">
              Plan Trip →
            </Text>
          </TouchableOpacity>
        </View>
      ) : filteredTrips.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-2xl bg-gray-100 items-center justify-center mb-4">
            <Text className="text-3xl">🔍</Text>
          </View>
          <Text className="text-gray-900 font-bold text-lg mb-2">
            No Matches Found
          </Text>
          <Text className="text-gray-500 text-center text-sm mb-4">
            {selectedBoatId
              ? `No trips found for the selected boat${searchQuery ? ' and search query' : ''}`
              : `No trips match "${searchQuery}"`}
          </Text>
          <View className="flex-row gap-2">
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                className="bg-gray-200 rounded-lg px-4 py-2"
              >
                <Text className="text-gray-700 text-sm font-medium">
                  Clear search
                </Text>
              </TouchableOpacity>
            )}
            {selectedBoatId && (
              <TouchableOpacity
                onPress={() => setSelectedBoatId(null)}
                className="bg-indigo-600 rounded-lg px-4 py-2"
              >
                <Text className="text-white text-sm font-medium">
                  Show all boats
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => String(item?._id ?? item?.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
            />
          }
          renderItem={({ item }) => {
            const id = String(item?._id ?? item?.id).slice(-6);
            const createdAt = item?.createdAt
              ? formatDate(item.createdAt)
              : "—";
            const predictedTotal =
              item?.predictedTotalCost ?? item?.predictedCost ?? null;
            const actualFuel =
              item?.actualFuelLiters ?? item?.fuelUsedLiters ?? null;
            const hasActual = actualFuel !== null;

            return (
              <TouchableOpacity
                onPress={() => openTripDetails(item)}
                activeOpacity={0.7}
                className="bg-white rounded-xl border border-gray-200 p-4 mb-2"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-lg bg-indigo-100 items-center justify-center mr-3">
                      <Text className="text-sm">🎣</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold text-sm">
                        {getTripDisplayName(item)}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {item?.boat?.boatName || item?.boatName
                          ? `${item?.boat?.boatName || item?.boatName} • ${createdAt}`
                          : createdAt}
                      </Text>
                    </View>
                  </View>
                  <View
                    className={`rounded-full px-2 py-1 ${hasActual ? "bg-emerald-100" : "bg-gray-100"}`}
                  >
                    <Text
                      className={`text-xs font-medium ${hasActual ? "text-emerald-700" : "text-gray-600"}`}
                    >
                      {hasActual ? "✓ Logged" : "Pending"}
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500">Predicted</Text>
                    <Text className="text-sm font-bold text-gray-900">
                      Rs {money(predictedTotal)}
                    </Text>
                  </View>
                  {hasActual && (
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500">Actual Fuel</Text>
                      <Text className="text-sm font-bold text-emerald-600">
                        {actualFuel} L
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row mt-3 pt-2 border-t border-gray-100">
                  <Text className="text-xs text-gray-400">
                    Tap to view details →
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className="bg-white rounded-t-3xl p-5"
            style={{ maxHeight: "80%" }}
          >
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedTrip && (
                <View>
                  {/* Header */}
                  <View className="flex-row items-center mb-4">
                    <View className="w-12 h-12 rounded-2xl bg-indigo-100 items-center justify-center mr-4">
                      <Text className="text-2xl">🎣</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xl font-bold text-gray-900">
                        {getTripDisplayName(selectedTrip)}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {selectedTrip?.createdAt
                          ? new Date(selectedTrip.createdAt).toLocaleString()
                          : "—"}
                      </Text>
                      <Text className="text-xs text-gray-400 mt-1">
                        ID:{" "}
                        {String(selectedTrip?._id ?? selectedTrip?.id).slice(
                          -8,
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* Predictions */}
                  <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Predictions
                  </Text>
                  <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <View className="flex-row justify-between mb-3">
                      <Text className="text-gray-600">Total Cost</Text>
                      <Text className="font-bold text-gray-900">
                        Rs{" "}
                        {money(
                          selectedTrip?.predictedTotalCost ??
                            selectedTrip?.predictedCost,
                        )}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Fuel Required</Text>
                      <Text className="font-bold text-gray-900">
                        {selectedTrip?.predictedFuelLiters ??
                          selectedTrip?.fuel?.predictedFuelLiters ??
                          "—"}{" "}
                        L
                      </Text>
                    </View>
                  </View>

                  {/* Actuals if available */}
                  {(selectedTrip?.actualFuelLiters ||
                    selectedTrip?.fuelUsedLiters ||
                    selectedTrip?.actualCatchKg) && (
                    <>
                      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Actual Results
                      </Text>
                      <View className="bg-emerald-50 rounded-xl p-4 mb-4">
                        {(selectedTrip?.actualFuelLiters ||
                          selectedTrip?.fuelUsedLiters) && (
                          <View className="flex-row justify-between mb-3">
                            <Text className="text-emerald-700">Fuel Used</Text>
                            <Text className="font-bold text-emerald-700">
                              {selectedTrip?.actualFuelLiters ??
                                selectedTrip?.fuelUsedLiters}{" "}
                              L
                            </Text>
                          </View>
                        )}
                        {selectedTrip?.actualCatchKg && (
                          <View className="flex-row justify-between">
                            <Text className="text-emerald-700">
                              Catch Weight
                            </Text>
                            <Text className="font-bold text-emerald-700">
                              {selectedTrip.actualCatchKg} kg
                            </Text>
                          </View>
                        )}
                      </View>
                    </>
                  )}

                  {/* Boat Info */}
                  {(selectedTrip?.boat?.boatName ||
                    selectedTrip?.boatName ||
                    selectedTrip?.boatId) && (
                    <>
                      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Boat Details
                      </Text>
                      <View className="bg-gray-50 rounded-xl p-4 mb-4">
                        <View className="flex-row justify-between mb-3">
                          <Text className="text-gray-600">Boat Name</Text>
                          <Text className="font-semibold text-gray-900">
                            {selectedTrip?.boat?.boatName ||
                              selectedTrip?.boatName ||
                              "Unknown Boat"}
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600">Boat Type</Text>
                          <Text className="font-medium text-gray-900">
                            {selectedTrip?.boat?.boatType ||
                              selectedTrip?.boatType ||
                              "—"}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}

                  {/* Trip Details */}
                  {selectedTrip?.distanceKm && (
                    <>
                      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Trip Details
                      </Text>
                      <View className="bg-gray-50 rounded-xl p-4 mb-4">
                        <View className="flex-row justify-between mb-3">
                          <Text className="text-gray-600">Distance</Text>
                          <Text className="font-medium text-gray-900">
                            {selectedTrip.distanceKm} km
                          </Text>
                        </View>
                        <View className="flex-row justify-between mb-3">
                          <Text className="text-gray-600">Duration</Text>
                          <Text className="font-medium text-gray-900">
                            {selectedTrip.fishingHours || 0} hrs
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600">Crew</Text>
                          <Text className="font-medium text-gray-900">
                            {selectedTrip.crewCount || 0}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}

                  {/* Action Buttons */}
                  <View className="flex-row gap-3 mt-2 mb-4">
                    {selectedTrip &&
                      !!selectedTrip?.boatId &&
                      (selectedTrip?.predictedFuelLiters ||
                        selectedTrip?.fuel?.predictedFuelLiters) && (
                        <TouchableOpacity
                          onPress={() => {
                            setModalVisible(false);
                            router.push({
                              pathname:
                                "/(root)/(tabs)/fishtripcost/log-actual",
                              params: {
                                tripId: String(
                                  selectedTrip?._id ?? selectedTrip?.id,
                                ),
                              },
                            });
                          }}
                          className="flex-1 bg-indigo-600 rounded-xl py-4 items-center"
                        >
                          <Text className="text-white font-semibold">
                            Log Actual
                          </Text>
                        </TouchableOpacity>
                      )}
                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                    >
                      <Text className="text-gray-700 font-semibold">Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HistoryScreen;
