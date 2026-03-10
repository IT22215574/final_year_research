// mobile/app/(root)/(tabs)/fishtripcost/components/ExternalCostForm.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getCostPreferences,
  type CostPreference,
} from "@/services/costPreferenceService";

export type ExternalCostItem = {
  name: string;
  category: string;
  amount: number;
  source?: "manual" | "preference";
  preferenceId?: string;
  description?: string;
};

const COST_CATEGORIES = [
  "Harbor Fee",
  "Ice",
  "Bait",
  "Permit",
  "Transport",
  "Communication",
  "Maintenance",
  "Insurance",
  "Other",
];

type Props = {
  externalCosts: ExternalCostItem[];
  onChange: (costs: ExternalCostItem[]) => void;
  title?: string;
};

export default function ExternalCostForm({
  externalCosts,
  onChange,
  title = "External Costs",
}: Props) {
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Harbor Fee");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Cost Preferences state
  const [preferences, setPreferences] = useState<CostPreference[]>([]);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [editingAmounts, setEditingAmounts] = useState<Record<string, string>>(
    {},
  );

  // Load cost preferences on mount
  useEffect(() => {
    loadCostPreferences();
  }, []);

  const loadCostPreferences = async () => {
    try {
      setLoadingPreferences(true);
      const data = await getCostPreferences();
      setPreferences(data.filter((p) => p.isActive));

      // Auto-apply preferences
      const autoApplyPrefs = data.filter((p) => p.isActive && p.autoApply);
      const autoApplyCosts: ExternalCostItem[] = autoApplyPrefs.map((pref) => ({
        name: pref.name,
        category: pref.category,
        amount: pref.amount,
        description: pref.description,
        source: "preference",
        preferenceId: pref._id,
      }));

      // Only add auto-apply costs if they're not already in externalCosts
      const existingPrefIds = externalCosts
        .filter((c) => c.source === "preference")
        .map((c) => c.preferenceId);
      const newAutoApplyCosts = autoApplyCosts.filter(
        (c) => !existingPrefIds.includes(c.preferenceId),
      );

      if (newAutoApplyCosts.length > 0) {
        onChange([...externalCosts, ...newAutoApplyCosts]);
      }
    } catch (error: any) {
      console.error("Failed to load cost preferences:", error);
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleAdd = () => {
    if (!formName.trim()) {
      Alert.alert("Validation", "Cost name is required");
      return;
    }

    const amount = parseFloat(formAmount);
    if (Number.isNaN(amount) || amount < 0) {
      Alert.alert("Validation", "Enter a valid amount (e.g., 3000)");
      return;
    }

    const newCost: ExternalCostItem = {
      name: formName.trim(),
      category: formCategory,
      amount,
      source: "manual",
      description: formDescription.trim() || undefined,
    };

    onChange([...externalCosts, newCost]);

    // Reset form
    setFormName("");
    setFormCategory("Harbor Fee");
    setFormAmount("");
    setFormDescription("");
    setShowForm(false);
  };

  const handleRemove = (index: number) => {
    const updated = externalCosts.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Toggle preference on/off
  const togglePreference = (pref: CostPreference) => {
    const isEnabled = externalCosts.some(
      (c) => c.source === "preference" && c.preferenceId === pref._id,
    );

    if (isEnabled) {
      // Remove preference
      const updated = externalCosts.filter((c) => c.preferenceId !== pref._id);
      onChange(updated);
    } else {
      // Add preference
      const newCost: ExternalCostItem = {
        name: pref.name,
        category: pref.category,
        amount: pref.amount,
        description: pref.description,
        source: "preference",
        preferenceId: pref._id,
      };
      onChange([...externalCosts, newCost]);
    }
  };

  // Update preference amount
  const updatePreferenceAmount = (preferenceId: string, newAmount: string) => {
    const amount = parseFloat(newAmount);
    if (Number.isNaN(amount) || amount < 0) {
      return;
    }

    const updated = externalCosts.map((cost) =>
      cost.preferenceId === preferenceId ? { ...cost, amount } : cost,
    );
    onChange(updated);
    setEditingAmounts((prev) => {
      const next = { ...prev };
      delete next[preferenceId];
      return next;
    });
  };

  const totalAmount = externalCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const manualCosts = externalCosts.filter((c) => c.source === "manual");
  const preferenceCosts = externalCosts.filter(
    (c) => c.source === "preference",
  );

  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text className="text-lg font-bold text-slate-800">{title}</Text>
          <Text className="text-sm text-slate-500 mt-1">
            {externalCosts.length} item{externalCosts.length !== 1 ? "s" : ""} •
            Rs. {totalAmount.toLocaleString()}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={loadCostPreferences}
            className="bg-blue-50 rounded-xl p-2"
          >
            <Ionicons name="refresh" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowForm(!showForm)}
            className="bg-emerald-500 rounded-xl py-2 px-4 flex-row items-center"
          >
            <Ionicons
              name={showForm ? "close" : "add"}
              size={18}
              color="white"
            />
            <Text className="text-white font-semibold ml-1">
              {showForm ? "Cancel" : "Add"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Saved Preferences Section */}
      {loadingPreferences ? (
        <View className="bg-blue-50 rounded-xl p-4 items-center mb-4">
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text className="text-blue-600 text-sm mt-2">
            Loading cost preferences...
          </Text>
        </View>
      ) : preferences.length > 0 ? (
        <View className="mb-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="bookmarks" size={18} color="#3b82f6" />
            <Text className="text-sm font-bold text-blue-600 ml-2">
              Saved Preferences
            </Text>
            <Text className="text-xs text-slate-500 ml-2">
              ({preferences.length} available)
            </Text>
          </View>
          <View className="gap-2">
            {preferences.map((pref) => {
              const isEnabled = preferenceCosts.some(
                (c) => c.preferenceId === pref._id,
              );
              const currentCost = preferenceCosts.find(
                (c) => c.preferenceId === pref._id,
              );
              const isEditing = editingAmounts[pref._id] !== undefined;

              return (
                <View
                  key={pref._id}
                  className={`rounded-xl p-3 border ${
                    isEnabled
                      ? "bg-blue-50 border-blue-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    {/* Left: Toggle + Info */}
                    <View className="flex-1 flex-row items-center">
                      <TouchableOpacity
                        onPress={() => togglePreference(pref)}
                        className={`w-12 h-6 rounded-full ${
                          isEnabled ? "bg-blue-500" : "bg-slate-300"
                        } justify-center mr-3`}
                      >
                        <View
                          className={`w-5 h-5 rounded-full bg-white ${
                            isEnabled ? "ml-6" : "ml-1"
                          }`}
                        />
                      </TouchableOpacity>
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text
                            className={`font-semibold ${
                              isEnabled ? "text-blue-900" : "text-slate-500"
                            }`}
                          >
                            {pref.name}
                          </Text>
                          {pref.autoApply && (
                            <View className="ml-2 bg-indigo-100 rounded px-2 py-0.5">
                              <Text className="text-xs text-indigo-700 font-semibold">
                                Auto
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-slate-500 mt-0.5">
                          {pref.category}
                        </Text>
                      </View>
                    </View>

                    {/* Right: Amount (editable if enabled) */}
                    {isEnabled ? (
                      isEditing ? (
                        <View className="flex-row items-center gap-2">
                          <TextInput
                            className="bg-white border border-blue-300 rounded-lg px-3 py-1 text-sm w-24 text-right"
                            value={editingAmounts[pref._id]}
                            onChangeText={(val) =>
                              setEditingAmounts((prev) => ({
                                ...prev,
                                [pref._id]: val,
                              }))
                            }
                            keyboardType="decimal-pad"
                            autoFocus
                          />
                          <TouchableOpacity
                            onPress={() =>
                              updatePreferenceAmount(
                                pref._id,
                                editingAmounts[pref._id],
                              )
                            }
                            className="bg-blue-500 rounded-lg p-1.5"
                          >
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="white"
                            />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() =>
                            setEditingAmounts((prev) => ({
                              ...prev,
                              [pref._id]: currentCost?.amount.toString() || "",
                            }))
                          }
                          className="flex-row items-center"
                        >
                          <Text className="font-bold text-blue-600 mr-1">
                            Rs. {currentCost?.amount.toLocaleString()}
                          </Text>
                          <Ionicons name="create" size={14} color="#3b82f6" />
                        </TouchableOpacity>
                      )
                    ) : (
                      <Text className="font-bold text-slate-400">
                        Rs. {pref.amount.toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Manual Costs Section Header */}
      {manualCosts.length > 0 && (
        <View className="flex-row items-center mb-3">
          <Ionicons name="create" size={18} color="#059669" />
          <Text className="text-sm font-bold text-emerald-600 ml-2">
            Manual Costs
          </Text>
          <Text className="text-xs text-slate-500 ml-2">
            ({manualCosts.length} custom)
          </Text>
        </View>
      )}

      {/* Add Form */}
      {showForm && (
        <View className="bg-slate-50 rounded-xl p-4 mb-3 border border-emerald-200">
          {/* Name */}
          <View className="mb-3">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Name *
            </Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
              placeholder="e.g., Harbor Fee"
              value={formName}
              onChangeText={setFormName}
            />
          </View>

          {/* Category */}
          <View className="mb-3">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Category *
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row gap-2"
            >
              {COST_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setFormCategory(cat)}
                  className={`${
                    formCategory === cat
                      ? "bg-emerald-500 border-emerald-500"
                      : "bg-white border-slate-200"
                  } border rounded-xl px-3 py-2`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      formCategory === cat ? "text-white" : "text-slate-700"
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Amount */}
          <View className="mb-3">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Amount (Rs) *
            </Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
              placeholder="e.g., 3000"
              value={formAmount}
              onChangeText={setFormAmount}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Description (optional) */}
          <View className="mb-3">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Description
            </Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
              placeholder="Optional notes"
              value={formDescription}
              onChangeText={setFormDescription}
            />
          </View>

          {/* Add Button */}
          <TouchableOpacity
            onPress={handleAdd}
            className="bg-emerald-500 rounded-xl py-3"
          >
            <Text className="text-white font-bold text-center">Add Cost</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manual Cost List */}
      {manualCosts.length === 0 && !showForm && preferences.length === 0 ? (
        <View className="bg-slate-50 rounded-xl p-4 items-center">
          <Ionicons name="wallet-outline" size={32} color="#cbd5e1" />
          <Text className="text-slate-500 text-sm mt-2">
            No costs added yet
          </Text>
          <Text className="text-xs text-slate-400 mt-1">
            Add manual costs or create preferences
          </Text>
        </View>
      ) : manualCosts.length > 0 ? (
        <View className="gap-2">
          {manualCosts.map((cost, index) => {
            const actualIndex = externalCosts.findIndex(
              (c) => c.source === "manual" && c.name === cost.name,
            );
            return (
              <View
                key={actualIndex}
                className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex-row justify-between items-center"
              >
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800">
                    {cost.name}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-1">
                    {cost.category}
                  </Text>
                  {cost.description && (
                    <Text className="text-xs text-slate-600 mt-1">
                      {cost.description}
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center gap-3">
                  <Text className="font-bold text-emerald-600">
                    Rs. {cost.amount.toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemove(actualIndex)}
                    className="bg-rose-50 rounded-lg p-2"
                  >
                    <Ionicons name="trash" size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
