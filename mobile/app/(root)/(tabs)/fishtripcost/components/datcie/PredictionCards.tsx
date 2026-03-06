import React from "react";
import { View, Text } from "react-native";

const money = (n: any) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "0";
  return Math.round(num).toLocaleString("en-LK");
};
const num1 = (n: any) => {
  const num = Number(n);
  if (Number.isNaN(num)) return "0.0";
  return num.toFixed(1);
};

export default function PredictionCards({
  fuelLiters,
  totalCost,
  carbonKg,
  profitProb,
}: {
  fuelLiters: any;
  totalCost: any;
  carbonKg: any;
  profitProb: any;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <Card title="⛽ Fuel (L)" value={fuelLiters != null ? num1(fuelLiters) : "-"} />
        <Card title="💰 Total (Rs)" value={totalCost != null ? money(totalCost) : "-"} highlight />
      </View>

      <View className="flex-row gap-3">
        <Card title="🌿 Carbon (kg)" value={carbonKg != null ? num1(carbonKg) : "-"} />
        <Card
          title="📈 Profitability"
          value={profitProb != null ? `${Math.round(Number(profitProb) * 100)}%` : "-"}
        />
      </View>
    </View>
  );
}

function Card({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View
      className="flex-1 bg-white rounded-2xl border border-slate-100 p-4"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <Text className="text-xs text-slate-400 font-semibold uppercase mb-2">{title}</Text>
      <Text className={`text-2xl font-bold ${highlight ? "text-emerald-600" : "text-slate-800"}`}>
        {value}
      </Text>
    </View>
  );
}