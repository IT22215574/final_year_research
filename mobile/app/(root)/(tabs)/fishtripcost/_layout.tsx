import { Stack } from "expo-router";

export default function FishTripCostLayout() {
  return (
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
      <Stack.Screen name="trip-details" />
      <Stack.Screen name="edit-trip" />
    </Stack>
  );
}
