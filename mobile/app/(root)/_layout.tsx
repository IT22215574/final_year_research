import { View, Text } from "react-native";
import React from "react";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import { CustomDrawerContent } from "@/components/CustomDrawer";
import { Ionicons } from "@expo/vector-icons";

const RootLayout = () => {
  return (
    <>
      <StatusBar style="light" backgroundColor="#3b82f6" translucent={false} />
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          drawerStyle: {
            backgroundColor: "#fff",
            width: 280,
          },
          headerShown: false,
          drawerActiveTintColor: "#0057FF",
          drawerInactiveTintColor: "#64748b",
          drawerLabelStyle: {
            fontSize: 16,
            fontWeight: "600",
            marginLeft: 0,
          },
          drawerItemStyle: {
            paddingVertical: 12,
            paddingHorizontal: 12,
            marginHorizontal: 8,
            borderRadius: 8,
          },
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerLabel: "Home",
            title: "Home",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="home" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="(screens)"
          options={{
            drawerLabel: "Settings",
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer>
    </>
  );
};

export default RootLayout;
