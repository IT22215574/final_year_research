import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import useAuthStore from "@/stores/authStore";

const API = process.env.EXPO_PUBLIC_API_KEY;

interface TripData {
  boat_type: string;
  engine_hp: string;
  trip_days: string;
  distance_km: string;
  wind_kph: string;
  wave_m: string;
  month: string;
  port_name: string;
  diesel_price_LKR: string;
  petrol_price_LKR: string;
  kerosene_price_LKR: string;
}

// Port coordinates for Sri Lanka
const portCoordinates: { [key: string]: { lat: number; lon: number } } = {
  Colombo: { lat: 6.9271, lon: 79.8612 },
  Negombo: { lat: 7.2083, lon: 79.8358 },
  Galle: { lat: 6.0535, lon: 80.221 },
  Trincomalee: { lat: 8.5874, lon: 81.2152 },
  Jaffna: { lat: 9.6615, lon: 80.0255 },
  Batticaloa: { lat: 7.731, lon: 81.6747 },
  Chilaw: { lat: 7.5759, lon: 79.7954 },
  Kalpitiya: { lat: 8.232, lon: 79.7718 },
};

export default function TripCostPrediction() {
  const { currentUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [predictedCost, setPredictedCost] = useState<number | null>(null);
  const [tripData, setTripData] = useState<TripData>({
    boat_type: "MTRB",
    engine_hp: "",
    trip_days: "",
    distance_km: "",
    wind_kph: "",
    wave_m: "",
    month: new Date().getMonth() + 1 + "",
    port_name: "Colombo",
    diesel_price_LKR: "205",
    petrol_price_LKR: "195",
    kerosene_price_LKR: "185",
  });

  const boatTypes = [
    { label: "MTRB - Multiday Trawler Boat", value: "MTRB" },
    { label: "OFRP - One-day Fiber Boat", value: "OFRP" },
    { label: "NTRB - Non-mechanized Boat", value: "NTRB" },
    { label: "IDAY - Inboard Day Boat", value: "IDAY" },
    { label: "Vallam - Traditional Boat", value: "Vallam" },
    { label: "Beach Seine", value: "Beach Seine" },
  ];

  const ports = [
    "Colombo",
    "Negombo",
    "Galle",
    "Trincomalee",
    "Jaffna",
    "Batticaloa",
    "Chilaw",
    "Kalpitiya",
  ];

  const months = [
    { label: "January", value: "1" },
    { label: "February", value: "2" },
    { label: "March", value: "3" },
    { label: "April", value: "4" },
    { label: "May", value: "5" },
    { label: "June", value: "6" },
    { label: "July", value: "7" },
    { label: "August", value: "8" },
    { label: "September", value: "9" },
    { label: "October", value: "10" },
    { label: "November", value: "11" },
    { label: "December", value: "12" },
  ];

  // Fetch weather data from Open-Meteo API
  const fetchWeatherData = async (portName: string) => {
    const coords = portCoordinates[portName];
    if (!coords) {
      console.warn("Port coordinates not found:", portName);
      return;
    }

    try {
      setFetchingWeather(true);
      const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${coords.lat}&longitude=${coords.lon}&current=wave_height,wind_wave_height,wind_speed_10m&wind_speed_unit=kmh`;

      console.log("Fetching weather from:", url);

      const response = await fetch(url);
      const data = await response.json();

      console.log("Weather data received:", data);

      if (data.current) {
        // Get wind speed (km/h)
        const windSpeed = data.current.wind_speed_10m || 15;

        // Get wave height (meters) - use wave_height or wind_wave_height
        const waveHeight =
          data.current.wave_height || data.current.wind_wave_height || 1.5;

        setTripData((prev) => ({
          ...prev,
          wind_kph: windSpeed.toFixed(1),
          wave_m: waveHeight.toFixed(1),
        }));

        console.log(
          `✅ Weather updated: Wind ${windSpeed} km/h, Waves ${waveHeight}m`
        );
      }
    } catch (error) {
      console.error("Weather fetch error:", error);
      // Don't show alert, just use default values
      Alert.alert(
        "Weather Data",
        "Could not fetch live weather data. Using default values.",
        [{ text: "OK" }]
      );
    } finally {
      setFetchingWeather(false);
    }
  };

  // Auto-fetch weather when port changes
  useEffect(() => {
    fetchWeatherData(tripData.port_name);
  }, [tripData.port_name]);

  const handlePredictCost = async () => {
    // Validate inputs
    if (
      !tripData.engine_hp ||
      !tripData.trip_days ||
      !tripData.distance_km ||
      !tripData.wind_kph ||
      !tripData.wave_m
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    // Validate ranges
    const engineHP = parseFloat(tripData.engine_hp);
    const tripDays = parseInt(tripData.trip_days);
    const distanceKm = parseFloat(tripData.distance_km);
    const windKph = parseFloat(tripData.wind_kph);
    const waveM = parseFloat(tripData.wave_m);

    if (engineHP < 5 || engineHP > 250) {
      Alert.alert("Validation Error", "Engine power must be between 5-250 HP");
      return;
    }
    if (tripDays < 1 || tripDays > 7) {
      Alert.alert("Validation Error", "Trip days must be between 1-7 days");
      return;
    }
    if (distanceKm < 10 || distanceKm > 600) {
      Alert.alert("Validation Error", "Distance must be between 10-600 km");
      return;
    }
    if (windKph < 5 || windKph > 30) {
      Alert.alert("Validation Error", "Wind speed must be between 5-30 km/h");
      return;
    }
    if (waveM < 0.5 || waveM > 4.0) {
      Alert.alert("Validation Error", "Wave height must be between 0.5-4.0 m");
      return;
    }

    try {
      setLoading(true);
      setPredictedCost(null);

      // Convert string values to numbers for API
      const requestData = {
        boat_type: tripData.boat_type,
        engine_hp: engineHP,
        trip_days: tripDays,
        distance_km: distanceKm,
        wind_kph: windKph,
        wave_m: waveM,
        month: parseInt(tripData.month),
        port_name: tripData.port_name,
        diesel_price_LKR: parseFloat(tripData.diesel_price_LKR),
        petrol_price_LKR: parseFloat(tripData.petrol_price_LKR),
        kerosene_price_LKR: parseFloat(tripData.kerosene_price_LKR),
      };

      console.log("Sending prediction request:", requestData);

      const response = await fetch(`${API}/api/v1/fishing/predict-cost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message 
          ? Array.isArray(errorData.message) 
            ? errorData.message.join(", ") 
            : errorData.message
          : "Failed to get prediction";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setPredictedCost(data.predicted_cost);
      Alert.alert(
        "Cost Prediction",
        `Estimated Trip Cost: LKR ${data.predicted_cost.toLocaleString(
          "en-US",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("Prediction error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to predict cost. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTripData({
      boat_type: "MTRB",
      engine_hp: "",
      trip_days: "",
      distance_km: "",
      wind_kph: "",
      wave_m: "",
      month: new Date().getMonth() + 1 + "",
      port_name: "Colombo",
      diesel_price_LKR: "205",
      petrol_price_LKR: "195",
      kerosene_price_LKR: "185",
    });
    setPredictedCost(null);
  };

  const updateField = (field: keyof TripData, value: string) => {
    setTripData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Card */}
            <LinearGradient
              colors={["#3b82f6", "#2563eb"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerCard}
            >
              <Ionicons name="calculator" size={40} color="#ffffff" />
              <Text style={styles.headerTitle}>AI-Powered Cost Prediction</Text>
              <Text style={styles.headerSubtitle}>
                Get accurate trip cost estimates with 99% accuracy
              </Text>
            </LinearGradient>

            {/* Boat Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="boat" size={18} /> Boat Information
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Boat Type *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={tripData.boat_type}
                    onValueChange={(value) => updateField("boat_type", value)}
                    style={styles.picker}
                  >
                    {boatTypes.map((type) => (
                      <Picker.Item
                        key={type.value}
                        label={type.label}
                        value={type.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Engine Power (HP) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 150"
                  keyboardType="numeric"
                  value={tripData.engine_hp}
                  onChangeText={(value) => updateField("engine_hp", value)}
                />
                <Text style={styles.hint}>Range: 5-250 HP</Text>
              </View>
            </View>

            {/* Trip Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="map" size={18} /> Trip Details
              </Text>

              <View style={styles.inputRow}>
                <View style={styles.inputGroupHalf}>
                  <Text style={styles.label}>Trip Days *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 3"
                    keyboardType="numeric"
                    value={tripData.trip_days}
                    onChangeText={(value) => updateField("trip_days", value)}
                  />
                  <Text style={styles.hint}>1-7 days</Text>
                </View>

                <View style={styles.inputGroupHalf}>
                  <Text style={styles.label}>Distance (km) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 250"
                    keyboardType="numeric"
                    value={tripData.distance_km}
                    onChangeText={(value) => updateField("distance_km", value)}
                  />
                  <Text style={styles.hint}>10-600 km</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Departure Port *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={tripData.port_name}
                    onValueChange={(value) => updateField("port_name", value)}
                    style={styles.picker}
                  >
                    {ports.map((port) => (
                      <Picker.Item key={port} label={port} value={port} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Month</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={tripData.month}
                    onValueChange={(value) => updateField("month", value)}
                    style={styles.picker}
                  >
                    {months.map((month) => (
                      <Picker.Item
                        key={month.value}
                        label={month.label}
                        value={month.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            {/* Weather Conditions Section */}
            <View style={styles.section}>
              <View style={styles.weatherHeader}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="cloudy" size={18} /> Weather Conditions
                </Text>
                {fetchingWeather && (
                  <View style={styles.fetchingBadge}>
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text style={styles.fetchingText}>
                      Fetching live data...
                    </Text>
                  </View>
                )}
                {!fetchingWeather && tripData.wind_kph && tripData.wave_m && (
                  <View style={styles.autoFetchBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#10b981"
                    />
                    <Text style={styles.autoFetchText}>Auto-fetched</Text>
                  </View>
                )}
              </View>

              <View style={styles.weatherInfo}>
                <Ionicons name="information-circle" size={18} color="#3b82f6" />
                <Text style={styles.weatherInfoText}>
                  Weather data automatically fetched from Open-Meteo for{" "}
                  {tripData.port_name}
                </Text>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroupHalf}>
                  <Text style={styles.label}>Wind Speed (km/h) *</Text>
                  <TextInput
                    style={[styles.input, styles.autoFilledInput]}
                    placeholder="Auto-filled"
                    keyboardType="numeric"
                    value={tripData.wind_kph}
                    onChangeText={(value) => updateField("wind_kph", value)}
                    editable={!fetchingWeather}
                  />
                  <Text style={styles.hint}>5-30 km/h • Live data</Text>
                </View>

                <View style={styles.inputGroupHalf}>
                  <Text style={styles.label}>Wave Height (m) *</Text>
                  <TextInput
                    style={[styles.input, styles.autoFilledInput]}
                    placeholder="Auto-filled"
                    keyboardType="numeric"
                    value={tripData.wave_m}
                    onChangeText={(value) => updateField("wave_m", value)}
                    editable={!fetchingWeather}
                  />
                  <Text style={styles.hint}>0.5-4.0 m • Live data</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.refreshWeatherButton}
                onPress={() => fetchWeatherData(tripData.port_name)}
                disabled={fetchingWeather}
              >
                <Ionicons name="refresh" size={20} color="#3b82f6" />
                <Text style={styles.refreshWeatherText}>
                  Refresh Weather Data
                </Text>
              </TouchableOpacity>
            </View>

            {/* Fuel Prices Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="water" size={18} /> Fuel Prices (LKR/L)
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Diesel Price *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 205"
                  keyboardType="numeric"
                  value={tripData.diesel_price_LKR}
                  onChangeText={(value) =>
                    updateField("diesel_price_LKR", value)
                  }
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroupHalf}>
                  <Text style={styles.label}>Petrol Price *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 195"
                    keyboardType="numeric"
                    value={tripData.petrol_price_LKR}
                    onChangeText={(value) =>
                      updateField("petrol_price_LKR", value)
                    }
                  />
                </View>

                <View style={styles.inputGroupHalf}>
                  <Text style={styles.label}>Kerosene Price *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 185"
                    keyboardType="numeric"
                    value={tripData.kerosene_price_LKR}
                    onChangeText={(value) =>
                      updateField("kerosene_price_LKR", value)
                    }
                  />
                </View>
              </View>
            </View>

            {/* Prediction Result */}
            {predictedCost !== null && (
              <View style={styles.resultCard}>
                <LinearGradient
                  colors={["#10b981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.resultGradient}
                >
                  <Ionicons name="checkmark-circle" size={40} color="#ffffff" />
                  <Text style={styles.resultLabel}>Predicted Trip Cost</Text>
                  <Text style={styles.resultValue}>
                    LKR{" "}
                    {predictedCost.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={styles.resultSubtext}>
                    Based on ML model with 99% accuracy
                  </Text>
                </LinearGradient>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.resetButton]}
                onPress={handleReset}
                disabled={loading}
              >
                <Ionicons name="refresh" size={20} color="#6b7280" />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.predictButton]}
                onPress={handlePredictCost}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="calculator" size={20} color="#ffffff" />
                    <Text style={styles.predictButtonText}>Predict Cost</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Info Section */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#3b82f6" />
              <Text style={styles.infoText}>
                This prediction uses an AI model trained on 8,000+ fishing trips
                with 99.46% accuracy. Weather data fetched live from Open-Meteo
                API.
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
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
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputGroupHalf: {
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  picker: {
    height: 50,
  },
  hint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  resultCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  resultGradient: {
    padding: 24,
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 14,
    color: "#dcfce7",
    marginTop: 12,
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  resultSubtext: {
    fontSize: 12,
    color: "#dcfce7",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  resetButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  predictButton: {
    backgroundColor: "#3b82f6",
  },
  predictButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1e40af",
    lineHeight: 20,
  },
  weatherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  fetchingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  fetchingText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },
  autoFetchBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  autoFetchText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
  },
  weatherInfo: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  weatherInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 18,
  },
  autoFilledInput: {
    backgroundColor: "#f0fdf4",
    borderColor: "#10b981",
  },
  refreshWeatherButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  refreshWeatherText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
});
