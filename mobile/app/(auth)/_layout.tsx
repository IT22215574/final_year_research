/* eslint-disable prettier/prettier */
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { useFonts } from 'expo-font';
import React, { useEffect } from 'react';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const Layout = () => {
  const [fontsLoaded, error] = useFonts({
    'Poppins-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('../../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Medium': require('../../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-Light': require('../../assets/fonts/Poppins-Light.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || error) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) {
    return null;
  }

  return React.createElement(
    Stack,
    null,
    React.createElement(Stack.Screen, { name: "sign-up", options: { headerShown: false } }),
    React.createElement(Stack.Screen, { name: "sign-in", options: { headerShown: false } }),
    React.createElement(Stack.Screen, { name: "selectSignIn", options: { headerShown: false } }),
    React.createElement(Stack.Screen, { name: "onBoard1", options: { headerShown: false } }),
    React.createElement(Stack.Screen, { name: "onBoard2", options: { headerShown: false } }),
    React.createElement(Stack.Screen, { name: "onBoard3", options: { headerShown: false } }),
    React.createElement(Stack.Screen, { name: "forgetpassword", options: { headerShown: false } }),
    React.createElement(Stack.Screen, { name: "otprequest", options: { headerShown: false } }),
    React.createElement(Stack.Screen, { name: "resetpassword", options: { headerShown: false } }),
    React.createElement(Stack.Screen, { name: "success", options: { headerShown: false } }),
  );
};

export default Layout;