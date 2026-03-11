import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TripPlanner from "./components/TripPlanner";
import FishTripNavBar from "./components/FishTripNavBar";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function PlannerScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <FishTripNavBar />
      <ErrorBoundary
        onError={(error, errorInfo) => {
          console.error("Trip Planner Error:", error, errorInfo);
          // Could log to analytics service
        }}
      >
        <TripPlanner />
      </ErrorBoundary>
    </SafeAreaView>
  );
}

