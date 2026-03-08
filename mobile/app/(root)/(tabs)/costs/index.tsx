import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  getCostPreferences,
  updateCostPreference,
  deleteCostPreference,
  type CostPreference,
} from "@/services/costPreferenceService";

export default function CostPreferencesScreen() {
  const [preferences, setPreferences] = useState<CostPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await getCostPreferences();
      setPreferences(data);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load cost preferences");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [])
  );

  const handleToggleActive = async (pref: CostPreference) => {
    try {
      setToggleLoading(pref._id);
      await updateCostPreference(pref._id, { isActive: !pref.isActive });
      await loadPreferences();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to toggle preference");
    } finally {
      setToggleLoading(null);
    }
  };

  const handleToggleAutoApply = async (pref: CostPreference) => {
    try {
      setToggleLoading(pref._id);
      await updateCostPreference(pref._id, { autoApply: !pref.autoApply });
      await loadPreferences();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to toggle auto-apply");
    } finally {
      setToggleLoading(null);
    }
  };

  const handleDelete = (pref: CostPreference) => {
    Alert.alert(
      "Delete Cost Preference",
      `Delete ${pref.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCostPreference(pref._id);
              Alert.alert("Success", "Cost preference deleted");
              await loadPreferences();
            } catch (error: any) {
              Alert.alert("Error", error?.message || "Failed to delete");
            }
          },
        },
      ]
    );
  };

  // Group by category
  const grouped = preferences.reduce((acc, pref) => {
    const cat = pref.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(pref);
    return acc;
  }, {} as Record<string, CostPreference[]>);

  // Calculate totals
  const activeTotal = preferences
    .filter((p) => p.isActive)
    .reduce((sum, p) => sum + p.amount, 0);
  const autoApplyTotal = preferences
    .filter((p) => p.isActive && p.autoApply)
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0066CC" />
        <Text className="text-slate-500 mt-3">Loading cost preferences...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-5 pt-6 pb-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-slate-900">
                External Cost Intelligence
              </Text>
              <Text className="text-sm text-slate-600 mt-1">
                Reusable cost preferences for realistic trip planning
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(root)/(tabs)/costs/add-cost" as any)}
              className="bg-blue-600 rounded-xl p-3"
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        <View className="px-5 mb-4">
          <View className="flex-row justify-between">
            <View className="bg-white rounded-xl p-4 flex-1 mr-2 shadow-sm border border-slate-100">
              <View className="flex-row items-center mb-2">
                <Ionicons name="wallet" size={20} color="#10B981" />
                <Text className="text-xs text-slate-600 ml-2">Active Total</Text>
              </View>
              <Text className="text-2xl font-bold text-slate-900">
                Rs {activeTotal.toLocaleString()}
              </Text>
              <Text className="text-xs text-slate-500 mt-1">
                {preferences.filter((p) => p.isActive).length} active costs
              </Text>
            </View>

            <View className="bg-white rounded-xl p-4 flex-1 ml-2 shadow-sm border border-slate-100">
              <View className="flex-row items-center mb-2">
                <Ionicons name="flash" size={20} color="#6366F1" />
                <Text className="text-xs text-slate-600 ml-2">Auto-Apply</Text>
              </View>
              <Text className="text-2xl font-bold text-indigo-600">
                Rs {autoApplyTotal.toLocaleString()}
              </Text>
              <Text className="text-xs text-slate-500 mt-1">
                {preferences.filter((p) => p.isActive && p.autoApply).length} auto costs
              </Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View className="px-5 mb-4">
          <View className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-semibold text-blue-900">
                  External Cost Intelligence
                </Text>
                <Text className="text-xs text-blue-700 mt-1">
                  These reusable preferences automatically enhance trip predictions with
                  realistic costs beyond fuel: harbor fees, ice, bait, permits, etc.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Empty State */}
        {preferences.length === 0 ? (
          <View className="px-5 py-10 items-center">
            <Ionicons name="cash-outline" size={64} color="#CBD5E1" />
            <Text className="text-lg font-semibold text-slate-700 mt-4">
              No cost preferences yet
            </Text>
            <Text className="text-sm text-slate-500 text-center mt-2 mb-4">
              Add external costs to make trip predictions more realistic
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(root)/(tabs)/costs/add-cost" as any)}
              className="bg-blue-600 rounded-xl px-6 py-3"
            >
              <Text className="text-white font-bold">Add First Cost</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Grouped Cost Preferences */
          <View className="px-5">
            {Object.entries(grouped).map(([category, prefs]) => (
              <View key={category} className="mb-4">
                <Text className="text-sm font-bold text-slate-700 mb-2 uppercase">
                  {category}
                </Text>
                {prefs.map((pref) => (
                  <View
                    key={pref._id}
                    className={`rounded-xl p-4 mb-2 border ${
                      pref.isActive
                        ? "bg-white border-slate-200 shadow-sm"
                        : "bg-slate-50 border-slate-100"
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-1">
                        <Text
                          className={`text-base font-semibold ${
                            pref.isActive ? "text-slate-900" : "text-slate-400"
                          }`}
                        >
                          {pref.name}
                        </Text>
                        {pref.description && (
                          <Text className="text-xs text-slate-500 mt-1">
                            {pref.description}
                          </Text>
                        )}
                      </View>
                      <Text
                        className={`text-lg font-bold ${
                          pref.isActive ? "text-blue-600" : "text-slate-400"
                        }`}
                      >
                        Rs {pref.amount.toLocaleString()}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between mt-2">
                      {/* Active Toggle */}
                      <TouchableOpacity
                        onPress={() => handleToggleActive(pref)}
                        disabled={toggleLoading === pref._id}
                        className="flex-row items-center"
                      >
                        <View
                          className={`w-12 h-6 rounded-full ${
                            pref.isActive ? "bg-green-500" : "bg-slate-300"
                          } justify-center`}
                        >
                          <View
                            className={`w-5 h-5 rounded-full bg-white ${
                              pref.isActive ? "ml-6" : "ml-1"
                            }`}
                          />
                        </View>
                        <Text className="text-xs text-slate-600 ml-2">Active</Text>
                      </TouchableOpacity>

                      {/* Auto-Apply Toggle */}
                      <TouchableOpacity
                        onPress={() => handleToggleAutoApply(pref)}
                        disabled={toggleLoading === pref._id || !pref.isActive}
                        className="flex-row items-center"
                      >
                        <Ionicons
                          name={pref.autoApply ? "flash" : "flash-outline"}
                          size={16}
                          color={pref.autoApply && pref.isActive ? "#6366F1" : "#94A3B8"}
                        />
                        <Text
                          className={`text-xs ml-1 ${
                            pref.autoApply && pref.isActive
                              ? "text-indigo-600 font-semibold"
                              : "text-slate-400"
                          }`}
                        >
                          Auto-Apply
                        </Text>
                      </TouchableOpacity>

                      {/* Edit & Delete */}
                      <View className="flex-row items-center">
                        <TouchableOpacity
                          onPress={() =>
                            router.push(`/(root)/(tabs)/costs/edit/${pref._id}` as any)
                          }
                          className="mr-3"
                        >
                          <Ionicons name="create-outline" size={20} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(pref)}>
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

