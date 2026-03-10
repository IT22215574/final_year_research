import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";

import {
  getCostPreferenceById,
  updateCostPreference,
  type UpdateCostPreferenceBody,
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

const COST_ICONS = [
  { name: "cash-outline", label: "Cash" },
  { name: "boat-outline", label: "Harbor" },
  { name: "snow-outline", label: "Ice" },
  { name: "fish-outline", label: "Bait" },
  { name: "car-outline", label: "Transport" },
  { name: "document-outline", label: "Permit" },
  { name: "call-outline", label: "Communication" },
  { name: "people-outline", label: "Crew" },
  { name: "restaurant-outline", label: "Food" },
  { name: "construct-outline", label: "Equipment" },
  { name: "build-outline", label: "Maintenance" },
  { name: "ellipsis-horizontal-circle-outline", label: "Other" },
  { name: "pricetag-outline", label: "Price Tag" },
  { name: "card-outline", label: "Card" },
  { name: "wallet-outline", label: "Wallet" },
  { name: "receipt-outline", label: "Receipt" },
];

export default function EditCostPreferenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Harbor");
  const [selectedIcon, setSelectedIcon] = useState("cash-outline");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [autoApply, setAutoApply] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Auto-calculate amount when quantity or pricePerUnit changes
  const calculateAmount = () => {
    const qty = Number(quantity) || 0;
    const price = Number(pricePerUnit) || 0;
    const total = qty * price;
    setAmount(total.toString());
  };

  useEffect(() => {
    calculateAmount();
  }, [quantity, pricePerUnit]);

  useEffect(() => {
    loadCostPreference();
  }, [id]);

  const loadCostPreference = async () => {
    try {
      setLoading(true);
      const data = await getCostPreferenceById(String(id));

      setName(data.name || "");
      setCategory(data.category || "Harbor");
      setSelectedIcon(data.icon || "cash-outline");
      setQuantity(String(data.quantity || 1));
      setPricePerUnit(String(data.pricePerUnit || 0));
      setAmount(String(data.amount || 0));
      setDescription(data.description || "");
      setAutoApply(data.autoApply ?? true);
      setIsActive(data.isActive ?? true);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load cost preference");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Cost name is required");
      return;
    }

    if (!quantity.trim()) {
      Alert.alert("Validation", "Quantity is required");
      return;
    }

    if (!pricePerUnit.trim()) {
      Alert.alert("Validation", "Price per unit is required");
      return;
    }

    const qtyNum = Number(quantity);
    const priceNum = Number(pricePerUnit);
    const amountNum = Number(amount);

    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      Alert.alert("Validation", "Quantity must be a positive number");
      return;
    }

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      Alert.alert("Validation", "Price per unit must be a positive number");
      return;
    }

    try {
      setSaving(true);

      const body: UpdateCostPreferenceBody = {
        name: name.trim(),
        category,
        icon: selectedIcon,
        quantity: qtyNum,
        pricePerUnit: priceNum,
        amount: amountNum,
        description: description.trim() || undefined,
        autoApply,
        isActive,
      };

      await updateCostPreference(String(id), body);

      Alert.alert("Success", "Cost preference updated successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message || "Failed to update cost preference",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-slate-500 mt-3">Loading cost preference...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pt-3 pb-4 bg-white border-b border-slate-100 flex-row justify-between items-center rounded-b-2xl shadow-sm">
        <Text className="text-xl font-bold text-slate-900">Edit Cost</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-slate-100 rounded-full px-3 py-2"
        >
          <Text className="text-slate-700 font-semibold">Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Details */}
        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <Text className="text-sm font-semibold text-slate-800 mb-3">
            Basic Details
          </Text>

          {/* Cost Name */}
          <Text className="text-xs text-slate-500 mb-1">Cost Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g., Harbor Fee - Galle"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-3 text-slate-900"
            placeholderTextColor="#94A3B8"
          />

          {/* Category */}
          <Text className="text-xs text-slate-500 mb-1">Category *</Text>
          <View className="bg-slate-50 border border-slate-200 rounded-xl mb-3 overflow-hidden">
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

          {/* Icon Selection */}
          <Text className="text-xs text-slate-500 mb-1">Icon *</Text>
          <TouchableOpacity
            onPress={() => setShowIconPicker(true)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <Ionicons name={selectedIcon as any} size={24} color="#475569" />
              <Text className="text-slate-900 ml-3">
                {COST_ICONS.find((icon) => icon.name === selectedIcon)?.label ||
                  "Select Icon"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Pricing Details */}
        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <Text className="text-sm font-semibold text-slate-800 mb-3">
            Pricing Details
          </Text>

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">Quantity *</Text>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder="e.g., 2"
                keyboardType="decimal-pad"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">
                Price per Unit (Rs) *
              </Text>
              <TextInput
                value={pricePerUnit}
                onChangeText={setPricePerUnit}
                placeholder="e.g., 2500"
                keyboardType="decimal-pad"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Calculated Total */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="calculator-outline" size={20} color="#2563eb" />
                <Text className="text-sm font-semibold text-blue-900 ml-2">
                  Total Amount
                </Text>
              </View>
              <Text className="text-lg font-bold text-blue-900">
                Rs {Number(amount || 0).toLocaleString()}
              </Text>
            </View>
            <Text className="text-xs text-blue-700 mt-2">
              {quantity || 0} × Rs {Number(pricePerUnit || 0).toLocaleString()}{" "}
              = Rs {Number(amount || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Additional Info */}
        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <Text className="text-sm font-semibold text-slate-800 mb-3">
            Additional Info
          </Text>

          <Text className="text-xs text-slate-500 mb-1">
            Description (Optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add details about this cost..."
            multiline
            numberOfLines={3}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
            placeholderTextColor="#94A3B8"
            textAlignVertical="top"
          />
        </View>

        {/* Settings */}
        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <Text className="text-sm font-semibold text-slate-800 mb-3">
            Settings
          </Text>

          {/* Auto-Apply Toggle */}
          <View className="mb-4">
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

          {/* Active Toggle */}
          <View>
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
            {saving ? "Updating..." : "Update Cost Preference"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Icon Picker Modal */}
      <Modal
        visible={showIconPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowIconPicker(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-5 py-4 border-b border-slate-200 flex-row justify-between items-center">
            <Text className="text-xl font-bold text-slate-900">
              Choose Icon
            </Text>
            <TouchableOpacity
              onPress={() => setShowIconPicker(false)}
              className="bg-slate-100 rounded-full px-3 py-2"
            >
              <Text className="text-slate-700 font-semibold">Done</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={COST_ICONS}
            numColumns={4}
            contentContainerStyle={{ padding: 20 }}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedIcon(item.name);
                  setShowIconPicker(false);
                }}
                className={`w-20 h-20 rounded-xl items-center justify-center mb-4 border-2 ${
                  selectedIcon === item.name
                    ? "bg-blue-50 border-blue-500"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <Ionicons
                  name={item.name as any}
                  size={28}
                  color={selectedIcon === item.name ? "#3B82F6" : "#475569"}
                />
                <Text
                  className={`text-xs mt-1 text-center ${
                    selectedIcon === item.name
                      ? "text-blue-600"
                      : "text-slate-600"
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
