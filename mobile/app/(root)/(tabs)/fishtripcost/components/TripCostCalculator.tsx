import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { useRouter } from "expo-router";

const TripCostCalculator = () => {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white p-5 justify-start">
      {/* Title */}
      <Text className="text-xl font-bold text-slate-800 mb-8 text-center">
        Trip Cost Calculator
      </Text>

      {/* Buttons Container */}
      <View className="items-center flex-col w-full">
        {/* New Trip Button */}
        <TouchableOpacity
          className="bg-slate-900 py-4 rounded-2xl shadow-md w-3/4"
          onPress={() => router.push("/fishtripcost/components/NewTrip")}
        >
          <Text className="text-white text-center font-semibold text-base">
            + New Trip
          </Text>
        </TouchableOpacity>

        {/* Previous Trips Button */}
        <TouchableOpacity className="bg-slate-200 py-4 rounded-2xl shadow-sm w-3/4 mt-10"
         onPress={() => router.push("/fishtripcost/components/prevTrip")}
        >
          <Text className="text-slate-800 text-center font-semibold text-base">
            View Previous Trips
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TripCostCalculator;
