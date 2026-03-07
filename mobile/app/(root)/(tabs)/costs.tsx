// mobile/app/(root)/(tabs)/costs.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import {
  getCostPreferences,
  createCostPreference,
  updateCostPreference,
  toggleCostPreference,
  deleteCostPreference,
  CostPreference,
} from "@/services/costPreferenceService";

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

export default function CostsScreen() {
  const [preferences, setPreferences] = useState<CostPreference[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPreference, setEditingPreference] =
    useState<CostPreference | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Harbor Fee");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAutoApply, setFormAutoApply] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchPreferences = async () => {
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPreferences();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPreferences();
    }, []),
  );

  const resetForm = () => {
    setFormName("");
    setFormCategory("Harbor Fee");
    setFormAmount("");
    setFormDescription("");
    setFormAutoApply(true);
    setFormIsActive(true);
    setEditingPreference(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (pref: CostPreference) => {
    setFormName(pref.name);
    setFormCategory(pref.category);
    setFormAmount(String(pref.amount));
    setFormDescription(pref.description || "");
    setFormAutoApply(pref.autoApply ?? true);
    setFormIsActive(pref.isActive ?? true);
    setEditingPreference(pref);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert("Validation", "Cost name is required");
      return;
    }

    const amount = parseFloat(formAmount);
    if (Number.isNaN(amount) || amount < 0) {
      Alert.alert("Validation", "Enter a valid amount (e.g., 5000)");
      return;
    }

    try {
      setLoading(true);

      const body = {
        name: formName.trim(),
        category: formCategory,
        amount,
        description: formDescription.trim() || undefined,
        autoApply: formAutoApply,
        isActive: formIsActive,
      };

      if (editingPreference) {
        await updateCostPreference(editingPreference._id, body);
        Alert.alert("Success", "Cost preference updated");
      } else {
        await createCostPreference(body);
        Alert.alert("Success", "Cost preference created");
      }

      closeModal();
      await fetchPreferences();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save cost preference");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (pref: CostPreference) => {
    try {
      await toggleCostPreference(pref._id);
      await fetchPreferences();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message || "Failed to toggle cost preference",
      );
    }
  };

  const handleDelete = (pref: CostPreference) => {
    Alert.alert(
      "Delete Cost Preference",
      `Are you sure you want to delete "${pref.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCostPreference(pref._id);
              Alert.alert("Success", "Cost preference deleted");
              await fetchPreferences();
            } catch (error: any) {
              Alert.alert("Error", error?.message || "Failed to delete");
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: CostPreference }) => (
    <View className="bg-white rounded-2xl border border-slate-100 p-4 mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-800">{item.name}</Text>
          <Text className="text-sm text-slate-500 mt-1">{item.category}</Text>
        </View>
        <Text className="text-lg font-bold text-emerald-600">
          Rs. {item.amount.toLocaleString()}
        </Text>
      </View>

      {item.description && (
        <Text className="text-sm text-slate-600 mb-3">{item.description}</Text>
      )}

      <View className="flex-row gap-2 mb-3">
        {item.autoApply && (
          <View className="bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
            <Text className="text-xs font-semibold text-blue-700">
              Auto Apply
            </Text>
          </View>
        )}
        <View
          className={`${
            item.isActive
              ? "bg-emerald-50 border-emerald-200"
              : "bg-slate-50 border-slate-200"
          } border rounded-full px-3 py-1`}
        >
          <Text
            className={`text-xs font-semibold ${
              item.isActive ? "text-emerald-700" : "text-slate-500"
            }`}
          >
            {item.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => openEditModal(item)}
          className="flex-1 bg-blue-50 rounded-xl py-3 flex-row justify-center items-center"
        >
          <Ionicons name="pencil" size={18} color="#2563eb" />
          <Text className="text-blue-600 font-semibold ml-2">Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleToggle(item)}
          className="flex-1 bg-amber-50 rounded-xl py-3 flex-row justify-center items-center"
        >
          <Ionicons
            name={item.isActive ? "pause" : "play"}
            size={18}
            color="#d97706"
          />
          <Text className="text-amber-600 font-semibold ml-2">
            {item.isActive ? "Disable" : "Enable"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDelete(item)}
          className="bg-rose-50 rounded-xl py-3 px-4 flex-row justify-center items-center"
        >
          <Ionicons name="trash" size={18} color="#dc2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pt-3 pb-4 bg-white border-b border-slate-100">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-bold text-slate-800">
              Cost Preferences
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              {preferences.length} preference
              {preferences.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            onPress={openAddModal}
            className="bg-emerald-500 rounded-xl py-3 px-5 flex-row items-center"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-bold ml-1">Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading && preferences.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-slate-500 mt-4">Loading preferences...</Text>
        </View>
      ) : preferences.length === 0 ? (
        <View className="flex-1 justify-center items-center px-5">
          <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
          <Text className="text-xl font-bold text-slate-800 mt-4">
            No Cost Preferences
          </Text>
          <Text className="text-slate-500 text-center mt-2">
            Create reusable cost preferences for harbor fees, ice, permits, etc.
          </Text>
          <TouchableOpacity
            onPress={openAddModal}
            className="bg-emerald-500 rounded-xl py-3 px-6 mt-6"
          >
            <Text className="text-white font-bold">
              Create First Preference
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={preferences}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={false}
        onRequestClose={closeModal}
      >
        <SafeAreaView className="flex-1 bg-slate-50">
          {/* Modal Header */}
          <View className="px-5 pt-3 pb-4 bg-white border-b border-slate-100 flex-row justify-between items-center">
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={28} color="#334155" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-slate-800">
              {editingPreference ? "Edit" : "Add"} Cost Preference
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView className="flex-1 px-5 pt-5">
            {/* Name */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">
                Cost Name *
              </Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
                placeholder="e.g., Harbor Fee - Galle"
                value={formName}
                onChangeText={setFormName}
              />
            </View>

            {/* Category */}
            <View className="mb-4">
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
                    } border rounded-xl px-4 py-2`}
                  >
                    <Text
                      className={`font-semibold ${
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
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">
                Amount (Rs) *
              </Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
                placeholder="e.g., 5000"
                value={formAmount}
                onChangeText={setFormAmount}
                keyboardType="numeric"
              />
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">
                Description
              </Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
                placeholder="Optional notes"
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Auto Apply */}
            <TouchableOpacity
              onPress={() => setFormAutoApply(!formAutoApply)}
              className="bg-white border border-slate-200 rounded-xl p-4 mb-3 flex-row justify-between items-center"
            >
              <View>
                <Text className="font-semibold text-slate-800">
                  Auto Apply to Predictions
                </Text>
                <Text className="text-sm text-slate-500 mt-1">
                  Automatically include in trip cost predictions
                </Text>
              </View>
              <View
                className={`w-12 h-6 rounded-full ${
                  formAutoApply ? "bg-emerald-500" : "bg-slate-300"
                } justify-center`}
              >
                <View
                  className={`w-5 h-5 rounded-full bg-white ${
                    formAutoApply ? "ml-6" : "ml-1"
                  }`}
                />
              </View>
            </TouchableOpacity>

            {/* Is Active */}
            <TouchableOpacity
              onPress={() => setFormIsActive(!formIsActive)}
              className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex-row justify-between items-center"
            >
              <View>
                <Text className="font-semibold text-slate-800">Active</Text>
                <Text className="text-sm text-slate-500 mt-1">
                  Enable this cost preference
                </Text>
              </View>
              <View
                className={`w-12 h-6 rounded-full ${
                  formIsActive ? "bg-emerald-500" : "bg-slate-300"
                } justify-center`}
              >
                <View
                  className={`w-5 h-5 rounded-full bg-white ${
                    formIsActive ? "ml-6" : "ml-1"
                  }`}
                />
              </View>
            </TouchableOpacity>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              className="bg-emerald-500 rounded-xl py-4 mb-6"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-center text-lg">
                  {editingPreference ? "Update" : "Create"} Preference
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
