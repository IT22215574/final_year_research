import { View, Text, TouchableOpacity, FlatList } from "react-native";
import React, { useState } from "react";

/** Trip type */
type Trip = {
  id: string;
  place: string;
  date: string;
};

/** Allowed tab names */
type TabType = "Completed" | "Cancelled";

export default function PrevTrip() {
  // ✅ Correctly typed state
  const [activeTab, setActiveTab] = useState<TabType>("Completed");

  // ✅ Typed trips object
  const trips: Record<TabType, Trip[]> = {
    Completed: [
      { id: "1", place: "Deep sea1", date: "2025-01-10" },
      { id: "2", place: "Deep sea2", date: "2024-12-05" },
    ],
    Cancelled: [
      { id: "3", place: "Nuwara Eliya", date: "2024-11-20" },
    ],
  };

  /** Trip card */
  const renderTrip = ({ item }: { item: Trip }) => (
    <View className="bg-white p-4 mb-3 rounded-2xl shadow-sm border border-gray-200">
      <Text className="text-lg font-semibold text-gray-800">{item.place}</Text>
      <Text className="text-gray-500 mt-1">{item.date}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-100 px-4 pt-6">
      {/* Title */}
      <Text className="text-2xl font-bold text-gray-800 mb-4">
        Previous Trips
      </Text>

      {/* Tabs */}
      <View className="flex-row bg-gray-200 rounded-full p-1 mb-5">
        {(Object.keys(trips) as TabType[]).map((tab) => {
          const isActive = activeTab === tab;

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-full ${
                isActive ? "bg-blue-500" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  isActive ? "text-white" : "text-gray-700"
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Trip List */}
      <FlatList
        data={trips[activeTab]}   
        keyExtractor={(item) => item.id}
        renderItem={renderTrip}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="text-center text-gray-500 mt-10">
            No trips available
          </Text>
        }
      />
    </View>
  );
}
