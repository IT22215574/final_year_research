import { Stack } from "expo-router";

export default function BoatsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="add-boat" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}

