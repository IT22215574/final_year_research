// mobile/app/(root)/(tabs)/fishtripcost/components/ActualLogForm.tsx
import React from "react";
import { View, Text, TextInput } from "react-native";

type Props = {
  actualFuelLiters: string;
  actualCatchKg: string;
  onFuelChange: (value: string) => void;
  onCatchChange: (value: string) => void;
};

export default function ActualLogForm({
  actualFuelLiters,
  actualCatchKg,
  onFuelChange,
  onCatchChange,
}: Props) {
  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      <Text className="text-sm font-semibold text-slate-700 mb-3">
        Log Actual Trip Data
      </Text>

      {/* Actual Fuel */}
      <View className="mb-4">
        <Text className="text-xs font-semibold text-slate-500 mb-2">
          Actual Fuel Used (Liters) *
        </Text>
        <TextInput
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
          placeholder="e.g., 95"
          keyboardType="numeric"
          value={actualFuelLiters}
          onChangeText={onFuelChange}
        />
      </View>

      {/* Actual Catch */}
      <View>
        <Text className="text-xs font-semibold text-slate-500 mb-2">
          Actual Catch (kg) *
        </Text>
        <TextInput
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
          placeholder="e.g., 420"
          keyboardType="numeric"
          value={actualCatchKg}
          onChangeText={onCatchChange}
        />
      </View>
    </View>
  );
}
