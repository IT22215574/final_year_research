// File: (root)/(screens)/NewTrip.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { createTrip } from "@/services/tripService";
import useTripStore from "@/stores/tripStore";

type ExternalCost = {
  id: string;
  name: string;
  category: string;
  amount: string;
};

const NewTrip = () => {
  const router = useRouter();
  const addTrip = useTripStore((state) => state.addTrip);

  // ================= Trip Times =================
  const [tripDate, setTripDate] = useState(new Date());
  const [showTripDateIOS, setShowTripDateIOS] = useState(false);
  const [departureTime, setDepartureTime] = useState(new Date());
  const [returnTime, setReturnTime] = useState(new Date());
  const [showDepartureIOS, setShowDepartureIOS] = useState(false);
  const [showReturnIOS, setShowReturnIOS] = useState(false);

  // ================= Travel =================
  const [distanceKm, setDistanceKm] = useState("");
  const [engineHorsePower, setEngineHorsePower] = useState("");
  const [boatType, setBoatType] = useState("Trawler");

  // ================= Weather =================
  const [windSpeed, setWindSpeed] = useState("");
  const [waveHeight, setWaveHeight] = useState("");
  const [weatherCondition, setWeatherCondition] = useState("Clear");

  // ================= Fuel =================
  const [fuelUsedLiters, setFuelUsedLiters] = useState("");
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState("350");

  // ================= Costs =================
  const [iceCost, setIceCost] = useState("");
  const [crewCost, setCrewCost] = useState("");
  const [foodCost, setFoodCost] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState("");
  const [otherCost, setOtherCost] = useState("");

  // ================= External Costs =================
  const [externalCosts, setExternalCosts] = useState<ExternalCost[]>([]);
  const [showExternalCostModal, setShowExternalCostModal] = useState(false);
  const [newCostName, setNewCostName] = useState("");
  const [newCostCategory, setNewCostCategory] = useState("operational");
  const [newCostAmount, setNewCostAmount] = useState("");

  const [loading, setLoading] = useState(false);

  // =====================================================
  // ANDROID PICKERS (separate date + time)
  // =====================================================
  const addExternalCost = () => {
    if (!newCostName.trim() || !newCostAmount.trim()) {
      Alert.alert("Error", "Please enter cost name and amount");
      return;
    }

    const newCost: ExternalCost = {
      id: Date.now().toString(),
      name: newCostName,
      category: newCostCategory,
      amount: newCostAmount,
    };

    setExternalCosts([...externalCosts, newCost]);
    setNewCostName("");
    setNewCostCategory("operational");
    setNewCostAmount("");
    setShowExternalCostModal(false);
  };

  const removeExternalCost = (id: string) => {
    setExternalCosts(externalCosts.filter((cost) => cost.id !== id));
  };

  const openTripDatePicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: tripDate,
        mode: "date",
        onChange: (_, date) => {
          if (date) setTripDate(date);
        },
      });
    } else {
      setShowTripDateIOS(true);
    }
  };

  const openDeparturePicker = () => {
    if (Platform.OS === "android") {
      // Pick Date first
      DateTimePickerAndroid.open({
        value: departureTime,
        mode: "date",
        onChange: (_, date) => {
          if (date) {
            const newDate = new Date(departureTime);
            newDate.setFullYear(
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
            );
            setDepartureTime(newDate);

            // Pick Time next
            DateTimePickerAndroid.open({
              value: newDate,
              mode: "time",
              is24Hour: true,
              onChange: (_, time) => {
                if (time) setDepartureTime(time);
              },
            });
          }
        },
      });
    } else {
      setShowDepartureIOS(true);
    }
  };

  const openReturnPicker = () => {
    if (Platform.OS === "android") {
      // Pick Date first
      DateTimePickerAndroid.open({
        value: returnTime,
        mode: "date",
        onChange: (_, date) => {
          if (date) {
            const newDate = new Date(returnTime);
            newDate.setFullYear(
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
            );
            setReturnTime(newDate);

            // Pick Time next
            DateTimePickerAndroid.open({
              value: newDate,
              mode: "time",
              is24Hour: true,
              onChange: (_, time) => {
                if (time) setReturnTime(time);
              },
            });
          }
        },
      });
    } else {
      setShowReturnIOS(true);
    }
  };

  // =====================================================
  // SUBMIT HANDLER
  // =====================================================
  const handleSubmit = async () => {
    if (returnTime <= departureTime) {
      Alert.alert("Error", "Return time must be after departure");
      return;
    }

    const tripDurationHours =
      (returnTime.getTime() - departureTime.getTime()) / (1000 * 60 * 60);

    const tripData: any = {
      tripDate: tripDate.toISOString(),
      departureTime: departureTime.toISOString(),
      returnTime: returnTime.toISOString(),
      distanceKm: distanceKm ? Number(distanceKm) : undefined,
      engineHorsePower: engineHorsePower ? Number(engineHorsePower) : undefined,
      boatType,
      windSpeed: windSpeed ? Number(windSpeed) : undefined,
      waveHeight: waveHeight ? Number(waveHeight) : undefined,
      weatherCondition,
      fuelUsedLiters: fuelUsedLiters ? Number(fuelUsedLiters) : undefined,
      fuelPricePerLiter: Number(fuelPricePerLiter),
      iceCost: Number(iceCost || 0),
      crewCost: Number(crewCost || 0),
      foodCost: Number(foodCost || 0),
      maintenanceCost: Number(maintenanceCost || 0),
      otherCost: Number(otherCost || 0),
      tripDurationHours,
    };

    // Add external costs if any
    if (externalCosts.length > 0) {
      tripData.externalCosts = externalCosts.map((cost) => ({
        name: cost.name,
        category: cost.category,
        amount: Number(cost.amount),
        source: "manual" as const,
      }));
    }

    try {
      setLoading(true);
      const newTrip = await createTrip(tripData);
      addTrip(newTrip);
      Alert.alert("Success", "Trip logged successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to create trip");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="boat" size={32} color="#3b82f6" />
          <Text style={styles.title}>Log New Trip</Text>
        </View>

        {/* Trip Date Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar" size={22} color="#3b82f6" />
            <Text style={styles.cardTitle}>Trip Date</Text>
          </View>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={openTripDatePicker}
          >
            <View style={styles.dateContent}>
              <Text style={styles.dateText}>
                {tripDate.toLocaleDateString("en-LK", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>
        </View>

        {Platform.OS === "ios" && showTripDateIOS && (
          <DateTimePicker
            value={tripDate}
            mode="date"
            display="spinner"
            onChange={(_, date) => {
              setShowTripDateIOS(false);
              if (date) setTripDate(date);
            }}
          />
        )}

        {/* Trip Duration Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={22} color="#10b981" />
            <Text style={styles.cardTitle}>Trip Duration</Text>
          </View>

          <TouchableOpacity
            style={styles.timeButton}
            onPress={openDeparturePicker}
          >
            <Ionicons name="log-out-outline" size={20} color="#374151" />
            <View style={styles.timeInfo}>
              <Text style={styles.timeLabel}>Departure</Text>
              <Text style={styles.timeValue}>
                {departureTime.toLocaleString("en-LK", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <Ionicons name="create-outline" size={18} color="#3b82f6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.timeButton}
            onPress={openReturnPicker}
          >
            <Ionicons name="log-in-outline" size={20} color="#374151" />
            <View style={styles.timeInfo}>
              <Text style={styles.timeLabel}>Return</Text>
              <Text style={styles.timeValue}>
                {returnTime.toLocaleString("en-LK", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <Ionicons name="create-outline" size={18} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {/* iOS Pickers */}
        {Platform.OS === "ios" && showDepartureIOS && (
          <DateTimePicker
            value={departureTime}
            mode="datetime"
            display="spinner"
            onChange={(_, date) => {
              setShowDepartureIOS(false);
              if (date) setDepartureTime(date);
            }}
          />
        )}
        {Platform.OS === "ios" && showReturnIOS && (
          <DateTimePicker
            value={returnTime}
            mode="datetime"
            display="spinner"
            onChange={(_, date) => {
              setShowReturnIOS(false);
              if (date) setReturnTime(date);
            }}
          />
        )}

        {/* Boat & Travel Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="navigate" size={22} color="#f59e0b" />
            <Text style={styles.cardTitle}>Boat & Travel</Text>
          </View>

          <View style={styles.inputGroup}>
            <Ionicons
              name="location"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Distance (km)"
              keyboardType="decimal-pad"
              value={distanceKm}
              onChangeText={setDistanceKm}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons
              name="speedometer"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Engine Horse Power"
              keyboardType="decimal-pad"
              value={engineHorsePower}
              onChangeText={setEngineHorsePower}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.pickerContainer}>
            <Ionicons
              name="boat-outline"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <Picker
              selectedValue={boatType}
              onValueChange={setBoatType}
              style={styles.picker}
            >
              <Picker.Item label="Trawler" value="Trawler" />
              <Picker.Item label="Multi-day Boat" value="Multi-day Boat" />
              <Picker.Item label="Small Boat" value="Small Boat" />
            </Picker>
          </View>
        </View>

        {/* Weather Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud" size={22} color="#8b5cf6" />
            <Text style={styles.cardTitle}>Weather Conditions</Text>
          </View>

          <View style={styles.inputGroup}>
            <Ionicons
              name="leaf"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Wind Speed (km/h)"
              keyboardType="decimal-pad"
              value={windSpeed}
              onChangeText={setWindSpeed}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons
              name="water"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Wave Height (m)"
              keyboardType="decimal-pad"
              value={waveHeight}
              onChangeText={setWaveHeight}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.pickerContainer}>
            <Ionicons
              name="rainy"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <Picker
              selectedValue={weatherCondition}
              onValueChange={setWeatherCondition}
              style={styles.picker}
            >
              <Picker.Item label="☀️ Clear" value="Clear" />
              <Picker.Item label="☁️ Cloudy" value="Cloudy" />
              <Picker.Item label="🌧️ Rainy" value="Rainy" />
              <Picker.Item label="⛈️ Stormy" value="Stormy" />
            </Picker>
          </View>
        </View>

        {/* Fuel Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flash" size={22} color="#ef4444" />
            <Text style={styles.cardTitle}>Fuel Information</Text>
          </View>

          <View style={styles.inputGroup}>
            <Ionicons
              name="water-outline"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Fuel Used (Liters)"
              keyboardType="decimal-pad"
              value={fuelUsedLiters}
              onChangeText={setFuelUsedLiters}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons
              name="cash-outline"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Fuel Price per Liter"
              keyboardType="decimal-pad"
              value={fuelPricePerLiter}
              onChangeText={setFuelPricePerLiter}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Operational Costs Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet" size={22} color="#06b6d4" />
            <Text style={styles.cardTitle}>Operational Costs</Text>
          </View>

          <View style={styles.inputGroup}>
            <Ionicons
              name="cube-outline"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Ice Cost (Rs)"
              keyboardType="decimal-pad"
              value={iceCost}
              onChangeText={setIceCost}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons
              name="people-outline"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Crew Cost (Rs)"
              keyboardType="decimal-pad"
              value={crewCost}
              onChangeText={setCrewCost}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons
              name="restaurant-outline"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Food Cost (Rs)"
              keyboardType="decimal-pad"
              value={foodCost}
              onChangeText={setFoodCost}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons
              name="construct-outline"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Maintenance Cost (Rs)"
              keyboardType="decimal-pad"
              value={maintenanceCost}
              onChangeText={setMaintenanceCost}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons
              name="ellipsis-horizontal-circle-outline"
              size={18}
              color="#6b7280"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Other Cost (Rs)"
              keyboardType="decimal-pad"
              value={otherCost}
              onChangeText={setOtherCost}
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* External Costs Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="add-circle" size={22} color="#14b8a6" />
            <Text style={styles.cardTitle}>Additional Costs</Text>
            <Text style={styles.cardBadge}>{externalCosts.length}</Text>
          </View>

          {externalCosts.map((cost) => (
            <View key={cost.id} style={styles.externalCostItem}>
              <View style={styles.externalCostInfo}>
                <Text style={styles.externalCostName}>{cost.name}</Text>
                <Text style={styles.externalCostCategory}>{cost.category}</Text>
              </View>
              <Text style={styles.externalCostAmount}>Rs. {cost.amount}</Text>
              <TouchableOpacity onPress={() => removeExternalCost(cost.id)}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowExternalCostModal(true)}
          >
            <Ionicons name="add" size={20} color="#3b82f6" />
            <Text style={styles.addButtonText}>Add External Cost</Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitButton}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.submitText}>Save Trip</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* External Cost Modal */}
      <Modal
        visible={showExternalCostModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowExternalCostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add External Cost</Text>
              <TouchableOpacity onPress={() => setShowExternalCostModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Ionicons
                name="pricetag-outline"
                size={18}
                color="#6b7280"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Cost Name (e.g., Port Fee)"
                value={newCostName}
                onChangeText={setNewCostName}
                style={styles.input}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.pickerContainer}>
              <Ionicons
                name="folder-outline"
                size={18}
                color="#6b7280"
                style={styles.inputIcon}
              />
              <Picker
                selectedValue={newCostCategory}
                onValueChange={setNewCostCategory}
                style={styles.picker}
              >
                <Picker.Item label="Operational" value="operational" />
                <Picker.Item label="Harbor Fees" value="harbor" />
                <Picker.Item label="Equipment" value="equipment" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>

            <View style={styles.inputGroup}>
              <Ionicons
                name="cash-outline"
                size={18}
                color="#6b7280"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Amount (Rs)"
                keyboardType="decimal-pad"
                value={newCostAmount}
                onChangeText={setNewCostAmount}
                style={styles.input}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowExternalCostModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={addExternalCost}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.modalAddText}>Add Cost</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default NewTrip;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginLeft: 12,
  },

  // Card Styles
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 10,
    flex: 1,
  },
  cardBadge: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },

  // Date Button
  dateButton: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dateContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  // Time Buttons
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  timeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  timeLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  // Input Styles
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 12,
  },

  // Picker Styles
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingLeft: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  picker: {
    flex: 1,
    color: "#111827",
  },

  // External Costs
  externalCostItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  externalCostInfo: {
    flex: 1,
  },
  externalCostName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  externalCostCategory: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "capitalize",
  },
  externalCostAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#059669",
    marginRight: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderStyle: "dashed",
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3b82f6",
    marginLeft: 6,
  },

  // Submit Button
  submitButton: {
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
  modalAddButton: {
    flex: 1,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAddText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});
