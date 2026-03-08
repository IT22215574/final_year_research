import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TripPlanner from "./components/TripPlanner";
import FishTripNavBar from "./components/FishTripNavBar";

export default function PlannerScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <FishTripNavBar />
      <TripPlanner />
    </SafeAreaView>
  );
}

