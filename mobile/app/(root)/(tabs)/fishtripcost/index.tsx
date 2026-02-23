import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import TripCostCalculator from "./components/TripCostCalculator";
import TripLogger from "./components/TripLogger";
import TripPlanner from "./components/TripPlanner";

export default function FishtripCost() {
  const [activeTab, setActiveTab] = useState("calculator");

  const renderContent = () => {
    switch (activeTab) {
      case "calculator":
        return <TripCostCalculator />;
      case "logger":
        return <TripLogger />;
      case "planner":
        return <TripPlanner />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      
      {/* Tab Buttons */}
      <View className="flex-row justify-around bg-white py-5 shadow-sm">

        <TouchableOpacity
          onPress={() => setActiveTab("calculator")}
          className={`px-4 py-2 rounded-lg ${
            activeTab === "calculator" ? "bg-slate-900" : "bg-transparent"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeTab === "calculator" ? "text-white" : "text-slate-700"
            }`}
          >
            Cost Calculator
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("logger")}
          className={`px-4 py-2 rounded-lg ${
            activeTab === "logger" ? "bg-slate-900" : "bg-transparent"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeTab === "logger" ? "text-white" : "text-slate-700"
            }`}
          >
            Trip Logger
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("planner")}
          className={`px-4 py-2 rounded-lg ${
            activeTab === "planner" ? "bg-slate-900" : "bg-transparent"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeTab === "planner" ? "text-white" : "text-slate-700"
            }`}
          >
            Trip Planner
          </Text>
        </TouchableOpacity>

      </View>

      {/* Content Area */}
      <View className="flex-1 p-5">
        {renderContent()}
      </View>

    </SafeAreaView>
  );
}
