import { Stack } from "expo-router";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function FishTripCostLayout() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error("FishTripCost Layout Error:", error, errorInfo);
        // Could send to crash analytics service here
      }}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          headerTitle: "Fishtrip Cost",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="planner" />
        <Stack.Screen name="past-trips" />
        <Stack.Screen name="history" />
        <Stack.Screen name="learning-summary" />
        <Stack.Screen name="log-actual" />
        <Stack.Screen name="mapview" />
        <Stack.Screen name="result" />
        <Stack.Screen name="boats" options={{ headerShown: false }} />
        <Stack.Screen name="costs" options={{ headerShown: false }} />
        <Stack.Screen name="components" />
        <Stack.Screen name="trip-details/[id]" />
        <Stack.Screen name="edit-trip/[id]" />
      </Stack>
    </ErrorBoundary>
  );
}
