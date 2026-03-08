import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";

import {
  getBoatById,
  getBoatTypes,
  updateBoat,
  updateBoatWithImage,
  type UpdateBoatBody,
} from "@/services/boatService";

type BoatMode = "island" | "international";

export default function EditBoatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [boatName, setBoatName] = useState("");
  const [boatType, setBoatType] = useState("");
  const [engineHorsePower, setEngineHorsePower] = useState("");
  const [boatLength, setBoatLength] = useState("");
  const [boatWidth, setBoatWidth] = useState("");
  const [boatValue, setBoatValue] = useState("");
  const [fuelEfficiencyFactor, setFuelEfficiencyFactor] = useState("");
  const [engineDegradationFactor, setEngineDegradationFactor] = useState("");
  const [averageFuelPredictionError, setAverageFuelPredictionError] =
    useState("");
  const [mode, setMode] = useState<BoatMode>("island");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImageUri, setExistingImageUri] = useState<string | null>(null);

  const [boatTypes, setBoatTypes] = useState<string[]>([]);
  const [screenLoading, setScreenLoading] = useState(true);
  const [typesLoading, setTypesLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const toOptionalNumber = (value: string): number | undefined => {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const loadData = async () => {
    try {
      setScreenLoading(true);

      const [boat, types] = await Promise.all([
        getBoatById(String(id)),
        getBoatTypes(),
      ]);

      setBoatName(boat.boatName || "");
      setBoatType(boat.boatType || "");
      setEngineHorsePower(
        boat.engineHorsePower != null ? String(boat.engineHorsePower) : ""
      );
      setBoatLength(boat.boatLength != null ? String(boat.boatLength) : "");
      setBoatWidth(boat.boatWidth != null ? String(boat.boatWidth) : "");
      setBoatValue(boat.boatValue != null ? String(boat.boatValue) : "");
      setFuelEfficiencyFactor(
        boat.fuelEfficiencyFactor != null
          ? String(boat.fuelEfficiencyFactor)
          : ""
      );
      setEngineDegradationFactor(
        boat.engineDegradationFactor != null
          ? String(boat.engineDegradationFactor)
          : ""
      );
      setAverageFuelPredictionError(
        boat.averageFuelPredictionError != null
          ? String(boat.averageFuelPredictionError)
          : ""
      );
      setMode((boat.mode as BoatMode) || "island");
      setBoatTypes(Array.isArray(types) ? types : []);

      if (boat.boatImage) {
        setExistingImageUri(
          `${process.env.EXPO_PUBLIC_API_BASE_URL}${boat.boatImage}`
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load boat");
    } finally {
      setScreenLoading(false);
      setTypesLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      setTypesLoading(true);
      loadData();
    }
  }, [id]);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Allow gallery permission to select a boat image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to pick image");
    }
  };

  const handleSave = async () => {
    if (!boatName.trim()) {
      Alert.alert("Validation", "Boat name is required");
      return;
    }

    if (!boatType.trim()) {
      Alert.alert("Validation", "Boat type is required");
      return;
    }

    if (!engineHorsePower.trim()) {
      Alert.alert("Validation", "Engine horsepower is required");
      return;
    }

    const engineHP = Number(engineHorsePower);
    if (!Number.isFinite(engineHP) || engineHP <= 0) {
      Alert.alert("Validation", "Engine horsepower must be a positive number");
      return;
    }

    try {
      setSaving(true);

      const body: UpdateBoatBody = {
        boatName: boatName.trim(),
        boatType: boatType.trim(),
        engineHorsePower: engineHP,
        boatLength: toOptionalNumber(boatLength),
        boatWidth: toOptionalNumber(boatWidth),
        boatValue: toOptionalNumber(boatValue),
        fuelEfficiencyFactor: toOptionalNumber(fuelEfficiencyFactor),
        engineDegradationFactor: toOptionalNumber(engineDegradationFactor),
        averageFuelPredictionError: toOptionalNumber(
          averageFuelPredictionError
        ),
        mode,
      };

      if (imageUri) {
        await updateBoatWithImage(String(id), body, imageUri);
      } else {
        await updateBoat(String(id), body);
      }

      Alert.alert("Success", "Boat updated successfully", [
        {
          text: "OK",
          onPress: () => router.replace(`/(root)/(tabs)/boats/${id}`),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update boat");
    } finally {
      setSaving(false);
    }
  };

  if (screenLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="text-slate-500 mt-3">Loading boat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-3 pb-3 bg-white border-b border-slate-100 flex-row justify-between items-center">
        <Text className="text-xl font-bold text-slate-900">Edit Boat</Text>

        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-slate-100 rounded-full px-3 py-2"
        >
          <Text className="text-slate-700 font-semibold">Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <Text className="text-sm font-semibold text-slate-800 mb-3">
            Boat Image
          </Text>

          <TouchableOpacity
            onPress={pickImage}
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 items-center"
          >
            <Text className="font-semibold text-slate-700">
              {imageUri ? "Change Selected Image" : "Pick New Image"}
            </Text>
          </TouchableOpacity>

          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{
                width: "100%",
                height: 180,
                borderRadius: 14,
                marginTop: 12,
              }}
            />
          ) : existingImageUri ? (
            <Image
              source={{ uri: existingImageUri }}
              style={{
                width: "100%",
                height: 180,
                borderRadius: 14,
                marginTop: 12,
              }}
            />
          ) : null}
        </View>

        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <Text className="text-sm font-semibold text-slate-800 mb-3">
            Main Details
          </Text>

          <Text className="text-xs text-slate-500 mb-1">Boat Name *</Text>
          <TextInput
            value={boatName}
            onChangeText={setBoatName}
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
          />

          <Text className="text-xs text-slate-500 mb-1">Boat Type *</Text>
          <View className="bg-slate-50 border border-slate-200 rounded-xl mb-3 overflow-hidden">
            {typesLoading ? (
              <View className="p-4 flex-row items-center">
                <ActivityIndicator />
                <Text className="ml-3 text-slate-600">
                  Loading boat types...
                </Text>
              </View>
            ) : (
              <Picker
                selectedValue={boatType}
                onValueChange={(value) => setBoatType(String(value))}
              >
                {boatTypes.length === 0 ? (
                  <Picker.Item label="No boat types found" value="" />
                ) : (
                  boatTypes.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))
                )}
              </Picker>
            )}
          </View>

          <Text className="text-xs text-slate-500 mb-1">Engine HP *</Text>
          <TextInput
            value={engineHorsePower}
            onChangeText={setEngineHorsePower}
            keyboardType="decimal-pad"
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
          />

          <Text className="text-xs text-slate-500 mb-2">Mode</Text>
          <View className="flex-row gap-2 mb-3">
            <TouchableOpacity
              onPress={() => setMode("island")}
              className={`flex-1 rounded-xl py-3 items-center border ${
                mode === "island"
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`font-semibold ${
                  mode === "island" ? "text-white" : "text-slate-700"
                }`}
              >
                Island
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("international")}
              className={`flex-1 rounded-xl py-3 items-center border ${
                mode === "international"
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white border-slate-200"
              }`}
            >
              <Text
                className={`font-semibold ${
                  mode === "international" ? "text-white" : "text-slate-700"
                }`}
              >
                International
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <Text className="text-sm font-semibold text-slate-800 mb-3">
            Optional Specs
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">Length</Text>
              <TextInput
                value={boatLength}
                onChangeText={setBoatLength}
                keyboardType="decimal-pad"
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
              />
            </View>

            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">Width</Text>
              <TextInput
                value={boatWidth}
                onChangeText={setBoatWidth}
                keyboardType="decimal-pad"
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
              />
            </View>
          </View>

          <Text className="text-xs text-slate-500 mb-1">Boat Value</Text>
          <TextInput
            value={boatValue}
            onChangeText={setBoatValue}
            keyboardType="decimal-pad"
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5"
          />
        </View>

        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <Text className="text-sm font-semibold text-slate-800 mb-3">
            Learning / Calibration Fields
          </Text>

          <Text className="text-xs text-slate-500 mb-1">
            Fuel Efficiency Factor
          </Text>
          <TextInput
            value={fuelEfficiencyFactor}
            onChangeText={setFuelEfficiencyFactor}
            keyboardType="decimal-pad"
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
          />

          <Text className="text-xs text-slate-500 mb-1">
            Engine Degradation Factor
          </Text>
          <TextInput
            value={engineDegradationFactor}
            onChangeText={setEngineDegradationFactor}
            keyboardType="decimal-pad"
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
          />

          <Text className="text-xs text-slate-500 mb-1">
            Average Fuel Prediction Error
          </Text>
          <TextInput
            value={averageFuelPredictionError}
            onChangeText={setAverageFuelPredictionError}
            keyboardType="decimal-pad"
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5"
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className={`rounded-xl py-4 items-center ${
            saving ? "bg-blue-400" : "bg-blue-600"
          }`}
        >
          <Text className="text-white font-bold text-base">
            {saving ? "Saving..." : "Update Boat"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}