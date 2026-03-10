import "react-native-gesture-handler";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";
import { StatusBar } from "expo-status-bar";

// Suppress the SafeAreaView deprecation warning that comes from third-party libraries
// All project code uses react-native-safe-area-context which is the correct package
const _warn = console.warn.bind(console);
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('SafeAreaView has been deprecated')) return;
  _warn(...args);
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    'Cretina-Bold': require('../assets/fonts/Cretina-Bold.ttf'),
    'Cretina-Regular': require('../assets/fonts/Cretina-Regular.ttf'),
    'DMSerifDisplay-Regular': require('../assets/fonts/DMSerifDisplay-Regular.ttf'),
    'DMSerifDisplay-Italic': require('../assets/fonts/DMSerifDisplay-Italic.ttf'),
    'GrandHotel-Regular': require('../assets/fonts/GrandHotel-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

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
