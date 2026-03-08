import { Stack } from "expo-router";

export default function CostsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-cost"
        options={{
          title: "Add External Cost",
          headerStyle: { backgroundColor: "#F8FAFC" },
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          title: "Edit External Cost",
          headerStyle: { backgroundColor: "#F8FAFC" },
        }}
      />
    </Stack>
  );
}

