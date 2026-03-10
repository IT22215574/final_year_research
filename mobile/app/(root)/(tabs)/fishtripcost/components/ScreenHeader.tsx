import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
};

export default function ScreenHeader({
  title,
  subtitle,
  showBackButton = true,
  onBackPress,
  rightComponent,
}: ScreenHeaderProps) {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback to dashboard
      router.push("/(root)/(tabs)/fishtripcost" as any);
    }
  };

  return (
    <View
      className="bg-white px-5 py-4 border-b border-slate-200"
      style={{
        paddingTop: Platform.OS === "ios" ? 16 : 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {showBackButton && (
            <TouchableOpacity
              onPress={handleBackPress}
              className="mr-3 p-2 -ml-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
          )}
          <View className="flex-1">
            <Text className="text-xl font-bold text-slate-900">{title}</Text>
            {subtitle && (
              <Text className="text-sm text-slate-500 mt-0.5">{subtitle}</Text>
            )}
          </View>
        </View>
        {rightComponent && <View className="ml-3">{rightComponent}</View>}
      </View>
    </View>
  );
}
