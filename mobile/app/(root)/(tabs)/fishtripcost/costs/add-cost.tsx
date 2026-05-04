import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";

import {
  createCostPreference,
  type CreateCostPreferenceBody,
} from "@/services/costPreferenceService";

const CATEGORIES = [
  "Harbor",
  "Ice",
  "Bait",
  "Transport",
  "Permit",
  "Communication",
  "Crew",
  "Food",
  "Equipment",
  "Maintenance",
  "Other",
];

export default function AddCostPreferenceScreen() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Harbor");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [autoApply, setAutoApply] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Cost name is required");
      return;
    }

    if (!amount.trim()) {
      Alert.alert("Validation", "Amount is required");
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      Alert.alert("Validation", "Amount must be a positive number");
      return;
    }

    try {
      setSaving(true);

      const body: CreateCostPreferenceBody = {
        name: name.trim(),
        category,
        amount: amountNum,
        description: description.trim() || undefined,
        autoApply,
        isActive,
      };

      await createCostPreference(body);

      Alert.alert("Success", "External cost preference created", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message || "Failed to create cost preference",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        className="px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Info Card */}
        <View className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
          <View className="flex-row items-start">
            <Ionicons name="bulb" size={20} color="#3B82F6" />
            <Text className="text-xs text-blue-700 ml-2 flex-1">
              Create reusable external costs that will automatically be included
              in trip predictions if auto-apply is enabled.
            </Text>
          </View>
        </View>

        {/* Cost Name */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-slate-700 mb-2">
            Cost Name *
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g., Harbor Fee - Galle"
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-slate-700 mb-2">
            Category *
          </Text>
          <View className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={{ height: 50 }}
            >
              {CATEGORIES.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Amount */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-slate-700 mb-2">
            Amount (Rs) *
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g., 5000"
            keyboardType="decimal-pad"
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-slate-700 mb-2">
            Description (Optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add details about this cost..."
            multiline
            numberOfLines={3}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
            placeholderTextColor="#94A3B8"
            textAlignVertical="top"
          />
        </View>

        {/* Auto-Apply Toggle */}
        <View className="mb-4">
          <View className="bg-white border border-slate-200 rounded-xl p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Ionicons name="flash" size={20} color="#6366F1" />
                <Text className="text-sm font-semibold text-slate-900 ml-2">
                  Auto-Apply to Predictions
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAutoApply(!autoApply)}>
                <View
                  className={`w-12 h-6 rounded-full ${
                    autoApply ? "bg-indigo-600" : "bg-slate-300"
                  } justify-center`}
                >
                  <View
                    className={`w-5 h-5 rounded-full bg-white ${
                      autoApply ? "ml-6" : "ml-1"
                    }`}
                  />
                </View>
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-slate-500">
              Automatically include this cost in all trip predictions
            </Text>
          </View>
        </View>

        {/* Active Toggle */}
        <View className="mb-6">
          <View className="bg-white border border-slate-200 rounded-xl p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={isActive ? "#10B981" : "#94A3B8"}
                />
                <Text className="text-sm font-semibold text-slate-900 ml-2">
                  Active
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsActive(!isActive)}>
                <View
                  className={`w-12 h-6 rounded-full ${
                    isActive ? "bg-green-500" : "bg-slate-300"
                  } justify-center`}
                >
                  <View
                    className={`w-5 h-5 rounded-full bg-white ${
                      isActive ? "ml-6" : "ml-1"
                    }`}
                  />
                </View>
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-slate-500">
              Only active costs are used in calculations
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className={`rounded-xl py-4 items-center ${
            saving ? "bg-blue-400" : "bg-blue-600"
          }`}
        >
          <Text className="text-white font-bold text-base">
            {saving ? "Saving..." : "Create Cost Preference"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
