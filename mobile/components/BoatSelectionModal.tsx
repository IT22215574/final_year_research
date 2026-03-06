// components/BoatSelectionModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";

import { apiFetch } from "@/utils/api";

export type Boat = {
  _id: string;

  // ✅ match your backend schema
  boatName?: string;
  boatType?: string;
  engineHorsePower?: number;

  boatImage?: string; // e.g. "/uploads/boats/boat-xxx.png"
  specifications?: string;
  boatLength?: number;
  boatWidth?: number;
  registrationNumber?: string;
  mode?: "island" | "international";

  // learning coefficients
  engineDegradationFactor?: number;
  fuelEfficiencyFactor?: number;
  averageFuelPredictionError?: number;

  createdAt?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;

  /**
   * ✅ returns REAL mongo id + display fields
   */
  onSelectBoat: (
    boatMongoId: string,
    boatName: string,
    defaultEngineHP: number,
    boat?: Boat
  ) => void;

  selectedBoatMongoId?: string;

  /**
   * optional: allow "Add Boat" button
   */
  onAddBoat?: () => void;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL; // e.g. http://192.168.1.10:5000 or http://10.0.2.2:5000

const BoatSelectionModal: React.FC<Props> = ({
  visible,
  onClose,
  onSelectBoat,
  selectedBoatMongoId,
  onAddBoat,
}) => {
  const [loading, setLoading] = useState(false);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [query, setQuery] = useState("");

  const fetchMyBoats = async () => {
    try {
      setLoading(true);

      // ✅ your backend: GET /api/v1/boats/my (protected)
      const res = await apiFetch("/api/v1/boats/my", { method: "GET" });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to load boats");
      }

      const data = (await res.json()) as Boat[];
      setBoats(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("BoatSelectionModal fetch error:", e);
      Alert.alert("Error", e?.message || "Could not load boats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) fetchMyBoats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boats;

    return boats.filter((b) => {
      const name = (b.boatName || "").toLowerCase();
      const type = (b.boatType || "").toLowerCase();
      const hp = String(b.engineHorsePower ?? "");
      const reg = (b.registrationNumber || "").toLowerCase();
      const mode = (b.mode || "").toLowerCase();

      return (
        name.includes(q) ||
        type.includes(q) ||
        hp.includes(q) ||
        reg.includes(q) ||
        mode.includes(q) ||
        b._id.toLowerCase().includes(q)
      );
    });
  }, [boats, query]);

  const renderBoatCard = (b: Boat) => {
    const isSelected = selectedBoatMongoId === b._id;

    const displayName =
      b.boatName ||
      (b.boatType ? `${b.boatType} Boat` : "My Boat") + ` (${b._id.slice(-4)})`;

    const hp = Number(b.engineHorsePower ?? 0);

    const factor = b.fuelEfficiencyFactor ?? 1;
    const degr = b.engineDegradationFactor ?? 0;
    const avgErr = b.averageFuelPredictionError ?? 0;

    const imgUrl =
      b.boatImage && API_URL ? `${API_URL}${b.boatImage}` : null;

    return (
      <TouchableOpacity
        key={b._id}
        activeOpacity={0.85}
        onPress={() => {
          onSelectBoat(b._id, displayName, hp || 85, b);
          onClose();
        }}
        className={`rounded-2xl border p-4 mb-3 ${
          isSelected
            ? "bg-blue-50 border-blue-300"
            : "bg-white border-slate-200"
        }`}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-3">
            {/* Top row with image + title */}
            <View className="flex-row items-start">
              {imgUrl ? (
                <Image
                  source={{ uri: imgUrl }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    marginRight: 12,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    marginRight: 12,
                    backgroundColor: "#f1f5f9",
                  }}
                />
              )}

              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">
                  {displayName}
                </Text>

                <Text className="text-xs text-slate-500 mt-1">
                  ID: <Text className="text-slate-700">{b._id}</Text>
                </Text>

                {b.specifications ? (
                  <Text className="text-xs text-slate-500 mt-1">
                    {b.specifications}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Chips */}
            <View className="flex-row flex-wrap mt-3 gap-2">
              <View className="bg-slate-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold text-slate-700">
                  Type: {b.boatType || "N/A"}
                </Text>
              </View>

              <View className="bg-slate-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold text-slate-700">
                  HP: {hp || "N/A"}
                </Text>
              </View>

              {b.mode ? (
                <View className="bg-slate-100 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-slate-700">
                    Mode: {b.mode}
                  </Text>
                </View>
              ) : null}

              {b.registrationNumber ? (
                <View className="bg-slate-100 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-slate-700">
                    Reg: {b.registrationNumber}
                  </Text>
                </View>
              ) : null}

              {typeof b.boatLength === "number" ? (
                <View className="bg-slate-100 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-slate-700">
                    L: {b.boatLength}
                  </Text>
                </View>
              ) : null}

              {typeof b.boatWidth === "number" ? (
                <View className="bg-slate-100 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-slate-700">
                    W: {b.boatWidth}
                  </Text>
                </View>
              ) : null}

              {/* learning factors */}
              <View className="bg-slate-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold text-slate-700">
                  Factor: {factor.toFixed(2)}
                </Text>
              </View>

              <View className="bg-slate-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold text-slate-700">
                  Degr: {(degr * 100).toFixed(0)}%
                </Text>
              </View>

              <View className="bg-slate-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold text-slate-700">
                  AvgErr: {avgErr.toFixed(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Selected marker */}
          <View
            className={`w-7 h-7 rounded-full items-center justify-center ${
              isSelected ? "bg-blue-600" : "bg-slate-200"
            }`}
          >
            <Text className={`${isSelected ? "text-white" : "text-slate-600"}`}>
              ✓
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-lg font-bold text-slate-900">
                Select Your Boat
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                Loaded from your backend (Mongo IDs)
              </Text>
              {!API_URL ? (
                <Text className="text-xs text-rose-600 mt-1">
                  EXPO_PUBLIC_API_URL not set → images won’t load
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="bg-slate-100 rounded-full px-3 py-2"
              activeOpacity={0.8}
            >
              <Text className="text-slate-700 font-semibold">Close</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="mb-4">
            <TextInput
              placeholder="Search by name, type, hp, reg, mode, or mongo id..."
              value={query}
              onChangeText={setQuery}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />
          </View>

          {/* Controls */}
          <View className="flex-row gap-2 mb-3">
            <TouchableOpacity
              onPress={fetchMyBoats}
              activeOpacity={0.85}
              className="flex-1 bg-slate-900 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-bold">Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setQuery("")}
              activeOpacity={0.85}
              className="flex-1 bg-slate-100 rounded-xl py-3 items-center border border-slate-200"
            >
              <Text className="text-slate-700 font-bold">Clear Search</Text>
            </TouchableOpacity>
          </View>

          {/* Add Boat button (optional) */}
          <View className="mb-3">
            <TouchableOpacity
              onPress={() => {
                if (onAddBoat) onAddBoat();
                else
                  Alert.alert(
                    "Add Boat",
                    "Create an AddBoat screen and pass onAddBoat prop to navigate."
                  );
              }}
              activeOpacity={0.85}
              className="bg-blue-600 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-bold">+ Add Boat</Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          {loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator />
              <Text className="text-slate-500 mt-3">Loading your boats...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View className="py-10 items-center">
              <Text className="text-slate-700 font-semibold">No boats found</Text>
              <Text className="text-slate-500 text-xs mt-2 text-center">
                Create a boat first using POST /api/v1/boats
                {"\n"}Then open this modal again.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {filtered.map(renderBoatCard)}
              <View className="h-6" />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default BoatSelectionModal;