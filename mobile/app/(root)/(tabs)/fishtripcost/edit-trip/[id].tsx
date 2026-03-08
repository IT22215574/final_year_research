import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";

import { getTripById, updateTrip } from "@/services/tripService";

type FormState = {
  departureTime: string;
  returnTime: string;
  boatId: string;
  startLat: string;
  startLon: string;
  endLat: string;
  endLon: string;
  windSpeed: string;
  waveHeight: string;
  fuelPricePerLiter: string;
  marketPrice: string;
  speed: string;
  fishingHours: string;
  numberOfDays: string;
  crewCount: string;
  mode: "island" | "international";
  status: "planned" | "completed" | "cancelled";
};

const inputStyle = {
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: "#111827",
  backgroundColor: "#ffffff",
};

const labelStyle = {
  fontSize: 14,
  color: "#374151",
  fontWeight: "600" as const,
  marginBottom: 8,
};

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isNaN(num) ? undefined : num;
};

const toInput = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const normalizeForDatetimeLocal = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const hours = `${d.getHours()}`.padStart(2, "0");
  const minutes = `${d.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function EditTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    departureTime: "",
    returnTime: "",
    boatId: "",
    startLat: "",
    startLon: "",
    endLat: "",
    endLon: "",
    windSpeed: "",
    waveHeight: "",
    fuelPricePerLiter: "",
    marketPrice: "",
    speed: "",
    fishingHours: "",
    numberOfDays: "1",
    crewCount: "",
    mode: "island",
    status: "planned",
  });

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value as never }));
  };

  const loadTrip = async () => {
    try {
      setLoading(true);

      if (!id || typeof id !== "string") {
        throw new Error("Invalid trip id");
      }

      const trip = await getTripById(id);

      setForm({
        departureTime: normalizeForDatetimeLocal(trip.departureTime),
        returnTime: normalizeForDatetimeLocal(trip.returnTime),
        boatId: toInput(trip.boatId),
        startLat: toInput(trip.startLat),
        startLon: toInput(trip.startLon),
        endLat: toInput(trip.endLat),
        endLon: toInput(trip.endLon),
        windSpeed: toInput(trip.windSpeed),
        waveHeight: toInput(trip.waveHeight),
        fuelPricePerLiter: toInput(trip.fuelPricePerLiter),
        marketPrice: toInput(trip.marketPrice),
        speed: toInput(trip.speed),
        fishingHours: toInput(trip.fishingHours),
        numberOfDays: toInput(trip.numberOfDays),
        crewCount: toInput(trip.crewCount),
        mode: trip.mode || "island",
        status: trip.status || "planned",
      });
    } catch (err: any) {
      console.error("Failed to load trip for edit:", err);
      Alert.alert("Error", err?.message || "Failed to load trip");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTrip();
    }, [id])
  );

  const canSubmit = useMemo(() => {
    return !!form.departureTime && !!form.returnTime;
  }, [form.departureTime, form.returnTime]);

  const handleSave = async () => {
    try {
      if (!id || typeof id !== "string") {
        Alert.alert("Error", "Invalid trip id");
        return;
      }

      if (!form.departureTime || !form.returnTime) {
        Alert.alert("Validation", "Departure time and return time are required.");
        return;
      }

      setSaving(true);

      const payload = {
        departureTime: new Date(form.departureTime).toISOString(),
        returnTime: new Date(form.returnTime).toISOString(),
        boatId: form.boatId.trim() || undefined,
        startLat: parseOptionalNumber(form.startLat),
        startLon: parseOptionalNumber(form.startLon),
        endLat: parseOptionalNumber(form.endLat),
        endLon: parseOptionalNumber(form.endLon),
        windSpeed: parseOptionalNumber(form.windSpeed),
        waveHeight: parseOptionalNumber(form.waveHeight),
        fuelPricePerLiter: parseOptionalNumber(form.fuelPricePerLiter),
        marketPrice: parseOptionalNumber(form.marketPrice),
        speed: parseOptionalNumber(form.speed),
        fishingHours: parseOptionalNumber(form.fishingHours),
        numberOfDays: parseOptionalNumber(form.numberOfDays),
        crewCount: parseOptionalNumber(form.crewCount),
        mode: form.mode,
        status: form.status,
      };

      await updateTrip(id, payload);

      Alert.alert("Success", "Trip updated successfully", [
        {
          text: "OK",
          onPress: () =>
            router.replace(`/(root)/(tabs)/fishtripcost/trip-details/${id}`),
        },
      ]);
    } catch (err: any) {
      console.error("Failed to update trip:", err);
      Alert.alert("Error", err?.message || "Failed to update trip");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <ActivityIndicator size="large" color="#111827" />
          <Text style={{ marginTop: 12, color: "#6b7280" }}>Loading trip for edit...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827" }}>
          Edit Trip
        </Text>
        <Text style={{ marginTop: 6, color: "#6b7280", marginBottom: 18 }}>
          Update the editable trip details
        </Text>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Departure Time</Text>
          <TextInput
            value={form.departureTime}
            onChangeText={(text) => updateField("departureTime", text)}
            placeholder="2026-03-07T08:00"
            style={inputStyle}
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Return Time</Text>
          <TextInput
            value={form.returnTime}
            onChangeText={(text) => updateField("returnTime", text)}
            placeholder="2026-03-08T18:00"
            style={inputStyle}
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Boat ID</Text>
          <TextInput
            value={form.boatId}
            onChangeText={(text) => updateField("boatId", text)}
            placeholder="Boat ObjectId"
            style={inputStyle}
            autoCapitalize="none"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Start Latitude</Text>
          <TextInput
            value={form.startLat}
            onChangeText={(text) => updateField("startLat", text)}
            placeholder="6.9271"
            style={inputStyle}
            keyboardType="numeric"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Start Longitude</Text>
          <TextInput
            value={form.startLon}
            onChangeText={(text) => updateField("startLon", text)}
            placeholder="79.8612"
            style={inputStyle}
            keyboardType="numeric"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>End Latitude</Text>
          <TextInput
            value={form.endLat}
            onChangeText={(text) => updateField("endLat", text)}
            placeholder="5.8535"
            style={inputStyle}
            keyboardType="numeric"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>End Longitude</Text>
          <TextInput
            value={form.endLon}
            onChangeText={(text) => updateField("endLon", text)}
            placeholder="80.4210"
            style={inputStyle}
            keyboardType="numeric"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Wind Speed</Text>
          <TextInput
            value={form.windSpeed}
            onChangeText={(text) => updateField("windSpeed", text)}
            placeholder="18"
            style={inputStyle}
            keyboardType="numeric"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Wave Height</Text>
          <TextInput
            value={form.waveHeight}
            onChangeText={(text) => updateField("waveHeight", text)}
            placeholder="2.0"
            style={inputStyle}
            keyboardType="numeric"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Fuel Price Per Liter</Text>
          <TextInput
            value={form.fuelPricePerLiter}
            onChangeText={(text) => updateField("fuelPricePerLiter", text)}
            placeholder="350"
            style={inputStyle}
            keyboardType="numeric"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Market Price</Text>
          <TextInput
            value={form.marketPrice}
            onChangeText={(text) => updateField("marketPrice", text)}
            placeholder="550"
            style={inputStyle}
            keyboardType="numeric"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Speed</Text>
          <TextInput
            value={form.speed}
            onChangeText={(text) => updateField("speed", text)}
            placeholder="14"
            style={inputStyle}
            keyboardType="numeric"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Fishing Hours</Text>
          <TextInput
            value={form.fishingHours}
            onChangeText={(text) => updateField("fishingHours", text)}
            placeholder="32"
            style={inputStyle}
            keyboardType="numeric"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Number of Days</Text>
          <TextInput
            value={form.numberOfDays}
            onChangeText={(text) => updateField("numberOfDays", text)}
            placeholder="1"
            style={inputStyle}
            keyboardType="numeric"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Crew Count</Text>
          <TextInput
            value={form.crewCount}
            onChangeText={(text) => updateField("crewCount", text)}
            placeholder="6"
            style={inputStyle}
            keyboardType="numeric"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={labelStyle}>Mode</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {(["island", "international"] as const).map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => updateField("mode", item)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: form.mode === item ? "#111827" : "#d1d5db",
                  backgroundColor: form.mode === item ? "#111827" : "#fff",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: form.mode === item ? "#fff" : "#111827",
                    fontWeight: "600",
                    textTransform: "capitalize",
                  }}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={labelStyle}>Status</Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            {(["planned", "completed", "cancelled"] as const).map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => updateField("status", item)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: form.status === item ? "#111827" : "#d1d5db",
                  backgroundColor: form.status === item ? "#111827" : "#fff",
                }}
              >
                <Text
                  style={{
                    color: form.status === item ? "#fff" : "#111827",
                    fontWeight: "600",
                    textTransform: "capitalize",
                  }}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              flex: 1,
              backgroundColor: "#e5e7eb",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "700" }}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSubmit || saving}
            style={{
              flex: 1,
              backgroundColor: "#111827",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              opacity: !canSubmit || saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700" }}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}