import React from "react";
import { View, Text } from "react-native";

const money = (n: any) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "0";
  return Math.round(num).toLocaleString("en-LK");
};

export default function OptimizeResultCards({ optimization }: { optimization: any }) {
  if (!optimization?.best) return null;

  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      <Text className="text-xs text-slate-400 font-semibold uppercase mb-2">Optimization</Text>
      <Text className="text-slate-800 font-bold text-lg">
        Best Speed: {optimization.best.speed} knots
      </Text>
      <Text className="text-slate-500 mt-1">
        Optimized Cost: Rs {money(optimization.best.predictedTotalCost)}
      </Text>
    </View>
  );
}