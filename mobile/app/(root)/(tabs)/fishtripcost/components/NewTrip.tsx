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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";

import { createTrip } from "@/services/tripService";
import useTripStore from "@/stores/tripStore";

const NewTrip = () => {
  const router = useRouter();
  const addTrip = useTripStore((state) => state.addTrip);

  // ================= Trip Times =================
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

  const [loading, setLoading] = useState(false);

  // =====================================================
  // ANDROID PICKERS (separate date + time)
  // =====================================================
  const openDeparturePicker = () => {
    if (Platform.OS === "android") {
      // Pick Date first
      DateTimePickerAndroid.open({
        value: departureTime,
        mode: "date",
        onChange: (_, date) => {
          if (date) {
            const newDate = new Date(departureTime);
            newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
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
            newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
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

    const tripDurationHours = (returnTime.getTime() - departureTime.getTime()) / (1000 * 60 * 60);

    const tripData = {
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

    try {
      setLoading(true);
      const newTrip = await createTrip(tripData);
      addTrip(newTrip);
      Alert.alert("Success", "Trip logged successfully!", [{ text: "OK", onPress: () => router.back() }]);
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
      <ScrollView style={styles.scroll}>
        <Text style={styles.title}>Log New Trip</Text>

        {/* Trip Duration */}
        <Text style={styles.sectionTitle}>Trip Duration</Text>

        <TouchableOpacity style={styles.inputBox} onPress={openDeparturePicker}>
          <Text>Departure: {departureTime.toLocaleString()}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.inputBox} onPress={openReturnPicker}>
          <Text>Return: {returnTime.toLocaleString()}</Text>
        </TouchableOpacity>

        {/* iOS Pickers */}
        {Platform.OS === "ios" && showDepartureIOS && (
          <DateTimePicker
            value={departureTime}
            mode={"datetime" as "date" | "time" | "datetime"}
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
            mode={"datetime" as "date" | "time" | "datetime"}
            display="spinner"
            onChange={(_, date) => {
              setShowReturnIOS(false);
              if (date) setReturnTime(date);
            }}
          />
        )}

        {/* Boat & Travel */}
        <Text style={styles.sectionTitle}>Boat & Travel</Text>
        <TextInput placeholder="Distance (km)" keyboardType="decimal-pad" value={distanceKm} onChangeText={setDistanceKm} style={styles.inputBox} />
        <TextInput placeholder="Engine Horse Power" keyboardType="decimal-pad" value={engineHorsePower} onChangeText={setEngineHorsePower} style={styles.inputBox} />
        <View style={styles.pickerBox}>
          <Picker selectedValue={boatType} onValueChange={setBoatType}>
            <Picker.Item label="Trawler" value="Trawler" />
            <Picker.Item label="Multi-day Boat" value="Multi-day Boat" />
            <Picker.Item label="Small Boat" value="Small Boat" />
          </Picker>
        </View>

        {/* Weather */}
        <Text style={styles.sectionTitle}>Weather</Text>
        <TextInput placeholder="Wind Speed (km/h)" keyboardType="decimal-pad" value={windSpeed} onChangeText={setWindSpeed} style={styles.inputBox} />
        <TextInput placeholder="Wave Height (m)" keyboardType="decimal-pad" value={waveHeight} onChangeText={setWaveHeight} style={styles.inputBox} />
        <View style={styles.pickerBox}>
          <Picker selectedValue={weatherCondition} onValueChange={setWeatherCondition}>
            <Picker.Item label="Clear" value="Clear" />
            <Picker.Item label="Cloudy" value="Cloudy" />
            <Picker.Item label="Rainy" value="Rainy" />
            <Picker.Item label="Stormy" value="Stormy" />
          </Picker>
        </View>

        {/* Fuel */}
        <Text style={styles.sectionTitle}>Fuel</Text>
        <TextInput placeholder="Fuel Used (Liters)" keyboardType="decimal-pad" value={fuelUsedLiters} onChangeText={setFuelUsedLiters} style={styles.inputBox} />
        <TextInput placeholder="Fuel Price per Liter" keyboardType="decimal-pad" value={fuelPricePerLiter} onChangeText={setFuelPricePerLiter} style={styles.inputBox} />

        {/* Operational Costs */}
        <Text style={styles.sectionTitle}>Operational Costs</Text>
        <TextInput placeholder="Ice Cost" keyboardType="decimal-pad" value={iceCost} onChangeText={setIceCost} style={styles.inputBox} />
        <TextInput placeholder="Crew Cost" keyboardType="decimal-pad" value={crewCost} onChangeText={setCrewCost} style={styles.inputBox} />
        <TextInput placeholder="Food Cost" keyboardType="decimal-pad" value={foodCost} onChangeText={setFoodCost} style={styles.inputBox} />
        <TextInput placeholder="Maintenance Cost" keyboardType="decimal-pad" value={maintenanceCost} onChangeText={setMaintenanceCost} style={styles.inputBox} />
        <TextInput placeholder="Other Cost" keyboardType="decimal-pad" value={otherCost} onChangeText={setOtherCost} style={styles.inputBox} />

        {/* Submit */}
        <TouchableOpacity onPress={handleSubmit} disabled={loading} style={styles.submitButton}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Trip</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NewTrip;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f0f0" },
  scroll: { padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginVertical: 8 },
  inputBox: { backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 12 },
  pickerBox: { backgroundColor: "#fff", borderRadius: 12, marginBottom: 12 },
  submitButton: { backgroundColor: "#2563eb", padding: 16, borderRadius: 20, alignItems: "center", marginTop: 20 },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

