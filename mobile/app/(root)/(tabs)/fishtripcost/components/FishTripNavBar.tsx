import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type NavItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const navItems: NavItem[] = [
  { 
    id: "dashboard", 
    label: "Dashboard", 
    icon: "home", 
    route: "/fishtripcost" 
  },
  { 
    id: "planner", 
    label: "New Trip", 
    icon: "add-circle", 
    route: "/fishtripcost/planner" 
  },
  { 
    id: "past-trips", 
    label: "Past Trips", 
    icon: "list", 
    route: "/fishtripcost/past-trips" 
  },
  { 
    id: "boats", 
    label: "Boats", 
    icon: "boat", 
    route: "/(root)/(tabs)/boats" 
  },
  { 
    id: "learning", 
    label: "Learning", 
    icon: "analytics", 
    route: "/fishtripcost/learning-summary" 
  },
  { 
    id: "history", 
    label: "Analytics", 
    icon: "stats-chart", 
    route: "/fishtripcost/history" 
  },
];

export default function FishTripNavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (route: string) => {
    // Check if current path matches the route
    if (route === "/fishtripcost") {
      return pathname === "/fishtripcost" || pathname === "/(root)/(tabs)/fishtripcost";
    }
    return pathname.includes(route.replace("/(root)/(tabs)", ""));
  };

  const handleNavigation = (route: string) => {
    router.push(route as any);
  };

  return (
    <View 
      className="bg-white border-b border-slate-200"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}
      >
        {navItems.map((item) => {
          const active = isActive(item.route);
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleNavigation(item.route)}
              className={`flex-row items-center px-4 py-2 rounded-lg mr-2 ${
                active ? "bg-blue-600" : "bg-slate-50"
              }`}
              style={{
                shadowColor: active ? "#3b82f6" : "transparent",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
                elevation: active ? 2 : 0,
              }}
            >
              <Ionicons 
                name={item.icon} 
                size={18} 
                color={active ? "#ffffff" : "#64748b"} 
              />
              <Text
                className={`ml-2 font-semibold text-sm ${
                  active ? "text-white" : "text-slate-700"
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

