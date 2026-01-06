import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useAuthStore from "@/stores/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API = process.env.EXPO_PUBLIC_API_KEY;

console.log("External Costs Manager - API URL:", API);

interface ExternalCost {
  _id?: string;
  costType: string;
  unit: string;
  unitPrice: number;
  amount: number;
  totalPrice: number;
  description?: string;
}

export default function ExternalCostsManager() {
  const { currentUser } = useAuthStore();
  const [costs, setCosts] = useState<ExternalCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCost, setEditingCost] = useState<ExternalCost | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState<ExternalCost>({
    costType: "",
    unit: "",
    unitPrice: 0,
    amount: 0,
    totalPrice: 0,
    description: "",
  });

  useEffect(() => {
    loadCosts();
  }, []);

  useEffect(() => {
    // Auto-calculate total price when amount or unit price changes
    const total = formData.amount * formData.unitPrice;
    if (total !== formData.totalPrice) {
      setFormData((prev) => ({ ...prev, totalPrice: total }));
    }
  }, [formData.amount, formData.unitPrice]);

  const loadCosts = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const userId = currentUser?._id || currentUser?.id;
      console.log("Loading costs for user:", userId);

      if (!userId) {
        console.error("No user ID found");
        Alert.alert("Error", "User not logged in");
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${API}/api/v1/external-costs?userId=${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Loaded costs:", response.data);
      setCosts(response.data);
    } catch (error) {
      console.error("Error loading costs:", error);
      Alert.alert("Error", "Failed to load external costs");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCosts = () => {
    return costs.reduce((sum, cost) => sum + cost.totalPrice, 0);
  };

  // Filter costs based on search query
  const filteredCosts = costs.filter((cost) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      cost.costType.toLowerCase().includes(query) ||
      cost.unit.toLowerCase().includes(query) ||
      (cost.description && cost.description.toLowerCase().includes(query))
    );
  });

  const handleSave = async () => {
    if (
      !formData.costType ||
      !formData.unit ||
      formData.unitPrice <= 0 ||
      formData.amount <= 0
    ) {
      Alert.alert(
        "Validation Error",
        "Please fill all required fields with valid values"
      );
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const userId = currentUser?._id || currentUser?.id;

      if (!userId) {
        Alert.alert("Error", "User not logged in");
        setLoading(false);
        return;
      }

      const payload = {
        userId: userId,
        costType: formData.costType.trim(),
        unit: formData.unit.trim(),
        unitPrice: Number(formData.unitPrice),
        amount: Number(formData.amount),
        totalPrice: Number(formData.totalPrice),
        description: formData.description?.trim() || undefined,
      };

      console.log(
        "Saving cost with payload:",
        JSON.stringify(payload, null, 2)
      );
      console.log("Target URL:", `${API}/api/v1/external-costs`);

      if (editingCost?._id) {
        // Update existing cost
        console.log("Updating cost:", editingCost._id);
        const response = await axios.patch(
          `${API}/api/v1/external-costs/${editingCost._id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("Update response:", response.data);
        Alert.alert("Success", "External cost updated successfully");
      } else {
        // Create new cost
        console.log("Creating new cost at:", `${API}/api/v1/external-costs`);
        const response = await axios.post(
          `${API}/api/v1/external-costs`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("Create response:", response.data);
        Alert.alert("Success", "External cost added successfully");
      }

      resetForm();
      setModalVisible(false);
      loadCosts();
    } catch (error: any) {
      console.error("Error saving cost:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error message:", error.message);

      let errorMessage = "Failed to save external cost";

      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(", ");
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cost: ExternalCost) => {
    setEditingCost(cost);
    setFormData({
      costType: cost.costType,
      unit: cost.unit,
      unitPrice: cost.unitPrice,
      amount: cost.amount,
      totalPrice: cost.totalPrice,
      description: cost.description || "",
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Cost",
      "Are you sure you want to delete this external cost?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("authToken");
              await axios.delete(`${API}/api/v1/external-costs/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert("Success", "External cost deleted successfully");
              loadCosts();
            } catch (error) {
              console.error("Error deleting cost:", error);
              Alert.alert("Error", "Failed to delete external cost");
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      costType: "",
      unit: "",
      unitPrice: 0,
      amount: 0,
      totalPrice: 0,
      description: "",
    });
    setEditingCost(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header Card */}
          <LinearGradient
            colors={["#3b82f6", "#2563eb"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerCard}
          >
            <Ionicons name="wallet" size={40} color="#ffffff" />
            <Text style={styles.headerTitle}>External Costs Manager</Text>
            <Text style={styles.headerSubtitle}>
              Track and manage additional trip expenses
            </Text>
          </LinearGradient>

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Costs</Text>
                <Text style={styles.summaryValue}>
                  LKR {calculateTotalCosts().toLocaleString()}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Cost Items</Text>
                <Text style={styles.summaryValue}>{costs.length}</Text>
              </View>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#9ca3af"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by cost type, unit, or description..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9ca3af"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            {searchQuery.length > 0 && (
              <Text style={styles.searchResultText}>
                Found {filteredCosts.length} of {costs.length} items
              </Text>
            )}
          </View>

          {/* Add Button */}
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <LinearGradient
              colors={["#10b981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addButtonGradient}
            >
              <Ionicons name="add-circle" size={24} color="#ffffff" />
              <Text style={styles.addButtonText}>Add External Cost</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Costs List */}
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>Cost Items</Text>

            {loading && costs.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : costs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="wallet-outline" size={64} color="#9ca3af" />
                <Text style={styles.emptyText}>
                  No external costs added yet
                </Text>
                <Text style={styles.emptySubtext}>
                  Tap the button above to add your first cost
                </Text>
              </View>
            ) : filteredCosts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#9ca3af" />
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>
                  Try a different search term
                </Text>
              </View>
            ) : (
              filteredCosts.map((cost) => (
                <View key={cost._id} style={styles.costCard}>
                  <View style={styles.costHeader}>
                    <View style={styles.costTypeContainer}>
                      <Ionicons name="pricetag" size={20} color="#3b82f6" />
                      <Text style={styles.costType}>{cost.costType}</Text>
                    </View>
                    <View style={styles.costActions}>
                      <TouchableOpacity
                        onPress={() => handleEdit(cost)}
                        style={styles.iconButton}
                      >
                        <Ionicons name="pencil" size={20} color="#3b82f6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(cost._id!)}
                        style={styles.iconButton}
                      >
                        <Ionicons name="trash" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.costDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Unit:</Text>
                      <Text style={styles.detailValue}>{cost.unit}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Unit Price:</Text>
                      <Text style={styles.detailValue}>
                        LKR {cost.unitPrice.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Amount:</Text>
                      <Text style={styles.detailValue}>{cost.amount}</Text>
                    </View>
                    {cost.description && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Description:</Text>
                        <Text style={[styles.detailValue, styles.description]}>
                          {cost.description}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.costFooter}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>
                      LKR {cost.totalPrice.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          resetForm();
          setModalVisible(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCost ? "Edit" : "Add"} External Cost
              </Text>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              >
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Cost Type <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Crew Wages, Gear Maintenance"
                  value={formData.costType}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, costType: text }))
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Unit <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., per person, per kg, per day"
                  value={formData.unit}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, unit: text }))
                  }
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>
                    Unit Price (LKR) <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={formData.unitPrice.toString()}
                    onChangeText={(text) =>
                      setFormData((prev) => ({
                        ...prev,
                        unitPrice: parseFloat(text) || 0,
                      }))
                    }
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>
                    Amount <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={formData.amount.toString()}
                    onChangeText={(text) =>
                      setFormData((prev) => ({
                        ...prev,
                        amount: parseFloat(text) || 0,
                      }))
                    }
                  />
                </View>
              </View>

              <View style={styles.calculationCard}>
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>Calculation:</Text>
                  <Text style={styles.calculationFormula}>
                    {formData.amount} × LKR{" "}
                    {formData.unitPrice.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.calculationResult}>
                  <Text style={styles.calculationResultLabel}>
                    Total Price:
                  </Text>
                  <Text style={styles.calculationResultValue}>
                    LKR {formData.totalPrice.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional notes..."
                  multiline
                  numberOfLines={3}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, description: text }))
                  }
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  resetForm();
                  setModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#3b82f6", "#2563eb"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingCost ? "Update" : "Save"}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#dbeafe",
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#e5e7eb",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  clearButton: {
    padding: 4,
  },
  searchResultText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  addButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  listContainer: {
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
  costCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  costHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  costTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  costType: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    flex: 1,
  },
  costActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  costDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
  },
  description: {
    flex: 1,
    marginLeft: 8,
    textAlign: "right",
  },
  costFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3b82f6",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  calculationCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  calculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calculationLabel: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  calculationFormula: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },
  calculationResult: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#bfdbfe",
  },
  calculationResultLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  calculationResultValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3b82f6",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  saveButton: {
    overflow: "hidden",
  },
  saveButtonGradient: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
});
