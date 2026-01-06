import { Link, Stack } from "expo-router";
import { Text } from "react-native";
import RootLayout from "./_layout";
import Home from ".";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <Text>
        <Text>This screen doesn't exist.</Text>
        <Link href="/">
          <Text>Go to home screen!</Text>
        </Link>
      </Text>
    </>
  );
}
