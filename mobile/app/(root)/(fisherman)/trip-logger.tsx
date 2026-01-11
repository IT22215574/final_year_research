import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import useAuthStore from "@/stores/authStore";
import DateTimePicker from "@react-native-community/datetimepicker";
import MapView, { Marker, Polyline } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API = process.env.EXPO_PUBLIC_API_KEY;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Port coordinates for Sri Lanka
const portCoordinates: { [key: string]: { lat: number; lon: number } } = {
  Colombo: { lat: 6.9271, lon: 79.8612 },
  Negombo: { lat: 7.2083, lon: 79.8358 },
  Galle: { lat: 6.0535, lon: 80.221 },
  Trincomalee: { lat: 8.5874, lon: 81.2152 },
  Jaffna: { lat: 9.6615, lon: 80.0255 },
  Batticaloa: { lat: 7.731, lon: 81.6747 },
};

// Fishing zones
interface FishingZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  region: string;
}

const fishingZones: FishingZone[] = [
  { id: "WC1", name: "Colombo Deep Sea", lat: 6.5, lon: 79.5, region: "West" },
  { id: "WC2", name: "Negombo Lagoon", lat: 7.35, lon: 79.7, region: "West" },
  { id: "SC1", name: "Galle Offshore", lat: 5.9, lon: 80.5, region: "South" },
  { id: "EC1", name: "Trincomalee Bay", lat: 8.8, lon: 81.5, region: "East" },
  { id: "NC1", name: "Jaffna Peninsula", lat: 9.8, lon: 80.2, region: "North" },
];

export default function TripLogger() {
  const { currentUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [selectedReturnDate, setSelectedReturnDate] = useState(new Date());
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false);
  const [selectedDepartureTime, setSelectedDepartureTime] = useState(
    new Date()
  );
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);
  const [selectedReturnTime, setSelectedReturnTime] = useState(new Date());
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<FishingZone | null>(null);
  const [selectedPort, setSelectedPort] = useState("Colombo");

  // Form state
  const [formData, setFormData] = useState({
    tripDate: "",
    departureTime: "",
    returnDate: "",
    returnTime: "",
    destination: "",
    distance: "",
    fuelUsed: "",
    fuelCost: "",
    crewSize: "",
    catchWeight: "",
    catchValue: "",
    notes: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split("T")[0];
      handleInputChange("tripDate", formattedDate);
    }
  };

  const handleReturnDateChange = (event: any, date?: Date) => {
    setShowReturnDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedReturnDate(date);
      const formattedDate = date.toISOString().split("T")[0];
      handleInputChange("returnDate", formattedDate);
    }
  };

  const handleDepartureTimeChange = (event: any, date?: Date) => {
    setShowDepartureTimePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDepartureTime(date);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      handleInputChange("departureTime", `${hours}:${minutes}`);
    }
  };

  const handleReturnTimeChange = (event: any, date?: Date) => {
    setShowReturnTimePicker(Platform.OS === "ios");
    if (date) {
      setSelectedReturnTime(date);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      handleInputChange("returnTime", `${hours}:${minutes}`);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleZoneSelect = (zone: FishingZone) => {
    setSelectedZone(zone);
    const portCoords = portCoordinates[selectedPort];
    if (portCoords) {
      const distance = calculateDistance(
        portCoords.lat,
        portCoords.lon,
        zone.lat,
        zone.lon
      );
      handleInputChange("destination", zone.name);
      handleInputChange("distance", distance.toFixed(1));
      setShowMapModal(false);
      Alert.alert(
        "✅ Location Set",
        `${zone.name}\n\nDistance from ${selectedPort}: ${distance.toFixed(
          1
        )} km`,
        [{ text: "OK" }]
      );
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (
      !formData.tripDate ||
      !formData.departureTime ||
      !formData.returnDate ||
      !formData.returnTime ||
      !formData.destination
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const userId = currentUser?._id || currentUser?.id;

      if (!userId) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      const tripLogData = {
        userId,
        tripDate: formData.tripDate,
        departureTime: formData.departureTime,
        returnDate: formData.returnDate,
        returnTime: formData.returnTime,
        destination: formData.destination,
        distance: formData.distance ? parseFloat(formData.distance) : undefined,
        fuelUsed: formData.fuelUsed ? parseFloat(formData.fuelUsed) : undefined,
        fuelCost: formData.fuelCost ? parseFloat(formData.fuelCost) : undefined,
        crewSize: formData.crewSize ? parseInt(formData.crewSize) : undefined,
        catchWeight: formData.catchWeight
          ? parseFloat(formData.catchWeight)
          : undefined,
        catchValue: formData.catchValue
          ? parseFloat(formData.catchValue)
          : undefined,
        notes: formData.notes || undefined,
      };

      console.log("Saving trip log:", tripLogData);

      await axios.post(`${API}/api/v1/trip-logs`, tripLogData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      Alert.alert("Success", "Trip logged successfully!", [
        {
          text: "OK",
          onPress: () => {
            // Reset form
            setFormData({
              tripDate: "",
              departureTime: "",
              returnDate: "",
              returnTime: "",
              destination: "",
              distance: "",
              fuelUsed: "",
              fuelCost: "",
              crewSize: "",
              catchWeight: "",
              catchValue: "",
              notes: "",
            });
            // Navigate to My Trips
            router.push("/(root)/(fisherman)/my-trips");
          },
        },
      ]);
    } catch (error) {
      console.error("Error logging trip:", error);
      Alert.alert("Error", "Failed to log trip. Please try again.");
    } finally {
      setLoading(false);
    }
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
            <Ionicons name="boat" size={40} color="#ffffff" />
            <Text style={styles.headerTitle}>Log Your Fishing Trip</Text>
            <Text style={styles.headerSubtitle}>
              Record trip details for tracking and analysis
            </Text>
          </LinearGradient>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Trip Date & Time */}
            <Text style={styles.sectionTitle}>Trip Date & Time</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Trip Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color="#3b82f6" />
                <Text style={styles.datePickerText}>
                  {formData.tripDate || "Select Date"}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  Departure Time <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDepartureTimePicker(true)}
                >
                  <Ionicons name="time" size={20} color="#3b82f6" />
                  <Text style={styles.datePickerText}>
                    {formData.departureTime || "Select Time"}
                  </Text>
                </TouchableOpacity>
                {showDepartureTimePicker && (
                  <DateTimePicker
                    value={selectedDepartureTime}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDepartureTimeChange}
                  />
                )}
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  Return Time <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowReturnTimePicker(true)}
                >
                  <Ionicons name="time" size={20} color="#3b82f6" />
                  <Text style={styles.datePickerText}>
                    {formData.returnTime || "Select Time"}
                  </Text>
                </TouchableOpacity>
                {showReturnTimePicker && (
                  <DateTimePicker
                    value={selectedReturnTime}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleReturnTimeChange}
                  />
                )}
              </View>
            </View>

            {/* Return Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Return Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowReturnDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color="#3b82f6" />
                <Text style={styles.datePickerText}>
                  {formData.returnDate || "Select Return Date"}
                </Text>
              </TouchableOpacity>
              {showReturnDatePicker && (
                <DateTimePicker
                  value={selectedReturnDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleReturnDateChange}
                  minimumDate={selectedDate}
                />
              )}
            </View>

            {/* Location & Distance */}
            <Text style={styles.sectionTitle}>Location & Distance</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Destination <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.locationInputRow}>
                <TextInput
                  style={[styles.input, styles.locationInput]}
                  placeholder="Fishing location"
                  value={formData.destination}
                  onChangeText={(value) =>
                    handleInputChange("destination", value)
                  }
                />
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => setShowMapModal(true)}
                >
                  <Ionicons name="map" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Distance (km)</Text>
              <TextInput
                style={styles.input}
                placeholder="Total distance traveled"
                keyboardType="numeric"
                value={formData.distance}
                onChangeText={(value) => handleInputChange("distance", value)}
              />
            </View>

            {/* Fuel & Costs */}
            <Text style={styles.sectionTitle}>Fuel & Costs</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Fuel Used (L)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Liters"
                  keyboardType="numeric"
                  value={formData.fuelUsed}
                  onChangeText={(value) => handleInputChange("fuelUsed", value)}
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Fuel Cost (LKR)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Amount"
                  keyboardType="numeric"
                  value={formData.fuelCost}
                  onChangeText={(value) => handleInputChange("fuelCost", value)}
                />
              </View>
            </View>

            {/* Crew & Catch */}
            <Text style={styles.sectionTitle}>Crew & Catch</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Crew Size</Text>
              <TextInput
                style={styles.input}
                placeholder="Number of crew members"
                keyboardType="numeric"
                value={formData.crewSize}
                onChangeText={(value) => handleInputChange("crewSize", value)}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Catch Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Total kg"
                  keyboardType="numeric"
                  value={formData.catchWeight}
                  onChangeText={(value) =>
                    handleInputChange("catchWeight", value)
                  }
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Catch Value (LKR)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Amount"
                  keyboardType="numeric"
                  value={formData.catchValue}
                  onChangeText={(value) =>
                    handleInputChange("catchValue", value)
                  }
                />
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.sectionTitle}>Additional Notes</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional information about the trip..."
                multiline
                numberOfLines={4}
                value={formData.notes}
                onChangeText={(value) => handleInputChange("notes", value)}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={
                  loading ? ["#9ca3af", "#6b7280"] : ["#3b82f6", "#2563eb"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                <Ionicons
                  name={loading ? "hourglass-outline" : "checkmark-circle"}
                  size={24}
                  color="#ffffff"
                />
                <Text style={styles.submitButtonText}>
                  {loading ? "Logging Trip..." : "Log Trip"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMapModal(false)}
      >
        <SafeAreaView style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <Text style={styles.mapModalTitle}>Select Fishing Location</Text>
            <TouchableOpacity
              onPress={() => setShowMapModal(false)}
              style={styles.mapCloseButton}
            >
              <Ionicons name="close" size={28} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 7.8731,
              longitude: 80.7718,
              latitudeDelta: 4,
              longitudeDelta: 4,
            }}
          >
            {/* Port Marker */}
            {portCoordinates[selectedPort] && (
              <Marker
                coordinate={{
                  latitude: portCoordinates[selectedPort].lat,
                  longitude: portCoordinates[selectedPort].lon,
                }}
                title={selectedPort}
                pinColor="#3b82f6"
              />
            )}

            {/* Fishing Zone Markers */}
            {fishingZones.map((zone) => (
              <Marker
                key={zone.id}
                coordinate={{
                  latitude: zone.lat,
                  longitude: zone.lon,
                }}
                onPress={() => handleZoneSelect(zone)}
              >
                <View
                  style={[
                    styles.fishMarker,
                    selectedZone?.id === zone.id && styles.fishMarkerSelected,
                  ]}
                >
                  <Text style={styles.fishMarkerText}>🐟</Text>
                </View>
              </Marker>
            ))}

            {/* Route Line */}
            {selectedZone && portCoordinates[selectedPort] && (
              <Polyline
                coordinates={[
                  {
                    latitude: portCoordinates[selectedPort].lat,
                    longitude: portCoordinates[selectedPort].lon,
                  },
                  {
                    latitude: selectedZone.lat,
                    longitude: selectedZone.lon,
                  },
                ]}
                strokeColor="#3b82f6"
                strokeWidth={3}
                lineDashPattern={[10, 5]}
              />
            )}
          </MapView>

          <View style={styles.mapInstructions}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={styles.mapInstructionsText}>
              Tap on a fishing zone marker (🐟) to set your destination
            </Text>
          </View>
        </SafeAreaView>
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
    marginBottom: 24,
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
  formContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 16,
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
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  datePickerText: {
    fontSize: 16,
    color: "#1f2937",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  locationInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  mapButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    width: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  mapModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  mapCloseButton: {
    padding: 4,
  },
  map: {
    flex: 1,
  },
  fishMarker: {
    width: 40,
    height: 40,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  fishMarkerSelected: {
    backgroundColor: "#3b82f6",
    borderColor: "#1e40af",
  },
  fishMarkerText: {
    fontSize: 20,
  },
  mapInstructions: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    padding: 16,
    gap: 8,
  },
  mapInstructionsText: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
});
