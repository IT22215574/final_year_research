import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getMyBoats, type Boat } from "@/services/boatService";

export default function BoatsListScreen() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBoats = async () => {
    try {
      setLoading(true);
      const data = await getMyBoats();
      setBoats(data);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load boats");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBoats();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBoats();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0066CC" />
        <Text className="text-slate-500 mt-3">Loading boats...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="px-5 pt-6 pb-4">
          <Text className="text-2xl font-bold text-slate-900">My Boats</Text>
          <Text className="text-sm text-slate-600 mt-1">
            {boats.length} boat{boats.length !== 1 ? "s" : ""} ready for DATCIE
            prediction
          </Text>
        </View>

        {/* Add Boat Button */}
        <View className="px-5 mb-4">
          <TouchableOpacity
            onPress={() => router.push("/(root)/(tabs)/boats/add-boat" as any)}
            className="bg-blue-600 rounded-xl py-4 flex-row items-center justify-center"
          >
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text className="text-white font-bold text-base ml-2">
              Add New Boat
            </Text>
          </TouchableOpacity>
        </View>

        {/* Empty State */}
        {boats.length === 0 ? (
          <View className="px-5 py-10 items-center">
            <Ionicons name="boat-outline" size={64} color="#CBD5E1" />
            <Text className="text-lg font-semibold text-slate-700 mt-4">
              No boats yet
            </Text>
            <Text className="text-sm text-slate-500 text-center mt-2">
              Add your first boat to start using DATCIE trip cost prediction
            </Text>
          </View>
        ) : (
          /* Boats List */
          <View className="px-5">
            {boats.map((boat) => {
              const boatImageUrl = boat.boatImage
                ? `${process.env.EXPO_PUBLIC_API_BASE_URL}${boat.boatImage}`
                : null;

              return (
                <TouchableOpacity
                  key={boat._id}
                  onPress={() =>
                    router.push(`/(root)/(tabs)/boats/${boat._id}` as any)
                  }
                  className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-slate-100"
                  activeOpacity={0.7}
                >
                  <View className="flex-row">
                    {/* Boat Image */}
                    {boatImageUrl ? (
                      <Image
                        source={{ uri: boatImageUrl }}
                        className="w-20 h-20 rounded-xl mr-4"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-20 h-20 rounded-xl bg-slate-100 items-center justify-center mr-4">
                        <Ionicons
                          name="boat-outline"
                          size={32}
                          color="#94A3B8"
                        />
                      </View>
                    )}

                    {/* Boat Info */}
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-slate-900">
                        {boat.boatName || "Unnamed Boat"}
                      </Text>
                      <Text className="text-sm text-slate-600 mt-1">
                        {boat.boatType || "Unknown Type"}
                      </Text>
                      <View className="flex-row items-center mt-2">
                        <View className="bg-blue-100 px-2 py-1 rounded-md mr-2">
                          <Text className="text-xs font-semibold text-blue-700">
                            {boat.engineHorsePower ?? boat.engineHP ?? "?"} HP
                          </Text>
                        </View>
                        <View className="bg-slate-100 px-2 py-1 rounded-md">
                          <Text className="text-xs font-semibold text-slate-700">
                            {boat.mode || "island"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Arrow Icon */}
                    <View className="justify-center">
                      <Ionicons
                        name="chevron-forward"
                        size={24}
                        color="#94A3B8"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

