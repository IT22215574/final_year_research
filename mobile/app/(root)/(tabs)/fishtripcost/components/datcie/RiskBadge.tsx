import React from "react";
import { View, Text } from "react-native";

const getStyle = (risk?: string | null) => {
  switch (risk?.toLowerCase()) {
    case "low":
      return { box: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" };
    case "medium":
      return { box: "bg-amber-50 border-amber-200", text: "text-amber-700" };
    case "high":
      return { box: "bg-rose-50 border-rose-200", text: "text-rose-700" };
    default:
      return { box: "bg-slate-50 border-slate-200", text: "text-slate-700" };
  }
};

export default function RiskBadge({ risk }: { risk?: string | null }) {
  if (!risk) return null;
  const s = getStyle(risk);

  return (
    <View className={`bg-white rounded-2xl border border-slate-100 p-4`}>
      <Text className="text-xs text-slate-400 font-semibold uppercase mb-2">Risk Category</Text>
      <View className={`border rounded-full px-4 py-2 self-start ${s.box}`}>
        <Text className={`font-bold capitalize ${s.text}`}>{risk}</Text>
      </View>
    </View>
  );
}
