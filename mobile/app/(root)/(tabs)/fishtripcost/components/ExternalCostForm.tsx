// mobile/app/(root)/(tabs)/fishtripcost/components/ExternalCostForm.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ExternalCostItem = {
  name: string;
  category: string;
  amount: number;
  source?: "manual" | "preference";
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
  title = "Manual External Costs",
}: Props) {
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Harbor Fee");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

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

  const totalAmount = externalCosts.reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <View className="bg-white rounded-2xl border border-slate-100 p-4">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <View>
          <Text className="text-lg font-bold text-slate-800">{title}</Text>
          <Text className="text-sm text-slate-500 mt-1">
            {externalCosts.length} item{externalCosts.length !== 1 ? "s" : ""} •
            Rs. {totalAmount.toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          className="bg-emerald-500 rounded-xl py-2 px-4 flex-row items-center"
        >
          <Ionicons name={showForm ? "close" : "add"} size={18} color="white" />
          <Text className="text-white font-semibold ml-1">
            {showForm ? "Cancel" : "Add"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Form */}
      {showForm && (
        <View className="bg-slate-50 rounded-xl p-4 mb-3 border border-slate-200">
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

      {/* Cost List */}
      {externalCosts.length === 0 ? (
        <View className="bg-slate-50 rounded-xl p-4 items-center">
          <Ionicons name="wallet-outline" size={32} color="#cbd5e1" />
          <Text className="text-slate-500 text-sm mt-2">
            No manual costs added
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {externalCosts.map((cost, index) => (
            <View
              key={index}
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
                  onPress={() => handleRemove(index)}
                  className="bg-rose-50 rounded-lg p-2"
                >
                  <Ionicons name="trash" size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}


