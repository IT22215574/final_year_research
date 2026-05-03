import { Stack } from "expo-router";

export default function FisherAdminModulesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {" "}
      {/* ✅ Add it here to be safe */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="boat-analytics" options={{ headerShown: false }} />
      <Stack.Screen name="dataset" options={{ headerShown: false }} />
      <Stack.Screen name="boattypes" options={{ headerShown: false }} />
      <Stack.Screen name="modeltrain" options={{ headerShown: false }} />
      <Stack.Screen name="modelregistry" options={{ headerShown: false }} />
    </Stack>
  );
}
