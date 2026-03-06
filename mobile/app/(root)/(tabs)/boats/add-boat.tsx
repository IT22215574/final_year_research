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

import { apiFetch } from "@/utils/api";

type BoatMode = "island" | "international";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AddBoatScreen() {
  const [boatName, setBoatName] = useState("");
  const [boatType, setBoatType] = useState("");
  const [engineHorsePower, setEngineHorsePower] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [boatLength, setBoatLength] = useState("");
  const [boatWidth, setBoatWidth] = useState("");
  const [mode, setMode] = useState<BoatMode>("island");

  const [imageUri, setImageUri] = useState<string | null>(null);

  const [boatTypes, setBoatTypes] = useState<string[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  const fetchBoatTypes = async () => {
    try {
      setTypesLoading(true);

      const res = await apiFetch("/api/v1/boats/types", { method: "GET" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to load boat types");
      }

      const data = (await res.json()) as string[];
      const list = Array.isArray(data) ? data : [];
      setBoatTypes(list);

      if (!boatType && list.length > 0) setBoatType(list[0]);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.message || "Could not load boat types");
    } finally {
      setTypesLoading(false);
    }
  };

  useEffect(() => {
    fetchBoatTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow gallery permission to pick an image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
       mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ new API
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets?.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Image picker failed");
    }
  };

  const createBoat = async () => {
    if (!boatName.trim()) return Alert.alert("Missing", "Boat name is required");
    if (!boatType) return Alert.alert("Missing", "Boat type is required");
    if (!engineHorsePower.trim()) return Alert.alert("Missing", "Engine HP is required");

    if (boatTypes.length > 0 && !boatTypes.includes(boatType)) {
      return Alert.alert("Invalid boat type", "Select a boat type from the dropdown.");
    }

    try {
      setLoading(true);

      const form = new FormData();
      form.append("boatName", boatName.trim());
      form.append("boatType", boatType);
      form.append("engineHorsePower", engineHorsePower.trim());
      form.append("mode", mode);

      if (registrationNumber.trim()) form.append("registrationNumber", registrationNumber.trim());
      if (specifications.trim()) form.append("specifications", specifications.trim());
      if (boatLength.trim()) form.append("boatLength", boatLength.trim());
      if (boatWidth.trim()) form.append("boatWidth", boatWidth.trim());

      if (imageUri) {
        const lower = imageUri.toLowerCase();
        const isPng = lower.endsWith(".png");
        const type = isPng ? "image/png" : "image/jpeg";
        const name = isPng ? "boat.png" : "boat.jpg";

        form.append(
          "boatImage",
          {
            uri: imageUri,
            name,
            type,
          } as any
        );
      }

      const res = await apiFetch("/api/v1/boats", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = Array.isArray(err?.message) ? err.message.join("\n") : err?.message;
        throw new Error(msg || "Boat create failed");
      }

      Alert.alert("Success", "Boat created successfully!");
      router.back();
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.message || "Failed to create boat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-3 pb-3 bg-white border-b border-slate-100 flex-row justify-between items-center">
        <View>
          <Text className="text-xl font-bold text-slate-900">Add Boat</Text>
          <Text className="text-xs text-slate-400 mt-0.5">Create boat with specs + image</Text>
          {!API_URL ? (
            <Text className="text-xs text-rose-600 mt-1">
              EXPO_PUBLIC_API_URL not loaded → restart Expo after editing .env
            </Text>
          ) : null}
        </View>

        <TouchableOpacity onPress={() => router.back()} className="bg-slate-100 rounded-full px-3 py-2">
          <Text className="text-slate-700 font-semibold">Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 30 }}>
        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <Text className="text-sm font-semibold text-slate-800 mb-3">Boat Image</Text>

          <TouchableOpacity
            onPress={pickImage}
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 items-center"
          >
            <Text className="font-semibold text-slate-700">{imageUri ? "Change Image" : "Pick Image"}</Text>
          </TouchableOpacity>

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: "100%", height: 180, borderRadius: 14, marginTop: 12 }} />
          ) : null}
        </View>

        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <Text className="text-sm font-semibold text-slate-800 mb-3">Boat Details</Text>

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
                <Text className="ml-3 text-slate-600">Loading boat types...</Text>
              </View>
            ) : (
              <Picker selectedValue={boatType} onValueChange={(v) => setBoatType(String(v))}>
                {boatTypes.length === 0 ? (
                  <Picker.Item label="No types loaded" value="" />
                ) : (
                  boatTypes.map((t) => <Picker.Item key={t} label={t} value={t} />)
                )}
              </Picker>
            )}
          </View>

          <Text className="text-xs text-slate-500 mb-1">Engine HP *</Text>
          <TextInput
            value={engineHorsePower}
            onChangeText={setEngineHorsePower}
            keyboardType="numeric"
            placeholder="e.g. 150"
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
          />

          <Text className="text-xs text-slate-500 mb-1">Registration Number</Text>
          <TextInput
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            placeholder="e.g. SL-BOAT-1234"
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
          />

          <Text className="text-xs text-slate-500 mb-1">Specifications</Text>
          <TextInput
            value={specifications}
            onChangeText={setSpecifications}
            placeholder="e.g. GPS, ice box..."
            className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">Length</Text>
              <TextInput
                value={boatLength}
                onChangeText={setBoatLength}
                keyboardType="numeric"
                placeholder="ft"
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">Width</Text>
              <TextInput
                value={boatWidth}
                onChangeText={setBoatWidth}
                keyboardType="numeric"
                placeholder="ft"
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-3"
              />
            </View>
          </View>

          <Text className="text-xs text-slate-500 mb-2 font-medium">Mode</Text>
          <View className="flex-row gap-2 mb-2">
            <TouchableOpacity
              onPress={() => setMode("island")}
              className={`flex-1 rounded-xl py-3 items-center border ${
                mode === "island" ? "bg-blue-600 border-blue-600" : "bg-white border-slate-200"
              }`}
            >
              <Text className={`font-semibold ${mode === "island" ? "text-white" : "text-slate-700"}`}>Island</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("international")}
              className={`flex-1 rounded-xl py-3 items-center border ${
                mode === "international" ? "bg-blue-600 border-blue-600" : "bg-white border-slate-200"
              }`}
            >
              <Text className={`font-semibold ${mode === "international" ? "text-white" : "text-slate-700"}`}>
                International
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={createBoat}
          disabled={loading}
          className={`rounded-xl py-4 items-center ${loading ? "bg-blue-400" : "bg-blue-600"}`}
        >
          <Text className="text-white font-bold text-base">{loading ? "Saving..." : "Create Boat"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}