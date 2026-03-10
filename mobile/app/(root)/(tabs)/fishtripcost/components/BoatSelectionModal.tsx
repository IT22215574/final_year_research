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
  name?: string;
  boatType?: string;
  engineHorsePower?: number;
  engineDegradationFactor?: number;
  fuelEfficiencyFactor?: number;
  averageFuelPredictionError?: number;
  createdAt?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;

  /**
   * ✅ New signature:
   * returns REAL mongo id + display fields
   */
  onSelectBoat: (
    boatMongoId: string,
    boatName: string,
    defaultEngineHP: number,
    boat?: Boat
  ) => void;

  selectedBoatMongoId?: string;
};

const BoatSelectionModal: React.FC<Props> = ({
  visible,
  onClose,
  onSelectBoat,
  selectedBoatMongoId,
}) => {
  const [loading, setLoading] = useState(false);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [query, setQuery] = useState("");

  const fetchMyBoats = async () => {
    try {
      setLoading(true);
      // ✅ your backend: GET /boats/my (protected)
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
      const name = (b.name || "").toLowerCase();
      const type = (b.boatType || "").toLowerCase();
      const hp = String(b.engineHorsePower ?? "");
      return (
        name.includes(q) ||
        type.includes(q) ||
        hp.includes(q) ||
        b._id.toLowerCase().includes(q)
      );
    });
  }, [boats, query]);

  const renderBoatCard = (b: Boat) => {
    const isSelected = selectedBoatMongoId === b._id;

    const displayName =
      b.name ||
      (b.boatType ? `${b.boatType} Boat` : "My Boat") + ` (${b._id.slice(-4)})`;

    const hp = Number(b.engineHorsePower ?? 0);

    const factor = b.fuelEfficiencyFactor ?? 1;
    const degr = b.engineDegradationFactor ?? 0;
    const avgErr = b.averageFuelPredictionError ?? 0;

    return (
      <TouchableOpacity
        key={b._id}
        activeOpacity={0.85}
        onPress={() => {
          onSelectBoat(b._id, displayName, hp || 85, b);
          onClose();
        }}
        className={`w-64 mr-4 rounded-2xl border overflow-hidden ${
          isSelected
            ? "bg-blue-50 border-blue-300"
            : "bg-white border-slate-200"
        }`}
      >
        {/* Boat Image Placeholder */}
        <View className="h-32 bg-slate-200 items-center justify-center">
          <Text className="text-4xl">🚤</Text>
        </View>
        
        {/* Boat Specs */}
        <View className="p-4">
          <Text className="text-base font-bold text-slate-900 mb-2">
            {displayName}
          </Text>

          <View className="flex-row flex-wrap gap-2">
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

          {isSelected && (
            <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 items-center justify-center">
              <Text className="text-white text-xs">✓</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
              placeholder="Search by name, type, hp, or mongo id..."
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

          {/* Horizontal Scroll of Boats */}
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
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="py-2"
            >
              {filtered.map(renderBoatCard)}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default BoatSelectionModal;
