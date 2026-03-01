// mobile/app/(root)/(tabs)/fishtripcost/mapview.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList, Image } from 'react-native';
import MapView, { Marker, Circle, Polygon } from 'react-native-maps';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import useFishingZoneStore from '@/stores/fishingZoneStore';
import { images } from '@/constants';

const HARBOR_LOCATION = {
  latitude: 6.9347,
  longitude: 79.8429,
  name: "Colombo Harbor",
};

/**
 * FISH ZONES - Can be loaded from external API
 * 
 * To integrate with external API:
 * 1. Import: import { generateSriLankaDemoZones } from '@/utils/fishZoneDemo';
 * 2. Use useState to store dynamic zones
 * 3. Call API on component mount or button click
 * 
 * Example:
 * const [fishZones, setFishZones] = useState(FISH_ZONES);
 * 
 * useEffect(() => {
 *   const demoZones = generateSriLankaDemoZones({
 *     sstC: 28.5,
 *     chlorophyllMgM3: 0.3,
 *     currentSpeedMS: 0.5,
 *     currentDirectionDeg: 90
 *   });
 *   // Convert demoZones to FISH_ZONES format and setFishZones(...)
 * }, []);
 */

// Real fishing zones based on NARA data and research
const FISH_ZONES = [
  { 
    id: 1, 
    name: "South-West Tuna Ground", 
    latitude: 5.8000, 
    longitude: 80.0000, 
    fishType: "Yellowfin Tuna", 
    estimatedCatch: "High", 
    distance: 85,
    depth: "Deep",
    season: "NE Monsoon",
    color: "#22c55e",
    density: "High 🐟🐟🐟"
  },
  { 
    id: 2, 
    name: "East-Central Arabian", 
    latitude: 7.5000, 
    longitude: 77.5000, 
    fishType: "Skipjack Tuna", 
    estimatedCatch: "High", 
    distance: 120,
    depth: "Deep",
    season: "Year-round",
    color: "#22c55e",
    density: "High 🐟🐟🐟"
  },
  { 
    id: 3, 
    name: "Bay of Bengal Ground", 
    latitude: 8.5000, 
    longitude: 81.5000, 
    fishType: "Swordfish", 
    estimatedCatch: "Medium", 
    distance: 95,
    depth: "Very Deep",
    season: "SW Monsoon",
    color: "#eab308",
    density: "Medium 🐟🐟"
  },
  { 
    id: 4, 
    name: "Maldives Western Margin", 
    latitude: 6.2000, 
    longitude: 78.8000, 
    fishType: "Bigeye Tuna", 
    estimatedCatch: "Medium", 
    distance: 110,
    depth: "Deep",
    season: "NE Monsoon",
    color: "#eab308",
    density: "Medium 🐟🐟"
  },
  { 
    id: 5, 
    name: "Trincomalee Offshore", 
    latitude: 8.9000, 
    longitude: 81.9000, 
    fishType: "Mackerel", 
    estimatedCatch: "Medium", 
    distance: 45,
    depth: "Moderate",
    season: "Year-round",
    color: "#eab308",
    density: "Medium 🐟🐟"
  },
  { 
    id: 6, 
    name: "Galle Deep Sea", 
    latitude: 5.7000, 
    longitude: 80.2000, 
    fishType: "Yellowfin Tuna", 
    estimatedCatch: "High", 
    distance: 75,
    depth: "Deep",
    season: "SW Monsoon",
    color: "#22c55e",
    density: "High 🐟🐟🐟"
  },
  { 
    id: 7, 
    name: "Mannar Ridge", 
    latitude: 8.8000, 
    longitude: 78.5000, 
    fishType: "Snapper", 
    estimatedCatch: "Low", 
    distance: 60,
    depth: "Shallow",
    season: "NE Monsoon",
    color: "#ef4444",
    density: "Low 🐟"
  },
  { 
    id: 8, 
    name: "Eastern EEZ Margin", 
    latitude: 7.8000, 
    longitude: 82.5000, 
    fishType: "Bigeye Tuna", 
    estimatedCatch: "Medium", 
    distance: 130,
    depth: "Very Deep",
    season: "Year-round",
    color: "#eab308",
    density: "Medium 🐟🐟"
  },
];

const getCatchColor = (catch_: string) => {
  switch(catch_) {
    case "High": return "#22c55e";
    case "Medium": return "#eab308";
    case "Low": return "#ef4444";
    default: return "#6b7280";
  }
};

const getSeasonBadge = (season: string) => {
  switch(season) {
    case "NE Monsoon": return "bg-blue-100 text-blue-700";
    case "SW Monsoon": return "bg-indigo-100 text-indigo-700";
    case "Year-round": return "bg-green-100 text-green-700";
    default: return "bg-gray-100 text-gray-700";
  }
};

const MapViewScreen = () => {
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [showZoneList, setShowZoneList] = useState(false);
  const [showZoneDropdown, setShowZoneDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Use Zustand store
  const { selectedZones, addZone, removeZone, clearZones } = useFishingZoneStore();

  const handleZonePress = (zone: any) => {
    setSelectedZone(zone);
  };

  const handleAddZone = () => {
    if (selectedZone) {
      addZone(selectedZone);
      setSelectedZone(null);
    }
  };

  const handleRemoveZone = (zoneId: number) => {
    removeZone(zoneId);
  };

  const handlePlanTrip = () => {
    if (selectedZones.length > 0) {
      router.push('/(root)/(tabs)/fishtripcost/components/TripPlanner');
    }
  };

  const handleViewZones = () => {
    setShowZoneList(true);
  };

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
      {/* Back Button */}
      <SafeAreaView className="absolute top-0 left-0 right-0 z-10 px-4 pt-2">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="bg-white/90 backdrop-blur rounded-full p-3 w-12 h-12 items-center justify-center shadow-lg"
          >
            <Text className="text-xl">←</Text>
          </TouchableOpacity>

          {/* View All Zones Dropdown Button */}
          <TouchableOpacity 
            onPress={handleToggleZoneDropdown}
            className="bg-blue-500/90 backdrop-blur rounded-full px-4 py-3 flex-row items-center shadow-lg"
          >
            <Text className="text-white mr-2">🗺️</Text>
            <Text className="text-white font-semibold">View Zones</Text>
            <Text className="text-white ml-2">{showZoneDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Zone Dropdown List */}
      {showZoneDropdown && (
        <SafeAreaView className="absolute top-16 left-4 right-4 z-10">
          <View className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl max-h-96">
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
                      style={{ backgroundColor: getCatchColor(item.estimatedCatch) + '20' }}
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
                        <Text className="text-xs">
                          {item.estimatedCatch === "High" ? "🐟🐟🐟" : 
                           item.estimatedCatch === "Medium" ? "🐟🐟" : "🐟"}
                        </Text>
                      </View>
                    </View>
                    {selectedZones.find(z => z.id === item.id) && (
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

      {/* Selected Zones Counter and Clear Button */}
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
              {selectedZones.length} Zone{selectedZones.length > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Map Legend */}
      <View className="absolute top-24 right-4 z-10 bg-white/90 backdrop-blur rounded-xl p-3 shadow-lg">
        <Text className="text-xs font-semibold text-gray-500 mb-2">CATCH DENSITY</Text>
        <View className="flex-col gap-1">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
            <Text className="text-xs">High 🐟🐟🐟</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
            <Text className="text-xs">Medium 🐟🐟</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
            <Text className="text-xs">Low 🐟</Text>
          </View>
        </View>
      </View>

      {/* Plan Trip Button - Shows when zones are selected */}
      {selectedZones.length > 0 && (
        <View className="absolute bottom-24 left-4 right-4 z-10">
          <TouchableOpacity
            onPress={handlePlanTrip}
            className="bg-blue-500 rounded-xl py-4 shadow-lg"
            activeOpacity={0.7}
          >
            <Text className="text-white text-center font-semibold text-lg">
              Plan Trip to {selectedZones.length} Zone{selectedZones.length > 1 ? 's' : ''} →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info Banner */}
      <View className="absolute bottom-4 left-4 right-4 z-10">
        <View className="bg-blue-500/90 backdrop-blur rounded-lg px-3 py-2">
          <Text className="text-white text-xs text-center">
            Tap on zones to select multiple fishing locations • Based on NARA data
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
          {/* Harbor Marker - Boat Icon */}
          <Marker 
            coordinate={{ 
              latitude: HARBOR_LOCATION.latitude, 
              longitude: HARBOR_LOCATION.longitude 
            }}
            title={HARBOR_LOCATION.name}
            description="Starting Point"
          >
            <View className="items-center">
              {/* Boat Image or Emoji */}
              <View className="bg-blue-600 rounded-full p-3 border-3 border-white shadow-lg">
                <Text className="text-3xl">🚢</Text>
              </View>
              <View className="bg-blue-600 px-2 py-1 rounded-md mt-1">
                <Text className="text-white text-xs font-bold">Harbor</Text>
              </View>
            </View>
          </Marker>

          {/* Fish Zone Markers with Enhanced Visuals */}
          {FISH_ZONES.map(zone => (
            <React.Fragment key={zone.id}>
              {/* Colored Circle around zone - shows zone area */}
              <Circle
                center={{ latitude: zone.latitude, longitude: zone.longitude }}
                radius={zone.depth === "Very Deep" ? 5000 : zone.depth === "Deep" ? 3500 : 2000}
                strokeColor={getCatchColor(zone.estimatedCatch)}
                strokeWidth={selectedZones.find(z => z.id === zone.id) ? 4 : 2}
                fillColor={selectedZones.find(z => z.id === zone.id) 
                  ? getCatchColor(zone.estimatedCatch) + '40'
                  : getCatchColor(zone.estimatedCatch) + '15'
                }
              />
              
              {/* Fish Schools Pattern - Multiple small fish icons to show density */}
              {zone.estimatedCatch === "High" && (
                <>
                  <Circle
                    center={{ latitude: zone.latitude + 0.01, longitude: zone.longitude + 0.01 }}
                    radius={800}
                    fillColor={getCatchColor(zone.estimatedCatch) + '30'}
                    strokeColor="transparent"
                  />
                  <Circle
                    center={{ latitude: zone.latitude - 0.01, longitude: zone.longitude - 0.01 }}
                    radius={800}
                    fillColor={getCatchColor(zone.estimatedCatch) + '30'}
                    strokeColor="transparent"
                  />
                </>
              )}
              
              {/* Zone Marker - Enhanced Fish Icon */}
              <Marker
                coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                onPress={() => handleZonePress(zone)}
                title={zone.name}
                description={`${zone.fishType} • ${zone.estimatedCatch} density`}
              >
                <View className="items-center">
                  {/* Main Fish Icon with animation effect */}
                  <View 
                    className={`rounded-full p-3 border-3 shadow-xl ${
                      selectedZones.find(z => z.id === zone.id) ? 'border-blue-400' : 'border-white'
                    }`}
                    style={{ 
                      backgroundColor: getCatchColor(zone.estimatedCatch),
                      transform: selectedZones.find(z => z.id === zone.id) ? [{ scale: 1.2 }] : [{ scale: 1 }]
                    }}
                  >
                    <Text className="text-3xl">
                      {selectedZones.find(z => z.id === zone.id) ? '✅' : '🐟'}
                    </Text>
                  </View>
                  
                  {/* Zone Name Label */}
                  <View 
                    className="mt-1 px-2 py-1 rounded-md"
                    style={{ backgroundColor: getCatchColor(zone.estimatedCatch) }}
                  >
                    <Text className="text-white text-xs font-bold" numberOfLines={1}>
                      {zone.name.split(' ')[0]}
                    </Text>
                  </View>
                  
                  {/* Density Indicator */}
                  <View className="bg-white/90 px-1 rounded-full mt-0.5">
                    <Text className="text-xs">
                      {zone.estimatedCatch === "High" ? "🐟🐟🐟" : 
                       zone.estimatedCatch === "Medium" ? "🐟🐟" : "🐟"}
                    </Text>
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
                colors={['#ffffff', '#f8fafc']}
                className="rounded-t-3xl p-6 shadow-2xl"
              >
                {selectedZone && (
                  <>
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-4">
                      <View className="flex-row items-center flex-1">
                        <View 
                          className="w-12 h-12 rounded-full items-center justify-center mr-3"
                          style={{ backgroundColor: getCatchColor(selectedZone.estimatedCatch) + '20' }}
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

                    {/* Season Badge */}
                    <View className="mb-3">
                      <View className={`${getSeasonBadge(selectedZone.season)} px-3 py-1 rounded-full self-start`}>
                        <Text className="text-xs font-medium">Best in {selectedZone.season}</Text>
                      </View>
                    </View>

                    {/* Stats Grid */}
                    <View className="flex-row flex-wrap bg-gray-50 rounded-xl p-3 mb-4">
                      <View className="w-1/2 p-2">
                        <Text className="text-xs text-gray-500">Fish Type</Text>
                        <Text className="text-lg font-semibold text-gray-800">
                          {selectedZone.fishType}
                        </Text>
                      </View>
                      <View className="w-1/2 p-2">
                        <Text className="text-xs text-gray-500">Water Depth</Text>
                        <Text className="text-lg font-semibold text-gray-800">
                          {selectedZone.depth}
                        </Text>
                      </View>
                      <View className="w-1/2 p-2">
                        <Text className="text-xs text-gray-500">Est. Catch</Text>
                        <View className="flex-row items-center">
                          <Text className="text-lg font-semibold text-gray-800 mr-2">
                            {selectedZone.estimatedCatch}
                          </Text>
                          <View 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getCatchColor(selectedZone.estimatedCatch) }}
                          />
                        </View>
                      </View>
                      <View className="w-1/2 p-2">
                        <Text className="text-xs text-gray-500">Density</Text>
                        <Text className="text-lg">
                          {selectedZone.estimatedCatch === "High" ? "🐟🐟🐟" : 
                           selectedZone.estimatedCatch === "Medium" ? "🐟🐟" : "🐟"}
                        </Text>
                      </View>
                    </View>

                    {/* Selection Status */}
                    {selectedZones.find(z => z.id === selectedZone.id) ? (
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

                    {/* Action Buttons */}
                    <View className="flex-row gap-3">
                      <TouchableOpacity 
                        onPress={() => setSelectedZone(null)}
                        className="flex-1 bg-gray-100 rounded-xl py-4"
                      >
                        <Text className="text-center font-semibold text-gray-600">
                          Close
                        </Text>
                      </TouchableOpacity>
                    </View>
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
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View className="flex-row items-center bg-gray-50 rounded-xl p-3 mb-2">
                    <View 
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: getCatchColor(item.estimatedCatch) + '20' }}
                    >
                      <Text className="text-lg">🐟</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-800">{item.name}</Text>
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