// mobile/app/(root)/(tabs)/fishtripcost/components/ExternalCostSummaryCard.tsx
import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ExternalCostItem = {
  name: string;
  category: string;
  amount: number;
  source?: "manual" | "preference";
  description?: string;
};

type Props = {
  externalCosts?: ExternalCostItem[];
  title?: string;
  showBreakdown?: boolean;
};

const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes("harbor") || cat.includes("port")) return "boat";
  if (cat.includes("ice")) return "snow";
  if (cat.includes("bait")) return "fish";
  if (cat.includes("permit") || cat.includes("license")) return "document-text";
  if (cat.includes("transport")) return "car";
  if (cat.includes("communication")) return "call";
  if (cat.includes("maintenance")) return "construct";
  if (cat.includes("insurance")) return "shield-checkmark";
  return "wallet";
};

export default function ExternalCostSummaryCard({
  externalCosts = [],
  title = "External Costs",
  showBreakdown = true,
}: Props) {
  if (!externalCosts || externalCosts.length === 0) {
    return (
      <View className="bg-white rounded-2xl border border-slate-100 p-4">
        <Text className="text-sm font-semibold text-slate-700 mb-2">
          {title}
        </Text>
        <View className="bg-slate-50 rounded-xl p-4 items-center">
          <Ionicons name="wallet-outline" size={32} color="#cbd5e1" />
          <Text className="text-slate-500 text-sm mt-2">No external costs</Text>
        </View>
      </View>
    );
  }

  const totalAmount = externalCosts.reduce((sum, cost) => sum + cost.amount, 0);

  // Group by category
  const categorizedCosts = externalCosts.reduce(
    (acc, cost) => {
      const category = cost.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(cost);
      return acc;
    },
    {} as Record<string, ExternalCostItem[]>,
  );

  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-sm font-semibold text-slate-700">{title}</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-slate-500">
            {externalCosts.length} item{externalCosts.length !== 1 ? "s" : ""}
          </Text>
          <View className="bg-emerald-50 rounded-full px-3 py-1">
            <Text className="text-sm font-bold text-emerald-700">
              Rs. {totalAmount.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Breakdown */}
      {showBreakdown && (
        <View className="gap-2">
          {Object.entries(categorizedCosts).map(([category, costs]) => {
            const categoryTotal = costs.reduce((sum, c) => sum + c.amount, 0);
            const icon = getCategoryIcon(category);

            return (
              <View key={category}>
                {/* Category Header */}
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="bg-blue-50 rounded-lg p-2">
                    <Ionicons name={icon as any} size={16} color="#3b82f6" />
                  </View>
                  <Text className="font-semibold text-slate-700 flex-1">
                    {category}
                  </Text>
                  <Text className="font-bold text-blue-600">
                    Rs. {categoryTotal.toLocaleString()}
                  </Text>
                </View>

                {/* Items in this category */}
                {costs.map((cost, idx) => (
                  <View
                    key={idx}
                    className="bg-slate-50 rounded-xl p-3 mb-2 ml-10 flex-row justify-between items-center"
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-slate-800">
                        {cost.name}
                      </Text>
                      {cost.description && (
                        <Text className="text-xs text-slate-500 mt-1">
                          {cost.description}
                        </Text>
                      )}
                      {cost.source && (
                        <View
                          className={`${
                            cost.source === "preference"
                              ? "bg-purple-50 border-purple-200"
                              : "bg-blue-50 border-blue-200"
                          } border rounded-full px-2 py-1 self-start mt-1`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              cost.source === "preference"
                                ? "text-purple-700"
                                : "text-blue-700"
                            }`}
                          >
                            {cost.source === "preference" ? "Auto" : "Manual"}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="font-bold text-slate-600 ml-3">
                      Rs. {cost.amount.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      )}

      {/* Total Summary */}
      <View className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 mt-2 flex-row justify-between items-center border border-emerald-100">
        <Text className="font-bold text-slate-700">Total External Costs</Text>
        <Text className="text-xl font-bold text-emerald-600">
          Rs. {totalAmount.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

