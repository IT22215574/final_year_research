/* eslint-disable prettier/prettier */
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { Trip } from "@/types/type";
import { getMyTrips } from "@/services/tripService";

const PrevTrip = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // ================= Fetch Trips =================
  const fetchTrips = async () => {
    try {
      const data = await getMyTrips(); // ✅ Use service function
      setTrips(data);
    } catch (error) {
      console.log("Error fetching trips:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  // ================= Render Each Trip =================
  const renderItem = ({ item }: { item: Trip }) => {
    const departure = new Date(item.departureTime);
    const returnTime = new Date(item.returnTime);

    return (
      <View className="bg-white p-4 mb-3 rounded-2xl shadow">
        <Text className="text-lg font-bold">{item.boatType || "Boat Trip"}</Text>

        <Text className="text-gray-600">Departure: {departure.toLocaleString()}</Text>
        <Text className="text-gray-600">Return: {returnTime.toLocaleString()}</Text>
        <Text className="text-gray-600">Duration: {item.tripDurationHours ?? 0} hrs</Text>
        <Text className="text-gray-600">Distance: {item.distanceKm ?? 0} km</Text>

        <Text className="text-blue-600 font-bold mt-2">
          Total Cost: ${item.totalCost?.toFixed(2) ?? "0.00"}
        </Text>
      </View>
    );
  };

  // ================= Loading State =================
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ================= Main UI =================
  return (
    <View className="flex-1 p-4 bg-gray-100">
      <FlatList
        data={trips}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-10">
            <Text className="text-gray-500">No trips found</Text>
          </View>
        }
      />
    </View>
  );
};

export default PrevTrip;
