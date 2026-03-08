// mobile/app/(root)/(tabs)/fishtripcost/components/SaveAndLogButtons.tsx
import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";

type Props = {
  onSave?: () => void;
  onLog?: () => void;
  saving?: boolean;
  logging?: boolean;
  showSave?: boolean;
  showLog?: boolean;
};

export default function SaveAndLogButtons({
  onSave,
  onLog,
  saving = false,
  logging = false,
  showSave = true,
  showLog = true,
}: Props) {
  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4 gap-3">
      {showSave && onSave && (
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          className={`rounded-xl py-4 items-center ${
            saving ? "bg-blue-400" : "bg-blue-600"
          }`}
        >
          {saving ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="white" />
              <Text className="text-white font-bold ml-2">Saving...</Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-base">✅ Save Trip</Text>
          )}
        </TouchableOpacity>
      )}

      {showLog && onLog && (
        <TouchableOpacity
          onPress={onLog}
          disabled={logging}
          className={`rounded-xl py-4 items-center ${
            logging ? "bg-slate-700" : "bg-slate-900"
          }`}
        >
          {logging ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="white" />
              <Text className="text-white font-bold ml-2">Logging...</Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-base">
              🧾 Log Actual Data
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

