// mobile/app/(root)/(tabs)/fishtripcost/components/ActualVsPredicted.tsx
import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  predictedFuel?: number;
  actualFuel?: number;
  predictedCost?: number;
  actualCost?: number;
  fuelDifference?: number;
  costDifference?: number;
};

const formatNumber = (value?: number, decimals = 1) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return value.toFixed(decimals);
};

const formatCurrency = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `Rs. ${Math.round(value).toLocaleString()}`;
};

const getDifferenceColor = (diff?: number) => {
  if (typeof diff !== "number" || Number.isNaN(diff)) return "text-slate-500";
  if (diff > 0) return "text-rose-600";
  if (diff < 0) return "text-emerald-600";
  return "text-slate-600";
};

const getDifferenceIcon = (diff?: number) => {
  if (typeof diff !== "number" || Number.isNaN(diff)) return "remove";
  if (diff > 0) return "arrow-up";
  if (diff < 0) return "arrow-down";
  return "remove";
};

export default function ActualVsPredicted({
  predictedFuel,
  actualFuel,
  predictedCost,
  actualCost,
  fuelDifference,
  costDifference,
}: Props) {
  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      <Text className="text-sm font-semibold text-slate-700 mb-3">
        📊 Actual vs Predicted
      </Text>

      {/* Fuel Comparison */}
      <View className="bg-blue-50 rounded-xl p-3 mb-3 border border-blue-100">
        <Text className="text-xs font-semibold text-blue-700 mb-2">
          ⛽ Fuel (Liters)
        </Text>
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-xs text-slate-500">Predicted</Text>
            <Text className="text-lg font-bold text-slate-800">
              {formatNumber(predictedFuel)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-slate-500">Actual</Text>
            <Text className="text-lg font-bold text-blue-700">
              {formatNumber(actualFuel)}
            </Text>
          </View>
          <View className="flex-1 items-end">
            <Text className="text-xs text-slate-500">Difference</Text>
            <View className="flex-row items-center gap-1">
              <Ionicons
                name={getDifferenceIcon(fuelDifference) as any}
                size={14}
                color={
                  getDifferenceColor(fuelDifference).includes("rose")
                    ? "#dc2626"
                    : getDifferenceColor(fuelDifference).includes("emerald")
                      ? "#10b981"
                      : "#64748b"
                }
              />
              <Text
                className={`font-bold ${getDifferenceColor(fuelDifference)}`}
              >
                {formatNumber(fuelDifference, 2)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Cost Comparison */}
      <View className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
        <Text className="text-xs font-semibold text-emerald-700 mb-2">
          💰 Total Cost
        </Text>
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-xs text-slate-500">Predicted</Text>
            <Text className="text-lg font-bold text-slate-800">
              {formatCurrency(predictedCost)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-slate-500">Actual</Text>
            <Text className="text-lg font-bold text-emerald-700">
              {formatCurrency(actualCost)}
            </Text>
          </View>
          <View className="flex-1 items-end">
            <Text className="text-xs text-slate-500">Difference</Text>
            <View className="flex-row items-center gap-1">
              <Ionicons
                name={getDifferenceIcon(costDifference) as any}
                size={14}
                color={
                  getDifferenceColor(costDifference).includes("rose")
                    ? "#dc2626"
                    : getDifferenceColor(costDifference).includes("emerald")
                      ? "#10b981"
                      : "#64748b"
                }
              />
              <Text
                className={`font-bold ${getDifferenceColor(costDifference)}`}
              >
                {formatCurrency(costDifference)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
