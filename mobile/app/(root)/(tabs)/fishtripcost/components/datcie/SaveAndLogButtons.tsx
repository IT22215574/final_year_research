import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";

export default function SaveAndLogButtons({
  saving,
  onSave,
  onLogActual,
}: {
  saving: boolean;
  onSave: () => void;
  onLogActual: () => void;
}) {
  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-5">
      <Text className="text-xs text-slate-400 font-semibold uppercase mb-3">Actions</Text>

      <TouchableOpacity
        onPress={onSave}
        disabled={saving}
        activeOpacity={0.85}
        className={`rounded-xl py-4 items-center ${saving ? "bg-blue-400" : "bg-blue-600"}`}
      >
        {saving ? (
          <View className="flex-row items-center">
            <ActivityIndicator color="white" />
            <Text className="text-white font-bold ml-2">Saving...</Text>
          </View>
        ) : (
          <Text className="text-white font-bold text-base">✅ Save Trip (predict-and-save)</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onLogActual}
        activeOpacity={0.85}
        className="rounded-xl py-4 items-center bg-slate-900 mt-3"
      >
        <Text className="text-white font-bold text-base">🧾 Log Actual (Fuel & Catch)</Text>
      </TouchableOpacity>
    </View>
  );
}