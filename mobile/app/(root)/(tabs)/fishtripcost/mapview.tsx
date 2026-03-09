// mobile/app/(root)/(tabs)/fishtripcost/mapview.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Circle } from "react-native-maps";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import useFishingZoneStore from "@/stores/fishingZoneStore";
import FishTripNavBar from "./components/FishTripNavBar";

const HARBOR_LOCATION = {
  latitude: 6.9347,
  longitude: 79.8429,
  name: "Colombo Harbor",
};

// ✅ Comprehensive Sri Lankan Fishing Zones
const FISH_ZONES = [
  // Western Coast Zones
  {
    id: 1,
    name: "South-West Tuna Ground",
    latitude: 5.8,
    longitude: 80.0,
    fishType: "Yellowfin Tuna",
    estimatedCatch: "High",
    distance: 85,
    depth: "Deep",
    season: "NE Monsoon",
    density: "High 🐟🐟🐟",
  },
  {
    id: 2,
    name: "Negombo Offshore Bank",
    latitude: 7.2,
    longitude: 79.6,
    fishType: "Barracuda, Kingfish",
    estimatedCatch: "Medium",
    distance: 35,
    depth: "Moderate",
    season: "Year-round",
    density: "Medium 🐟🐟",
  },
  {
    id: 3,
    name: "Kalpitiya Deep Sea",
    latitude: 8.3,
    longitude: 79.5,
    fishType: "Sailfish, Marlin",
    estimatedCatch: "High",
    distance: 55,
    depth: "Deep",
    season: "NE Monsoon",
    density: "High 🐟🐟🐟",
  },
  {
    id: 4,
    name: "Chilaw Coastal Zone",
    latitude: 7.6,
    longitude: 79.7,
    fishType: "Mackerel, Sardines",
    estimatedCatch: "Medium",
    distance: 25,
    depth: "Shallow",
    season: "Year-round",
    density: "Medium 🐟🐟",
  },
  {
    id: 5,
    name: "Galle Deep Sea",
    latitude: 5.7,
    longitude: 80.2,
    fishType: "Yellowfin Tuna",
    estimatedCatch: "High",
    distance: 75,
    depth: "Deep",
    season: "SW Monsoon",
    density: "High 🐟🐟🐟",
  },
  {
    id: 6,
    name: "Hikkaduwa Reef Zone",
    latitude: 6.1,
    longitude: 80.0,
    fishType: "Snapper, Grouper",
    estimatedCatch: "Medium",
    distance: 40,
    depth: "Moderate",
    season: "Year-round",
    density: "Medium 🐟🐟",
  },

  // Southern Coast Zones
  {
    id: 7,
    name: "Matara Deep Water",
    latitude: 5.5,
    longitude: 80.5,
    fishType: "Swordfish, Tuna",
    estimatedCatch: "High",
    distance: 90,
    depth: "Very Deep",
    season: "SW Monsoon",
    density: "High 🐟🐟🐟",
  },
  {
    id: 8,
    name: "Hambantota Offshore",
    latitude: 6.0,
    longitude: 81.2,
    fishType: "Skipjack Tuna",
    estimatedCatch: "High",
    distance: 65,
    depth: "Deep",
    season: "Year-round",
    density: "High 🐟🐟🐟",
  },
  {
    id: 9,
    name: "Great Basses Reef",
    latitude: 6.2,
    longitude: 81.5,
    fishType: "Barracuda, Travelly",
    estimatedCatch: "Medium",
    distance: 70,
    depth: "Moderate",
    season: "NE Monsoon",
    density: "Medium 🐟🐟",
  },
  {
    id: 10,
    name: "Little Basses Bank",
    latitude: 6.4,
    longitude: 81.6,
    fishType: "Grouper, Snapper",
    estimatedCatch: "Medium",
    distance: 75,
    depth: "Moderate",
    season: "Year-round",
    density: "Medium 🐟🐟",
  },

  // Eastern Coast Zones
  {
    id: 11,
    name: "Trincomalee Offshore",
    latitude: 8.9,
    longitude: 81.9,
    fishType: "Mackerel, Sardines",
    estimatedCatch: "Medium",
    distance: 45,
    depth: "Moderate",
    season: "Year-round",
    density: "Medium 🐟🐟",
  },
  {
    id: 12,
    name: "Batticaloa Deep Ground",
    latitude: 7.7,
    longitude: 82.0,
    fishType: "Yellowfin Tuna",
    estimatedCatch: "High",
    distance: 80,
    depth: "Deep",
    season: "SW Monsoon",
    density: "High 🐟🐟🐟",
  },
  {
    id: 13,
    name: "Mullaitivu Deep Water",
    latitude: 9.3,
    longitude: 81.0,
    fishType: "Seerfish, Kingfish",
    estimatedCatch: "Medium",
    distance: 50,
    depth: "Deep",
    season: "NE Monsoon",
    density: "Medium 🐟🐟",
  },
  {
    id: 14,
    name: "Bay of Bengal Ground",
    latitude: 8.5,
    longitude: 81.5,
    fishType: "Swordfish",
    estimatedCatch: "Medium",
    distance: 95,
    depth: "Very Deep",
    season: "SW Monsoon",
    density: "Medium 🐟🐟",
  },
  {
    id: 15,
    name: "Eastern EEZ Margin",
    latitude: 7.8,
    longitude: 82.5,
    fishType: "Bigeye Tuna",
    estimatedCatch: "Medium",
    distance: 130,
    depth: "Very Deep",
    season: "Year-round",
    density: "Medium 🐟🐟",
  },

  // Northern Zones
  {
    id: 16,
    name: "Jaffna Peninsula Bank",
    latitude: 9.8,
    longitude: 80.2,
    fishType: "Pomfret, Seer",
    estimatedCatch: "High",
    distance: 85,
    depth: "Moderate",
    season: "NE Monsoon",
    density: "High 🐟🐟🐟",
  },
  {
    id: 17,
    name: "Kankesanthurai Offshore",
    latitude: 9.9,
    longitude: 80.0,
    fishType: "Sailfish, Marlin",
    estimatedCatch: "High",
    distance: 95,
    depth: "Deep",
    season: "Year-round",
    density: "High 🐟🐟🐟",
  },
  {
    id: 18,
    name: "Mannar Ridge",
    latitude: 8.8,
    longitude: 78.5,
    fishType: "Snapper, Grouper",
    estimatedCatch: "Low",
    distance: 60,
    depth: "Shallow",
    season: "NE Monsoon",
    density: "Low 🐟",
  },
  {
    id: 19,
    name: "Palk Bay Channel",
    latitude: 9.5,
    longitude: 79.8,
    fishType: "Prawns, Cuttlefish",
    estimatedCatch: "Medium",
    distance: 40,
    depth: "Shallow",
    season: "Year-round",
    density: "Medium 🐟🐟",
  },

  // Deep Sea International Zones
  {
    id: 20,
    name: "Nara Deep Sea Zone",
    latitude: 6.5,
    longitude: 77.8,
    fishType: "Bigeye Tuna, Marlin",
    estimatedCatch: "High",
    distance: 145,
    depth: "Very Deep",
    season: "NE Monsoon",
    density: "High 🐟🐟🐟",
  },
  {
    id: 21,
    name: "East-Central Arabian",
    latitude: 7.5,
    longitude: 77.5,
    fishType: "Skipjack Tuna",
    estimatedCatch: "High",
    distance: 120,
    depth: "Deep",
    season: "Year-round",
    density: "High 🐟🐟🐟",
  },
  {
    id: 22,
    name: "Maldives Western Margin",
    latitude: 6.2,
    longitude: 78.8,
    fishType: "Bigeye Tuna",
    estimatedCatch: "Medium",
    distance: 110,
    depth: "Deep",
    season: "NE Monsoon",
    density: "Medium 🐟🐟",
  },
  {
    id: 23,
    name: "Chagos Bank Approach",
    latitude: 5.0,
    longitude: 79.5,
    fishType: "Yellowfin Tuna",
    estimatedCatch: "High",
    distance: 155,
    depth: "Very Deep",
    season: "SW Monsoon",
    density: "High 🐟🐟🐟",
  },
  {
    id: 24,
    name: "Laccadive Sea Ground",
    latitude: 7.0,
    longitude: 78.0,
    fishType: "Skipjack, Yellowfin",
    estimatedCatch: "High",
    distance: 135,
    depth: "Deep",
    season: "Year-round",
    density: "High 🐟🐟🐟",
  },
];

const getCatchColor = (catch_: string) => {
  switch (catch_) {
    case "High":
      return "#22c55e";
    case "Medium":
      return "#eab308";
    case "Low":
      return "#ef4444";
    default:
      return "#6b7280";
  }
};

const MapViewScreen = () => {
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [showZoneList, setShowZoneList] = useState(false);
  const [showZoneDropdown, setShowZoneDropdown] = useState(false);
  const [loading] = useState(false);

  // Zustand
  const { selectedZones, addZone, removeZone, clearZones } =
    useFishingZoneStore();

  const normalizeZoneForStore = (zone: any) => {
    // ✅ Guarantee lat/lon exist for DATCIE planner
    return {
      ...zone,
      lat: zone.lat ?? zone.latitude,
      lon: zone.lon ?? zone.longitude,
    };
  };

  const handleZonePress = (zone: any) => {
    setSelectedZone(zone);
  };

  const handleAddZone = () => {
    if (!selectedZone) return;

    const normalized = normalizeZoneForStore(selectedZone);
    addZone(normalized);
    setSelectedZone(null);
  };

  const handleRemoveZone = (zoneId: number) => {
    removeZone(zoneId);
  };

  const handlePlanTrip = () => {
    if (selectedZones.length === 0) return;

    // ✅ IMPORTANT: navigate to the real route (index.tsx)
    // your index renders TripPlanner tab inside it.
    router.push("/(root)/(tabs)/fishtripcost/components/TripPlanner");
  };

  const handleViewZones = () => setShowZoneList(true);

  const handleClearAllZones = () => {
    clearZones();
    setShowZoneList(false);
  };

  const handleToggleZoneDropdown = () => {
    setShowZoneDropdown(!showZoneDropdown);
  };

  const handleSelectFromDropdown = (zone: any) => {
    setSelectedZone(zone);
    setShowZoneDropdown(false);
  };

  return (
    <View className="flex-1">
      {/* Navigation Bar */}
      <View className="absolute top-0 left-0 right-0 z-20">
        <FishTripNavBar />
      </View>

      {/* Top bar */}
      <SafeAreaView
        className="absolute top-0 left-0 right-0 z-10 px-4 pt-2"
        style={{ marginTop: 60 }}
      >
        <View className="flex-row justify-between items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-white/90 rounded-full p-3 w-12 h-12 items-center justify-center shadow-lg"
          >
            <Text className="text-xl">←</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggleZoneDropdown}
            className="bg-blue-500/90 rounded-full px-4 py-3 flex-row items-center shadow-lg"
          >
            <Text className="text-white mr-2">🗺️</Text>
            <Text className="text-white font-semibold">View Zones</Text>
            <Text className="text-white ml-2">
              {showZoneDropdown ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Dropdown list */}
      {showZoneDropdown && (
        <SafeAreaView className="absolute top-16 left-4 right-4 z-10">
          <View className="bg-white/95 rounded-2xl shadow-2xl max-h-96">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
              <Text className="text-lg font-bold text-gray-800">
                Available Fishing Zones
              </Text>
              <TouchableOpacity onPress={handleToggleZoneDropdown}>
                <Text className="text-2xl text-gray-500">×</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={FISH_ZONES}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectFromDropdown(item)}
                  className="border-b border-gray-100"
                >
                  <View className="flex-row items-center p-4">
                    <View
                      className="w-12 h-12 rounded-full items-center justify-center mr-3"
                      style={{
                        backgroundColor:
                          getCatchColor(item.estimatedCatch) + "20",
                      }}
                    >
                      <Text className="text-2xl">🐟</Text>
                    </View>

                    <View className="flex-1">
                      <Text className="font-semibold text-gray-800 mb-1">
                        {item.name}
                      </Text>
                      <View className="flex-row items-center">
                        <Text className="text-xs text-gray-500 mr-3">
                          📍 {item.distance} km
                        </Text>
                        <Text className="text-xs text-gray-500 mr-3">
                          {item.fishType}
                        </Text>
                        <Text className="text-xs">{item.density}</Text>
                      </View>
                    </View>

                    {selectedZones.find((z: any) => z.id === item.id) && (
                      <View className="bg-green-100 rounded-full p-2">
                        <Text className="text-green-600">✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      )}

      {/* Selected zones counter */}
      {selectedZones.length > 0 && (
        <SafeAreaView className="absolute top-0 right-0 z-10 px-4 pt-2 flex-row">
          <TouchableOpacity
            onPress={handleClearAllZones}
            className="bg-red-500 rounded-full px-4 py-2 flex-row items-center shadow-lg mr-2"
          >
            <Text className="text-white mr-2">🗑️</Text>
            <Text className="text-white font-semibold">Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleViewZones}
            className="bg-blue-500 rounded-full px-4 py-2 flex-row items-center shadow-lg"
          >
            <Text className="text-white mr-2">📍</Text>
            <Text className="text-white font-semibold">
              {selectedZones.length} Zone{selectedZones.length > 1 ? "s" : ""}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Plan Trip button */}
      {selectedZones.length > 0 && (
        <View className="absolute bottom-24 left-4 right-4 z-10">
          <TouchableOpacity
            onPress={handlePlanTrip}
            className="bg-blue-500 rounded-xl py-4 shadow-lg"
            activeOpacity={0.7}
          >
            <Text className="text-white text-center font-semibold text-lg">
              Plan Trip to {selectedZones.length} Zone
              {selectedZones.length > 1 ? "s" : ""} →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info Banner */}
      <View className="absolute bottom-4 left-4 right-4 z-10">
        <View className="bg-blue-500/90 rounded-lg px-3 py-2">
          <Text className="text-white text-xs text-center">
            Tap zones → Add to trip • Then press “Plan Trip” to open Planner
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center bg-slate-50">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-2 text-gray-600">Loading fishing zones...</Text>
        </View>
      ) : (
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: HARBOR_LOCATION.latitude,
            longitude: HARBOR_LOCATION.longitude,
            latitudeDelta: 2.5,
            longitudeDelta: 2.5,
          }}
          showsUserLocation
          showsCompass
        >
          {/* Harbor Marker */}
          <Marker
            coordinate={{
              latitude: HARBOR_LOCATION.latitude,
              longitude: HARBOR_LOCATION.longitude,
            }}
            title={HARBOR_LOCATION.name}
            description="Starting Point"
          >
            <View className="items-center">
              <View className="bg-blue-600 rounded-full p-3 border-2 border-white shadow-lg">
                <Text className="text-3xl">🚢</Text>
              </View>
              <View className="bg-blue-600 px-2 py-1 rounded-md mt-1">
                <Text className="text-white text-xs font-bold">Harbor</Text>
              </View>
            </View>
          </Marker>

          {/* Zone markers */}
          {FISH_ZONES.map((zone) => (
            <React.Fragment key={zone.id}>
              <Circle
                center={{ latitude: zone.latitude, longitude: zone.longitude }}
                radius={
                  zone.depth === "Very Deep"
                    ? 5000
                    : zone.depth === "Deep"
                      ? 3500
                      : 2000
                }
                strokeColor={getCatchColor(zone.estimatedCatch)}
                strokeWidth={
                  selectedZones.find((z: any) => z.id === zone.id) ? 4 : 2
                }
                fillColor={
                  selectedZones.find((z: any) => z.id === zone.id)
                    ? getCatchColor(zone.estimatedCatch) + "40"
                    : getCatchColor(zone.estimatedCatch) + "15"
                }
              />

              <Marker
                coordinate={{
                  latitude: zone.latitude,
                  longitude: zone.longitude,
                }}
                onPress={() => handleZonePress(zone)}
                title={zone.name}
                description={`${zone.fishType} • ${zone.estimatedCatch} density`}
              >
                <View className="items-center">
                  <View
                    className={`rounded-full p-3 border-2 shadow-xl ${
                      selectedZones.find((z: any) => z.id === zone.id)
                        ? "border-blue-400"
                        : "border-white"
                    }`}
                    style={{
                      backgroundColor: getCatchColor(zone.estimatedCatch),
                      transform: selectedZones.find(
                        (z: any) => z.id === zone.id,
                      )
                        ? [{ scale: 1.15 }]
                        : [{ scale: 1 }],
                    }}
                  >
                    <Text className="text-3xl">
                      {selectedZones.find((z: any) => z.id === zone.id)
                        ? "✅"
                        : "🐟"}
                    </Text>
                  </View>

                  <View
                    className="mt-1 px-2 py-1 rounded-md"
                    style={{
                      backgroundColor: getCatchColor(zone.estimatedCatch),
                    }}
                  >
                    <Text
                      className="text-white text-xs font-bold"
                      numberOfLines={1}
                    >
                      {zone.name.split(" ")[0]}
                    </Text>
                  </View>

                  <View className="bg-white/90 px-1 rounded-full mt-0.5">
                    <Text className="text-xs">{zone.density}</Text>
                  </View>
                </View>
              </Marker>
            </React.Fragment>
          ))}
        </MapView>
      )}

      {/* Zone Detail Modal */}
      <Modal visible={!!selectedZone} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setSelectedZone(null)}
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity activeOpacity={1}>
              <LinearGradient
                colors={["#ffffff", "#f8fafc"]}
                className="rounded-t-3xl p-6 shadow-2xl"
              >
                {selectedZone && (
                  <>
                    <View className="flex-row justify-between items-center mb-4">
                      <View className="flex-row items-center flex-1">
                        <View
                          className="w-12 h-12 rounded-full items-center justify-center mr-3"
                          style={{
                            backgroundColor:
                              getCatchColor(selectedZone.estimatedCatch) + "20",
                          }}
                        >
                          <Text className="text-2xl">🐟</Text>
                        </View>

                        <View className="flex-1">
                          <Text className="text-xl font-bold text-gray-800">
                            {selectedZone.name}
                          </Text>
                          <Text className="text-sm text-gray-500">
                            {selectedZone.distance} km from Colombo
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => setSelectedZone(null)}
                        className="bg-gray-100 rounded-full p-2"
                      >
                        <Text className="text-lg">✕</Text>
                      </TouchableOpacity>
                    </View>

                    <View className="flex-row flex-wrap bg-gray-50 rounded-xl p-3 mb-4">
                      <View className="w-1/2 p-2">
                        <Text className="text-xs text-gray-500">Fish Type</Text>
                        <Text className="text-lg font-semibold text-gray-800">
                          {selectedZone.fishType}
                        </Text>
                      </View>
                      <View className="w-1/2 p-2">
                        <Text className="text-xs text-gray-500">Depth</Text>
                        <Text className="text-lg font-semibold text-gray-800">
                          {selectedZone.depth}
                        </Text>
                      </View>
                      <View className="w-1/2 p-2">
                        <Text className="text-xs text-gray-500">
                          Est. Catch
                        </Text>
                        <Text className="text-lg font-semibold text-gray-800">
                          {selectedZone.estimatedCatch}
                        </Text>
                      </View>
                      <View className="w-1/2 p-2">
                        <Text className="text-xs text-gray-500">Density</Text>
                        <Text className="text-lg">{selectedZone.density}</Text>
                      </View>
                    </View>

                    {selectedZones.find(
                      (z: any) => z.id === selectedZone.id,
                    ) ? (
                      <View className="bg-green-50 rounded-xl p-3 mb-4">
                        <Text className="text-green-700 text-center font-medium">
                          ✓ Already added to your trip
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={handleAddZone}
                        className="bg-blue-500 rounded-xl py-4 mb-4"
                      >
                        <Text className="text-white text-center font-semibold">
                          + Add to Trip
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => setSelectedZone(null)}
                      className="bg-gray-100 rounded-xl py-4"
                    >
                      <Text className="text-center font-semibold text-gray-600">
                        Close
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Selected Zones List Modal */}
      <Modal visible={showZoneList} transparent animationType="slide">
        <View className="flex-1 bg-black/50">
          <View className="flex-1 justify-end">
            <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">
                  Selected Zones ({selectedZones.length})
                </Text>
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={handleClearAllZones}
                    className="bg-red-100 rounded-full p-2 mr-2"
                  >
                    <Text className="text-red-500">🗑️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowZoneList(false)}
                    className="bg-gray-100 rounded-full p-2"
                  >
                    <Text className="text-lg">✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <FlatList
                data={selectedZones}
                keyExtractor={(item: any) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }: any) => (
                  <View className="flex-row items-center bg-gray-50 rounded-xl p-3 mb-2">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{
                        backgroundColor:
                          getCatchColor(item.estimatedCatch) + "20",
                      }}
                    >
                      <Text className="text-lg">🐟</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-800">
                        {item.name}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {item.fishType} • {item.distance} km
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveZone(item.id)}
                      className="bg-red-100 rounded-full p-2"
                    >
                      <Text className="text-red-500">✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />

              <TouchableOpacity
                onPress={handlePlanTrip}
                className="bg-blue-500 rounded-xl py-4 mt-4"
              >
                <Text className="text-white text-center font-semibold text-lg">
                  Plan Trip ({selectedZones.length} Zones)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MapViewScreen;
