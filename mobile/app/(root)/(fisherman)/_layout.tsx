import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { Drawer } from "expo-router/drawer";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import useAuthStore from "@/stores/authStore";
import { LinearGradient } from "expo-linear-gradient";
import "react-native-reanimated";
import "react-native-gesture-handler";

function CustomDrawerContent(props: any) {
  const { currentUser, signOut } = useAuthStore();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const menuItems = [
    {
      name: "Dashboard",
      route: "/(root)/(fisherman)/dashboard",
      icon: "home",
      activeIcon: "home",
    },
    {
      name: "Trip Cost Predictor",
      route: "/(root)/(fisherman)/trip-cost-prediction",
      icon: "calculator",
      activeIcon: "calculator",
    },
    {
      name: "External Costs",
      route: "/(root)/(fisherman)/external-costs",
      icon: "wallet-outline",
      activeIcon: "wallet",
    },
    {
      name: "My Trips",
      route: "/(root)/(fisherman)/my-trips",
      icon: "boat",
      activeIcon: "boat",
    },
    {
      name: "Trip Logger",
      route: "/(root)/(fisherman)/trip-logger",
      icon: "create-outline",
      activeIcon: "create",
    },
    {
      name: "Profile",
      route: "/(root)/(fisherman)/profile",
      icon: "person",
      activeIcon: "person",
    },
  ];

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={styles.drawerContainer}>
        {/* Header with User Info */}
        <LinearGradient
          colors={["#3b82f6", "#2563eb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.drawerHeader}
        >
          <View style={styles.userImageContainer}>
            {currentUser?.profilePicture ? (
              <Image
                source={{ uri: currentUser.profilePicture }}
                style={styles.userImage}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="person" size={40} color="#3b82f6" />
              </View>
            )}
          </View>
          <Text style={styles.userName}>
            {currentUser?.firstName} {currentUser?.lastName}
          </Text>
          <Text style={styles.userRole}>{currentUser?.role}</Text>
          <Text style={styles.userEmail}>{currentUser?.email}</Text>
        </LinearGradient>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => {
            const isActive = pathname === item.route;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => router.push(item.route as any)}
              >
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={24}
                  color={isActive ? "#3b82f6" : "#6b7280"}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    isActive && styles.menuItemTextActive,
                  ]}
                >
                  {item.name}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

export default function FishermanLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          width: 280,
        },
        headerStyle: {
          backgroundColor: "#3b82f6",
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Drawer.Screen
        name="dashboard"
        options={{
          drawerLabel: "Dashboard",
          title: "Fisherman Dashboard",
          headerShown: true,
        }}
      />
      <Drawer.Screen
        name="trip-cost-prediction"
        options={{
          drawerLabel: "Trip Cost Predictor",
          title: "Trip Cost Prediction",
          headerShown: true,
        }}
      />
      <Drawer.Screen
        name="external-costs"
        options={{
          drawerLabel: "External Costs",
          title: "External Costs Manager",
          headerShown: true,
        }}
      />
      <Drawer.Screen
        name="my-trips"
        options={{
          drawerLabel: "My Trips",
          title: "My Fishing Trips",
          headerShown: true,
        }}
      />
      <Drawer.Screen
        name="trip-logger"
        options={{
          drawerLabel: "Trip Logger",
          title: "Log New Trip",
          headerShown: true,
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          drawerLabel: "Profile",
          title: "My Profile",
          headerShown: true,
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  userImageContainer: {
    marginBottom: 15,
  },
  userImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: "#dbeafe",
    marginBottom: 4,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 12,
    color: "#dbeafe",
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 10,
    position: "relative",
  },
  menuItemActive: {
    backgroundColor: "#eff6ff",
  },
  menuItemText: {
    fontSize: 16,
    color: "#6b7280",
    marginLeft: 15,
    fontWeight: "500",
  },
  menuItemTextActive: {
    color: "#3b82f6",
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    right: 0,
    width: 4,
    height: "80%",
    backgroundColor: "#3b82f6",
    borderRadius: 2,
  },
  logoutContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 20,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
  },
  logoutText: {
    fontSize: 16,
    color: "#ef4444",
    marginLeft: 15,
    fontWeight: "600",
  },
});
