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
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import MapView, { Marker, Polyline } from "react-native-maps";
import useAuthStore from "@/stores/authStore";

const API = process.env.EXPO_PUBLIC_API_KEY;

interface ExternalCost {
  type: string;
  amount: number;
  description?: string;
}

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

interface PredictionResult {
  base_cost: number;
  fuel_cost_estimate: number;
  ice_cost_estimate: number;
  external_costs: ExternalCost[];
  external_costs_total: number;
  total_trip_cost: number;
  currency: string;
  breakdown: {
    base_cost_percentage: number;
    external_costs_percentage: number;
  };
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

// Fishing zones around Sri Lanka (coordinates and typical fish types)
interface FishingZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  depth_m: number;
  fish_types: string[];
  region: string;
}

const fishingZones: FishingZone[] = [
  // West Coast Zones
  { id: "WC1", name: "Colombo Deep Sea Zone", lat: 6.5, lon: 79.5, depth_m: 800, fish_types: ["Tuna", "Swordfish", "Marlin"], region: "West" },
  { id: "WC2", name: "Negombo Lagoon Zone", lat: 7.35, lon: 79.7, depth_m: 450, fish_types: ["Skipjack", "Yellowfin"], region: "West" },
  { id: "WC3", name: "Chilaw Offshore Zone", lat: 7.8, lon: 79.6, depth_m: 600, fish_types: ["Barracuda", "Mackerel"], region: "West" },
  { id: "WC4", name: "Kalpitiya Deep Waters", lat: 8.5, lon: 79.5, depth_m: 950, fish_types: ["Tuna", "Sailfish"], region: "West" },
  
  // South Coast Zones
  { id: "SC1", name: "Galle Continental Shelf", lat: 5.8, lon: 80.0, depth_m: 700, fish_types: ["Snapper", "Grouper"], region: "South" },
  { id: "SC2", name: "Matara Deep Zone", lat: 5.7, lon: 80.5, depth_m: 850, fish_types: ["Tuna", "Swordfish"], region: "South" },
  { id: "SC3", name: "Tangalle Fishing Grounds", lat: 6.0, lon: 80.8, depth_m: 600, fish_types: ["Kingfish", "Barracuda"], region: "South" },
  
  // East Coast Zones
  { id: "EC1", name: "Trincomalee Bay Zone", lat: 8.8, lon: 81.5, depth_m: 500, fish_types: ["Trevally", "Grouper"], region: "East" },
  { id: "EC2", name: "Batticaloa Offshore", lat: 7.5, lon: 82.0, depth_m: 650, fish_types: ["Tuna", "Mackerel"], region: "East" },
  { id: "EC3", name: "Kalmunai Deep Waters", lat: 7.2, lon: 81.9, depth_m: 750, fish_types: ["Sailfish", "Marlin"], region: "East" },
  
  // North Coast Zones
  { id: "NC1", name: "Jaffna Peninsula Zone", lat: 10.0, lon: 80.2, depth_m: 400, fish_types: ["Snapper", "Trevally"], region: "North" },
  { id: "NC2", name: "Mannar Gulf Zone", lat: 9.2, lon: 79.6, depth_m: 550, fish_types: ["Barracuda", "Kingfish"], region: "North" },
  { id: "NC3", name: "Point Pedro Deep Sea", lat: 9.9, lon: 80.5, depth_m: 800, fish_types: ["Tuna", "Swordfish"], region: "North" },
];

export default function TripCostPrediction() {
  const { currentUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [tripData, setTripData] = useState<TripData>({
    boat_type: "OFRP",
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

  const [externalCosts, setExternalCosts] = useState<ExternalCost[]>([]);
  const [newCostType, setNewCostType] = useState("");
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<FishingZone | null>(null);
  const [hoveredZone, setHoveredZone] = useState<FishingZone | null>(null);
  const [newCostAmount, setNewCostAmount] = useState("");
  const [newCostDescription, setNewCostDescription] = useState("");

  const boatTypes = [
    { label: "OFRP - Outboard Fiber Reinforced Boat", value: "OFRP" },
    { label: "NTRB - Non-motorized Traditional Boat", value: "NTRB" },
    { label: "IMUL - Inboard Multiday Boat", value: "IMUL" },
    { label: "MTRB - Motorized Traditional Boat", value: "MTRB" },
    { label: "NBSB - Non-motorized Beach Seine Boat", value: "NBSB" },
    { label: "IDAY - Inboard Day Boat", value: "IDAY" },
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

    if (engineHP < 0 || engineHP > 350) {
      Alert.alert("Validation Error", "Engine power must be between 0-350 HP");
      return;
    }
    if (tripDays < 1 || tripDays > 30) {
      Alert.alert(
        "Validation Error",
        "Trip days must be between 1-30 days.\n\nNote: IMUL boats typically go for 7-30 days, while OFRP/MTRB/IDAY usually do 1-2 day trips."
      );
      return;
    }
    if (distanceKm < 1 || distanceKm > 800) {
      Alert.alert("Validation Error", "Distance must be between 1-800 km");
      return;
    }
    if (windKph < 3 || windKph > 40) {
      Alert.alert("Validation Error", "Wind speed must be between 3-40 km/h");
      return;
    }
    if (waveM < 0.2 || waveM > 4.0) {
      Alert.alert("Validation Error", "Wave height must be between 0.2-4.0 m");
      return;
    }

    try {
      setLoading(true);
      setPredictionResult(null);

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
        external_costs: externalCosts,
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
      console.log("API Response:", data);

      // Handle both old and new response formats
      let result: PredictionResult;
      
      if (data.base_cost !== undefined) {
        // New format with base_cost breakdown
        result = data;
      } else if (data.predicted_cost !== undefined) {
        // Old format (backward compatibility) - treat predicted_cost as base_cost
        const baseCost = data.predicted_cost;
        const externalTotal = externalCosts.reduce((sum, c) => sum + c.amount, 0);
        result = {
          base_cost: baseCost,
          fuel_cost_estimate: baseCost * 0.962,
          ice_cost_estimate: baseCost * 0.038,
          external_costs: externalCosts,
          external_costs_total: externalTotal,
          total_trip_cost: baseCost + externalTotal,
          currency: 'LKR',
          breakdown: {
            base_cost_percentage: baseCost / (baseCost + externalTotal) * 100,
            external_costs_percentage: externalTotal / (baseCost + externalTotal) * 100,
          },
        };
        console.log("⚠️ Using OLD model format. Please retrain model for accurate base cost prediction.");
      } else {
        throw new Error("Invalid response format from server");
      }

      setPredictionResult(result);
      Alert.alert(
        "Cost Prediction Complete",
        `Base Cost: LKR ${Math.round(result.base_cost).toLocaleString()}\nExternal Costs: LKR ${Math.round(result.external_costs_total).toLocaleString()}\nTotal: LKR ${Math.round(result.total_trip_cost).toLocaleString()}`,
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
      boat_type: "OFRP",
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
    setPredictionResult(null);
    setExternalCosts([]);
    setNewCostType("");
    setNewCostAmount("");
    setNewCostDescription("");
  };

  const addExternalCost = () => {
    if (!newCostType || !newCostAmount) {
      Alert.alert("Error", "Please enter cost type and amount");
      return;
    }
    const amount = parseFloat(newCostAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    setExternalCosts([...externalCosts, {
      type: newCostType,
      amount: amount,
      description: newCostDescription || undefined,
    }]);
    setNewCostType("");
    setNewCostAmount("");
    setNewCostDescription("");
  };

  const removeExternalCost = (index: number) => {
    setExternalCosts(externalCosts.filter((_, i) => i !== index));
  };

  const updateField = (field: keyof TripData, value: string) => {
    setTripData((prev) => ({ ...prev, [field]: value }));
  };

  // Safe numeric input handler - allows partial input like "12." or ".5" without crashing
  const handleNumericInput = (field: keyof TripData, value: string) => {
    // Allow empty string, numbers, and decimal points during typing
    // Only allow digits, one decimal point, and leading/trailing decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      updateField(field, value);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Handle fishing zone selection (set as destination)
  const handleZoneSelect = (zone: FishingZone) => {
    setSelectedZone(zone);
    
    // Get current port coordinates
    const portCoords = portCoordinates[tripData.port_name];
    if (portCoords) {
      // Calculate distance from port to fishing zone
      const distance = calculateDistance(
        portCoords.lat,
        portCoords.lon,
        zone.lat,
        zone.lon
      );
      
      // Update distance field (round to 1 decimal place)
      updateField("distance_km", distance.toFixed(1));
      
      Alert.alert(
        "✅ Destination Set",
        `${zone.name}\n\n📍 Distance from ${tripData.port_name}: ${distance.toFixed(1)} km\n📊 Depth: ${zone.depth_m}m\n🐟 Target Fish: ${zone.fish_types.join(", ")}\n\nThe distance has been automatically set for cost prediction.`,
        [{ text: "OK" }]
      );
    }
    
    setHoveredZone(null);
    setShowZoneModal(false);
  };

  // Handle zone marker press (show info)
  const handleZoneMarkerPress = (zone: FishingZone) => {
    setHoveredZone(zone);
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
                  keyboardType="decimal-pad"
                  value={tripData.engine_hp}
                  onChangeText={(value) => handleNumericInput("engine_hp", value)}
                />
                <Text style={styles.hint}>Range: 0-350 HP (0 for non-motorized)</Text>
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
                    keyboardType="number-pad"
                    value={tripData.trip_days}
                    onChangeText={(value) => handleNumericInput("trip_days", value)}
                  />
                  <Text style={styles.hint}>1-30 days (IMUL: 7-30)</Text>
                </View>

                <View style={styles.inputGroupHalf}>
                  <Text style={styles.label}>Distance (km) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 250"
                    keyboardType="decimal-pad"
                    value={tripData.distance_km}
                    onChangeText={(value) => handleNumericInput("distance_km", value)}
                  />
                  <Text style={styles.hint}>1-800 km</Text>
                </View>
              </View>

              {/* Fishing Zone Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Fishing Zone (Optional)</Text>
                <TouchableOpacity
                  style={styles.zoneButton}
                  onPress={() => setShowZoneModal(true)}
                >
                  <Ionicons name="location" size={20} color="#3b82f6" />
                  <Text style={styles.zoneButtonText}>
                    {selectedZone ? selectedZone.name : "Choose Fishing Zone"}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
                {selectedZone && (
                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneInfoText}>
                      📍 Distance: {tripData.distance_km} km • Depth: {selectedZone.depth_m}m
                    </Text>
                    <Text style={styles.zoneInfoText}>
                      🐟 {selectedZone.fish_types.join(", ")}
                    </Text>
                  </View>
                )}
                <Text style={styles.hint}>
                  Auto-calculates distance from your departure port
                </Text>
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
                    keyboardType="decimal-pad"
                    value={tripData.wind_kph}
                    onChangeText={(value) => handleNumericInput("wind_kph", value)}
                    editable={!fetchingWeather}
                  />
                <Text style={styles.hint}>3-40 km/h • Live data</Text>
              </View>

              <View style={styles.inputGroupHalf}>
                <Text style={styles.label}>Wave Height (m) *</Text>
                <TextInput
                  style={[styles.input, styles.autoFilledInput]}
                  placeholder="Auto-filled"
                  keyboardType="decimal-pad"
                  value={tripData.wave_m}
                  onChangeText={(value) => handleNumericInput("wave_m", value)}
                  editable={!fetchingWeather}
                />
                <Text style={styles.hint}>0.2-4.0 m • Live data</Text>
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

            {/* External Costs Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="wallet" size={18} /> External Costs (Optional)
              </Text>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={16} color="#3b82f6" />
                <Text style={styles.infoBoxText}>
                  Add crew wages, gear costs, food, and other expenses. Base cost (fuel + ice) is predicted by AI. You can add multiple cost items below.
                </Text>
              </View>

              {/* Quick Add Buttons */}
              <View style={styles.quickAddContainer}>
                <Text style={styles.quickAddLabel}>Quick Add:</Text>
                <View style={styles.quickAddButtons}>
                  <TouchableOpacity 
                    style={styles.quickAddBtn} 
                    onPress={() => {
                      setNewCostType('Crew Wages');
                      setNewCostDescription('');
                    }}
                  >
                    <Text style={styles.quickAddBtnText}>👥 Crew</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickAddBtn}
                    onPress={() => {
                      setNewCostType('Gear/Equipment');
                      setNewCostDescription('');
                    }}
                  >
                    <Text style={styles.quickAddBtnText}>🎣 Gear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickAddBtn}
                    onPress={() => {
                      setNewCostType('Food & Water');
                      setNewCostDescription('');
                    }}
                  >
                    <Text style={styles.quickAddBtnText}>🍱 Food</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickAddBtn}
                    onPress={() => {
                      setNewCostType('Maintenance');
                      setNewCostDescription('');
                    }}
                  >
                    <Text style={styles.quickAddBtnText}>🔧 Repair</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Existing external costs list */}
              {externalCosts.length > 0 && (
                <View style={styles.costsList}>
                  {externalCosts.map((cost, index) => (
                    <View key={index} style={styles.costItem}>
                      <View style={styles.costInfo}>
                        <Text style={styles.costType}>{cost.type}</Text>
                        {cost.description && (
                          <Text style={styles.costDescription}>{cost.description}</Text>
                        )}
                      </View>
                      <View style={styles.costActions}>
                        <Text style={styles.costAmount}>LKR {cost.amount.toLocaleString()}</Text>
                        <TouchableOpacity onPress={() => removeExternalCost(index)}>
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <View style={styles.costsTotalRow}>
                    <Text style={styles.costsTotalLabel}>External Costs Total:</Text>
                    <Text style={styles.costsTotalAmount}>
                      LKR {externalCosts.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Add new external cost */}
              <View style={styles.addCostForm}>
                <View style={styles.inputRow}>
                  <View style={styles.inputGroupHalf}>
                    <Text style={styles.label}>Cost Type</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Crew, Gear, Food"
                      value={newCostType}
                      onChangeText={setNewCostType}
                    />
                  </View>
                  <View style={styles.inputGroupHalf}>
                    <Text style={styles.label}>Amount (LKR)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 50000"
                      keyboardType="numeric"
                      value={newCostAmount}
                      onChangeText={setNewCostAmount}
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 4 crew members for 3 days"
                    value={newCostDescription}
                    onChangeText={setNewCostDescription}
                  />
                </View>
                <TouchableOpacity style={styles.addButton} onPress={addExternalCost}>
                  <Ionicons name="add-circle" size={20} color="#ffffff" />
                  <Text style={styles.addButtonText}>Add External Cost</Text>
                </TouchableOpacity>
              </View>
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
            {predictionResult !== null && (
              <View style={styles.resultCard}>
                <LinearGradient
                  colors={["#10b981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.resultGradient}
                >
                  <Ionicons name="checkmark-circle" size={40} color="#ffffff" />
                  <Text style={styles.resultLabel}>Trip Cost Breakdown</Text>
                  
                  {/* Base Cost Section */}
                  <View style={styles.costBreakdownSection}>
                    <View style={styles.costMainRow}>
                      <Text style={styles.costMainLabel}>🔋 Base Cost (Predicted)</Text>
                      <Text style={styles.costMainValue}>
                        LKR {Math.round(predictionResult.base_cost).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.costSubRow}>
                      <Text style={styles.costSubLabel}>├─ Fuel Cost</Text>
                      <Text style={styles.costSubValue}>
                        LKR {Math.round(predictionResult.fuel_cost_estimate).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.costSubRow}>
                      <Text style={styles.costSubLabel}>└─ Ice Cost</Text>
                      <Text style={styles.costSubValue}>
                        LKR {Math.round(predictionResult.ice_cost_estimate).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* External Costs Section */}
                  {predictionResult.external_costs && predictionResult.external_costs.length > 0 ? (
                    <View style={styles.costBreakdownSection}>
                      <View style={styles.costMainRow}>
                        <Text style={styles.costMainLabel}>💼 External Costs (Added)</Text>
                        <Text style={styles.costMainValue}>
                          LKR {Math.round(predictionResult.external_costs_total).toLocaleString()}
                        </Text>
                      </View>
                      {predictionResult.external_costs.map((cost, idx) => {
                        const isLast = idx === predictionResult.external_costs.length - 1;
                        return (
                          <View key={idx} style={styles.costSubRow}>
                            <Text style={styles.costSubLabel}>
                              {isLast ? '└─' : '├─'} {cost.type}
                              {cost.description ? ` (${cost.description})` : ''}
                            </Text>
                            <Text style={styles.costSubValue}>
                              LKR {Math.round(cost.amount).toLocaleString()}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.noExternalCosts}>
                      <Ionicons name="information-circle-outline" size={16} color="#d1fae5" />
                      <Text style={styles.noExternalCostsText}>
                        No external costs added. Add crew, gear, or other costs above.
                      </Text>
                    </View>
                  )}

                  {/* Total Section */}
                  <View style={styles.totalSection}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>💰 TOTAL TRIP COST</Text>
                      <Text style={styles.totalValue}>
                        LKR {Math.round(predictionResult.total_trip_cost).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.percentageRow}>
                      <Text style={styles.percentageText}>
                        Base: {(predictionResult.breakdown?.base_cost_percentage || 100).toFixed(1)}% | 
                        External: {(predictionResult.breakdown?.external_costs_percentage || 0).toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  
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
              <View style={{flex: 1}}>
                <Text style={styles.infoText}>
                  <Text style={{fontWeight: 'bold'}}>How it works:</Text>{'\n'}
                  • ML model predicts BASE COST (fuel + ice only){'\n'}
                  • Add your EXTERNAL COSTS (crew, gear, food, etc.){'\n'}
                  • Get complete breakdown with total trip cost{'\n\n'}
                  Model trained on 1,600+ fishing trips with 99.46% accuracy. Weather data fetched live from Open-Meteo API.
                </Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Fishing Zone Selection Modal with Map */}
      <Modal
        visible={showZoneModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowZoneModal(false);
          setHoveredZone(null);
        }}
      >
        <SafeAreaView style={styles.mapModalContainer}>
          {/* Map Header */}
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.mapTitle}>Select Fishing Zone</Text>
              <Text style={styles.mapSubtitle}>Tap a fish marker to see details</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowZoneModal(false);
                setHoveredZone(null);
              }}
              style={styles.mapCloseButton}
            >
              <Ionicons name="close-circle" size={32} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {/* Map View */}
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: portCoordinates[tripData.port_name]?.lat || 7.8731,
              longitude: portCoordinates[tripData.port_name]?.lon || 80.7718,
              latitudeDelta: 5,
              longitudeDelta: 5,
            }}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
          >
            {/* Current Port Marker */}
            {portCoordinates[tripData.port_name] && (
              <Marker
                coordinate={{
                  latitude: portCoordinates[tripData.port_name].lat,
                  longitude: portCoordinates[tripData.port_name].lon,
                }}
                title={`📍 ${tripData.port_name} (Your Port)`}
                description="Departure location"
                pinColor="#10b981"
              >
                <View style={styles.portMarker}>
                  <Ionicons name="boat" size={24} color="#ffffff" />
                </View>
              </Marker>
            )}

            {/* Fishing Zone Markers */}
            {fishingZones.map((zone) => (
              <Marker
                key={zone.id}
                coordinate={{
                  latitude: zone.lat,
                  longitude: zone.lon,
                }}
                onPress={() => handleZoneMarkerPress(zone)}
              >
                <View style={[
                  styles.fishMarker,
                  selectedZone?.id === zone.id && styles.fishMarkerSelected,
                  hoveredZone?.id === zone.id && styles.fishMarkerHovered,
                ]}>
                  <Text style={styles.fishMarkerText}>🐟</Text>
                </View>
              </Marker>
            ))}

            {/* Route Line from Port to Selected/Hovered Zone */}
            {(hoveredZone || selectedZone) && portCoordinates[tripData.port_name] && (
              <Polyline
                coordinates={[
                  {
                    latitude: portCoordinates[tripData.port_name].lat,
                    longitude: portCoordinates[tripData.port_name].lon,
                  },
                  {
                    latitude: (hoveredZone || selectedZone)!.lat,
                    longitude: (hoveredZone || selectedZone)!.lon,
                  },
                ]}
                strokeColor={hoveredZone ? "#f59e0b" : "#3b82f6"}
                strokeWidth={3}
                lineDashPattern={[10, 5]}
              />
            )}
          </MapView>

          {/* Zone Info Card (when zone is tapped) */}
          {hoveredZone && (
            <View style={styles.zoneInfoCard}>
              <View style={styles.zoneInfoHeader}>
                <View>
                  <View style={styles.zoneInfoBadge}>
                    <Text style={styles.zoneInfoBadgeText}>{hoveredZone.region}</Text>
                  </View>
                  <Text style={styles.zoneInfoTitle}>{hoveredZone.name}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setHoveredZone(null)}
                  style={styles.zoneInfoClose}
                >
                  <Ionicons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.zoneInfoDetails}>
                <View style={styles.zoneInfoRow}>
                  <Ionicons name="navigate" size={16} color="#3b82f6" />
                  <Text style={styles.zoneInfoLabel}>Distance from {tripData.port_name}:</Text>
                  <Text style={styles.zoneInfoValue}>
                    {calculateDistance(
                      portCoordinates[tripData.port_name]?.lat || 0,
                      portCoordinates[tripData.port_name]?.lon || 0,
                      hoveredZone.lat,
                      hoveredZone.lon
                    ).toFixed(1)} km
                  </Text>
                </View>

                <View style={styles.zoneInfoRow}>
                  <Ionicons name="water" size={16} color="#06b6d4" />
                  <Text style={styles.zoneInfoLabel}>Depth:</Text>
                  <Text style={styles.zoneInfoValue}>{hoveredZone.depth_m}m</Text>
                </View>

                <View style={styles.zoneInfoRow}>
                  <Text style={styles.fishIcon}>🐟</Text>
                  <Text style={styles.zoneInfoLabel}>Fish Types:</Text>
                  <Text style={styles.zoneInfoValue}>
                    {hoveredZone.fish_types.join(", ")}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.setDestinationButton}
                onPress={() => handleZoneSelect(hoveredZone)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                <Text style={styles.setDestinationText}>Set as Destination</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Legend */}
          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View style={styles.portMarker}>
                <Ionicons name="boat" size={16} color="#ffffff" />
              </View>
              <Text style={styles.legendText}>Your Port</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.fishMarker}>
                <Text style={styles.fishMarkerTextSmall}>🐟</Text>
              </View>
              <Text style={styles.legendText}>Fishing Zone</Text>
            </View>
            {selectedZone && (
              <View style={styles.legendItem}>
                <View style={styles.fishMarkerSelected}>
                  <Text style={styles.fishMarkerTextSmall}>🐟</Text>
                </View>
                <Text style={styles.legendText}>Selected</Text>
              </View>
            )}
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
  costBreakdownSection: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  costMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  costMainLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  costMainValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  costSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 8,
    marginBottom: 6,
  },
  costSubLabel: {
    color: '#d1fae5',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  costSubValue: {
    color: '#d1fae5',
    fontSize: 14,
  },
  noExternalCosts: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noExternalCostsText: {
    flex: 1,
    color: '#d1fae5',
    fontSize: 13,
    fontStyle: 'italic',
  },
  totalSection: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.4)',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  percentageRow: {
    alignItems: 'center',
  },
  percentageText: {
    color: '#d1fae5',
    fontSize: 12,
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
    marginTop: 16,
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
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 18,
  },
  costsList: {
    marginBottom: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
  },
  costItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  costInfo: {
    flex: 1,
  },
  costType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  costDescription: {
    fontSize: 12,
    color: "#6b7280",
  },
  costActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  costAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10b981",
  },
  costsTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#d1d5db",
  },
  costsTotalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
  },
  costsTotalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10b981",
  },
  addCostForm: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  quickAddContainer: {
    marginBottom: 16,
  },
  quickAddLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: "600",
  },
  quickAddButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickAddBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  quickAddBtnText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },
  // Map Modal Styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  mapSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  mapCloseButton: {
    padding: 4,
  },
  map: {
    flex: 1,
  },
  // Map Markers
  portMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  fishMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  fishMarkerSelected: {
    backgroundColor: "#10b981",
    borderColor: "#ffffff",
    borderWidth: 4,
    transform: [{ scale: 1.2 }],
  },
  fishMarkerHovered: {
    backgroundColor: "#f59e0b",
    transform: [{ scale: 1.3 }],
  },
  fishMarkerText: {
    fontSize: 20,
  },
  fishMarkerTextSmall: {
    fontSize: 14,
  },
  // Zone Info Card
  zoneInfoCard: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  zoneInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  zoneInfoBadge: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  zoneInfoBadgeText: {
    fontSize: 11,
    color: "#ffffff",
    fontWeight: "600",
  },
  zoneInfoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  zoneInfoClose: {
    padding: 4,
  },
  zoneInfoDetails: {
    gap: 10,
    marginBottom: 14,
  },
  zoneInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  zoneInfoLabel: {
    fontSize: 13,
    color: "#6b7280",
    flex: 1,
  },
  zoneInfoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
  },
  fishIcon: {
    fontSize: 16,
  },
  setDestinationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  setDestinationText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#ffffff",
  },
  // Map Legend
  mapLegend: {
    position: "absolute",
    top: 80,
    right: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "500",
  },
  // Fishing Zone Selector Styles
  zoneButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  zoneButtonText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  zoneInfo: {
    backgroundColor: "#eff6ff",
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  zoneInfoText: {
    fontSize: 12,
    color: "#1e40af",
    marginBottom: 4,
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  zoneList: {
    paddingBottom: 16,
  },
  zoneItem: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  zoneItemSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
    borderWidth: 2,
  },
  zoneItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  zoneRegionBadge: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  zoneRegionText: {
    fontSize: 11,
    color: "#ffffff",
    fontWeight: "600",
  },
  zoneDistance: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  zoneName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 6,
  },
  zoneDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  zoneDetailText: {
    fontSize: 12,
    color: "#6b7280",
  },
  modalCancelButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
});
