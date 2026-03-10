// mobile/app/(root)/(tabs)/fishtripcost/components/TotalCostCard.tsx
import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  fuelCost?: number;
  operationalCost?: number;
  externalCostTotal?: number;
  totalCost?: number;
  title?: string;
  showBreakdown?: boolean;
};

const formatCurrency = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `Rs. ${value.toLocaleString()}`;
};

export default function TotalCostCard({
  fuelCost,
  operationalCost,
  externalCostTotal,
  totalCost,
  title = "Total Cost Breakdown",
  showBreakdown = true,
}: Props) {
  // Debug logging
  console.log("💳 TotalCostCard received:", {
    fuelCost,
    operationalCost,
    externalCostTotal,
    totalCost,
    title,
    showBreakdown,
  });

  const hasCostData =
    typeof fuelCost === "number" ||
    typeof operationalCost === "number" ||
    typeof externalCostTotal === "number" ||
    typeof totalCost === "number";

  console.log("💳 hasCostData:", hasCostData);

  if (!hasCostData) {
    return (
      <View className="bg-white rounded-2xl border border-slate-100 p-4">
        <Text className="text-sm font-semibold text-slate-700 mb-2">
          {title}
        </Text>
        <View className="bg-slate-50 rounded-xl p-4 items-center">
          <Ionicons name="calculator-outline" size={32} color="#cbd5e1" />
          <Text className="text-slate-500 text-sm mt-2">
            No cost data available
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      {/* Header */}
      <Text className="text-sm font-semibold text-slate-700 mb-3">{title}</Text>

      {/* Breakdown */}
      {showBreakdown && (
        <View className="gap-3 mb-3">
          {/* Fuel Cost */}
          {typeof fuelCost === "number" && (
            <View className="flex-row justify-between items-center bg-amber-50 rounded-xl p-3 border border-amber-100">
              <View className="flex-row items-center gap-2">
                <View className="bg-amber-100 rounded-lg p-2">
                  <Ionicons name="water" size={18} color="#d97706" />
                </View>
                <Text className="font-semibold text-slate-700">Fuel Cost</Text>
              </View>
              <Text className="font-bold text-amber-700">
                {formatCurrency(fuelCost)}
              </Text>
            </View>
          )}

          {/* Operational Cost */}
          {typeof operationalCost === "number" && (
            <View className="flex-row justify-between items-center bg-blue-50 rounded-xl p-3 border border-blue-100">
              <View className="flex-row items-center gap-2">
                <View className="bg-blue-100 rounded-lg p-2">
                  <Ionicons name="settings" size={18} color="#3b82f6" />
                </View>
                <Text className="font-semibold text-slate-700">
                  Operational Cost
                </Text>
              </View>
              <Text className="font-bold text-blue-700">
                {formatCurrency(operationalCost)}
              </Text>
            </View>
          )}

          {/* External Cost */}
          {typeof externalCostTotal === "number" && (
            <View className="flex-row justify-between items-center bg-purple-50 rounded-xl p-3 border border-purple-100">
              <View className="flex-row items-center gap-2">
                <View className="bg-purple-100 rounded-lg p-2">
                  <Ionicons name="wallet" size={18} color="#9333ea" />
                </View>
                <Text className="font-semibold text-slate-700">
                  External Costs
                </Text>
              </View>
              <Text className="font-bold text-purple-700">
                {formatCurrency(externalCostTotal)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Total */}
      {typeof totalCost === "number" && (
        <View
          className="bg-emerald-600 rounded-2xl p-4 flex-row justify-between items-center"
          style={{
            shadowColor: "#10b981",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <View>
            <Text className="text-white text-sm font-semibold opacity-90">
              Total Trip Cost
            </Text>
            <Text className="text-white text-2xl font-bold mt-1">
              {formatCurrency(totalCost)}
            </Text>
          </View>
          <View
            className="bg-white rounded-full p-3"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
          >
            <Ionicons name="calculator" size={24} color="white" />
          </View>
        </View>
      )}

      {/* Cost per km (if available) */}
      {typeof totalCost === "number" && (
        <View className="bg-slate-50 rounded-xl p-3 mt-3 flex-row justify-between items-center">
          <Text className="text-sm text-slate-600">
            Average Cost Composition
          </Text>
          <View className="flex-row gap-2">
            {typeof fuelCost === "number" && typeof totalCost === "number" && (
              <View className="bg-amber-100 rounded-full px-2 py-1">
                <Text className="text-xs font-bold text-amber-700">
                  Fuel {Math.round((fuelCost / totalCost) * 100)}%
                </Text>
              </View>
            )}
            {typeof externalCostTotal === "number" &&
              typeof totalCost === "number" && (
                <View className="bg-purple-100 rounded-full px-2 py-1">
                  <Text className="text-xs font-bold text-purple-700">
                    External {Math.round((externalCostTotal / totalCost) * 100)}
                    %
                  </Text>
                </View>
              )}
          </View>
        </View>
      )}
    </View>
  );
}
