import React from "react";
import { View, Text } from "react-native";

export default function RecommendationList({ list }: { list: string[] }) {
  if (!Array.isArray(list) || list.length === 0) return null;

  return (
    <View
      className="bg-white rounded-2xl border border-slate-100 p-5"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <Text className="text-base font-semibold text-slate-800 mb-3">📝 Recommendations</Text>
      {list.map((r, idx) => (
        <View key={idx} className="flex-row items-start mb-2.5">
          <View className="w-5 h-5 rounded-full bg-blue-600 items-center justify-center mr-3 mt-0.5">
            <Text className="text-white text-xs font-bold">{idx + 1}</Text>
          </View>
          <Text className="flex-1 text-slate-600 text-sm leading-5">{r}</Text>
        </View>
      ))}
    </View>
  );
}
