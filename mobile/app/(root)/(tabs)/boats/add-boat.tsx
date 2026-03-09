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
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";

import {
  createBoat,
  createBoatWithImage,
  getBoatTypes,
  type CreateBoatBody,
} from "@/services/boatService";

type BoatMode = "island" | "international";

export default function AddBoatScreen() {
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

  const [boatTypes, setBoatTypes] = useState<string[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchTypes = async () => {
    try {
      setTypesLoading(true);
      const types = await getBoatTypes();
      const safeTypes = Array.isArray(types) ? types : [];
      setBoatTypes(safeTypes);

      if (!boatType && safeTypes.length > 0) {
        setBoatType(safeTypes[0]);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load boat types");
    } finally {
      setTypesLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Allow gallery permission to select a boat image.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
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

  const toOptionalNumber = (value: string): number | undefined => {
    if (!value.trim()) return undefined;

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return undefined;

    return parsed;
  };

  const handleCreateBoat = async () => {
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

    if (boatTypes.length > 0 && !boatTypes.includes(boatType)) {
      Alert.alert("Validation", "Please select a valid boat type");
      return;
    }

    try {
      setLoading(true);

      const body: CreateBoatBody = {
        boatName: boatName.trim(),
        boatType: boatType.trim(),
        engineHorsePower: engineHP,
        boatLength: toOptionalNumber(boatLength),
        boatWidth: toOptionalNumber(boatWidth),
        boatValue: toOptionalNumber(boatValue),
        fuelEfficiencyFactor: toOptionalNumber(fuelEfficiencyFactor),
        engineDegradationFactor: toOptionalNumber(engineDegradationFactor),
        averageFuelPredictionError: toOptionalNumber(
          averageFuelPredictionError,
        ),
        mode,
      };

      if (imageUri) {
        await createBoatWithImage(body, imageUri);
      } else {
        await createBoat(body);
      }

      Alert.alert("Success", "Boat created successfully", [
        {
          text: "OK",
          onPress: () => router.replace("/(root)/(tabs)/boats"),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to create boat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-3 pb-3 bg-white border-b border-slate-100 flex-row justify-between items-center">
        <View>
          <Text className="text-xl font-bold text-slate-900">Add Boat</Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            Create a boat for DATCIE prediction and trip planning
          </Text>
        </View>

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
              {imageUri ? "Change Image" : "Pick Image"}
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
            placeholder="e.g. Sea Queen"
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
            placeholder="e.g. 150"
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
          />

          <Text className="text-xs text-slate-500 mb-2 font-medium">Mode</Text>
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
                placeholder="e.g. 28"
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
              />
            </View>

            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">Width</Text>
              <TextInput
                value={boatWidth}
                onChangeText={setBoatWidth}
                keyboardType="decimal-pad"
                placeholder="e.g. 8"
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
              />
            </View>
          </View>

          <Text className="text-xs text-slate-500 mb-1">Boat Value</Text>
          <TextInput
            value={boatValue}
            onChangeText={setBoatValue}
            keyboardType="decimal-pad"
            placeholder="e.g. 2500000"
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
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
            placeholder="e.g. 1"
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
          />

          <Text className="text-xs text-slate-500 mb-1">
            Engine Degradation Factor
          </Text>
          <TextInput
            value={engineDegradationFactor}
            onChangeText={setEngineDegradationFactor}
            keyboardType="decimal-pad"
            placeholder="e.g. 0.05"
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
          />

          <Text className="text-xs text-slate-500 mb-1">
            Average Fuel Prediction Error
          </Text>
          <TextInput
            value={averageFuelPredictionError}
            onChangeText={setAverageFuelPredictionError}
            keyboardType="decimal-pad"
            placeholder="e.g. 3.2"
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5"
          />
        </View>

        <TouchableOpacity
          onPress={handleCreateBoat}
          disabled={loading}
          className={`rounded-xl py-4 items-center ${
            loading ? "bg-blue-400" : "bg-blue-600"
          }`}
        >
          <Text className="text-white font-bold text-base">
            {loading ? "Saving..." : "Create Boat"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
