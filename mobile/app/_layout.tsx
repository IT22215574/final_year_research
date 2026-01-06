import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";
import { StatusBar } from "expo-status-bar";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load custom fonts
  const [loaded] = useFonts({
    "Cretina-Bold": require("../assets/fonts/Cretina-Bold.ttf"),
    "Cretina-Regular": require("../assets/fonts/Cretina-Regular.ttf"),
    "DMSerifDisplay-Regular": require("../assets/fonts/DMSerifDisplay-Regular.ttf"),
    "DMSerifDisplay-Italic": require("../assets/fonts/DMSerifDisplay-Italic.ttf"),
    "GrandHotel-Regular": require("../assets/fonts/GrandHotel-Regular.ttf"),
  });

  // Hide the splash screen once fonts are loaded
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Return null if fonts are not yet loaded
  if (!loaded) {
    return null;
  }

  // Render the navigation stack
  return (
    <>
      <StatusBar style="light" backgroundColor="#3b82f6" translucent={false} />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(root)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
