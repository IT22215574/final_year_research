import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import useFishingZoneStore from "@/stores/fishingZoneStore";
import useTripStore from "@/stores/tripStore";
import BoatSelectionModal, { Boat } from "@/components/BoatSelectionModal";
import ExternalCostForm, { ExternalCostItem } from "./ExternalCostForm";

import {
  predictTripDatcie,
  optimizeTripDatcie,
  DatciePredictBody,
} from "@/services/tripService";

import { apiFetch } from "@/utils/api";
import {
  getCurrentWeather,
  getWeatherForZones,
  getAverageWeather,
  isWeatherSafeForFishing,
  getWeatherEmoji,
  WeatherData,
} from "@/services/weatherService";

const TripPlanner = () => {
  // Trip Date
  const [tripDate, setTripDate] = useState(new Date());
  const [showTripDateIOS, setShowTripDateIOS] = useState(false);

  // OLD UI fields (keep)
  const [distance, setDistance] = useState("");
  const [engineHP, setEngineHP] = useState("");
  const [duration, setDuration] = useState("");
  const [numberOfDays, setNumberOfDays] = useState("1");
  const [windSpeed, setWindSpeed] = useState("");
  const [waveHeight, setWaveHeight] = useState("");
  const [fuelPrice, setFuelPrice] = useState("350");

  // DATCIE fields
  const [boatMongoId, setBoatMongoId] = useState("");
  const [speed, setSpeed] = useState("10");
  const [crewCount, setCrewCount] = useState("3");
  const [expectedCatch, setExpectedCatch] = useState("120");
  const [marketPrice, setMarketPrice] = useState("550");
  const [mode, setMode] = useState<"island" | "international">("island");

  // Boat UI modal
  const [selectedBoatName, setSelectedBoatName] = useState<string>("");
  const [showBoatModal, setShowBoatModal] = useState(false);

  // ✅ keep selected boat object (from backend modal)
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);

  // ✅ boats list for horizontal carousel
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loadingBoats, setLoadingBoats] = useState(false);

  // 🌊 Weather data state
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(
    null,
  );
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherAutoFilled, setWeatherAutoFilled] = useState(false);

  // ✅ Engine HP slider/list behavior
  const [useEngineHPDropdown, setUseEngineHPDropdown] = useState(true);
  const [selectedEngineHPFromDropdown, setSelectedEngineHPFromDropdown] =
    useState<string>("");

  // Manual external costs
  const [manualExternalCosts, setManualExternalCosts] = useState<
    ExternalCostItem[]
  >([]);

  const { selectedZones, clearZones } = useFishingZoneStore();

  // Store setters
  const setDatcieBody = useTripStore((s) => s.setDatcieBody);
  const setDatciePrediction = useTripStore((s) => s.setDatciePrediction);
  const setDatcieOptimization = useTripStore((s) => s.setDatcieOptimization);

  // Local preview results
  const [predictedFuel, setPredictedFuel] = useState<number | null>(null);
  const [predictedCost, setPredictedCost] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<string[] | null>(null);
  const [riskScore, setRiskScore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  // Fetch boats for horizontal carousel
  const fetchBoats = async () => {
    try {
      setLoadingBoats(true);
      const res = await apiFetch("/api/v1/boats/my", { method: "GET" });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to load boats");
      }

      const data = (await res.json()) as Boat[];
      setBoats(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("TripPlanner fetch boats error:", e);
    } finally {
      setLoadingBoats(false);
    }
  };

  // Load boats on component mount
  useEffect(() => {
    fetchBoats();
  }, []);

  // 🌊 Fetch weather when zones change
  useEffect(() => {
    const fetchWeatherForZones = async () => {
      if (selectedZones.length > 0) {
        setLoadingWeather(true);
        try {
          const weatherData = await getWeatherForZones(selectedZones);
          if (weatherData.length > 0) {
            const avgWeather = getAverageWeather(weatherData);

            const weatherInfo: WeatherData = {
              windSpeed: avgWeather.windSpeed,
              waveHeight: avgWeather.waveHeight,
              timestamp: new Date().toISOString(),
              location: {
                lat: selectedZones[0].latitude || 7.8731,
                lon: selectedZones[0].longitude || 80.7718,
              },
            };

            setCurrentWeather(weatherInfo);

            // Auto-fill weather fields if not manually entered
            if (!windSpeed || !waveHeight || !weatherAutoFilled) {
              setWindSpeed(String(avgWeather.windSpeed));
              setWaveHeight(String(avgWeather.waveHeight));
              setWeatherAutoFilled(true);
            }
          }
        } catch (error) {
          console.error("Failed to fetch weather:", error);
        } finally {
          setLoadingWeather(false);
        }
      }
    };

    fetchWeatherForZones();
  }, [selectedZones]);

  // Compute distance from zones
  useEffect(() => {
    if (selectedZones.length > 0) {
      const totalDist = selectedZones.reduce((sum: number, zone: any) => {
        let zoneDist = 0;
        if (typeof zone.distance === "number") zoneDist = zone.distance;
        else if (typeof zone.distance === "string")
          zoneDist = parseFloat(zone.distance) || 0;
        return sum + zoneDist;
      }, 0);
      setDistance(totalDist.toFixed(2));
    } else {
      setDistance("");
    }
  }, [selectedZones]);

  // ✅ helper: final engine hp
  const getFinalEngineHP = () =>
    useEngineHPDropdown ? selectedEngineHPFromDropdown : engineHP;

  // Trip Date Picker Handler
  const openTripDatePicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: tripDate,
        mode: "date",
        onChange: (_, date) => {
          if (date) setTripDate(date);
        },
      });
    } else {
      setShowTripDateIOS(true);
    }
  };

  // ✅ helper: build slider options
  const engineOptions = useMemo(() => {
    // If your backend boat object already contains options, use them.
    // Change this key to match your backend if needed (engineHPOptions, engineHpOptions, etc.)
    const opts = (selectedBoat as any)?.engineHPOptions as number[] | undefined;
    if (Array.isArray(opts) && opts.length > 0) return opts;

    // Otherwise generate a few options around current HP
    const base = parseInt(
      engineHP || selectedEngineHPFromDropdown || "150",
      10,
    );

    if (!Number.isFinite(base)) return [120, 150, 180, 200];

    const generated = [base - 40, base - 20, base, base + 20, base + 40].filter(
      (n) => n > 0,
    );

    // remove duplicates
    return Array.from(new Set(generated));
  }, [selectedBoat, engineHP, selectedEngineHPFromDropdown]);

  // ✅ NEW: handle select from backend boats
  const handleBoatSelect = (
    boatMongoIdFromModal: string,
    boatName: string,
    defaultEngineHP: number,
    boat?: Boat,
  ) => {
    // ✅ Toggle functionality: if same boat is clicked, unselect it
    if (selectedBoat?._id === boatMongoIdFromModal) {
      // Clear all boat selections
      setSelectedBoatName("");
      setBoatMongoId("");
      setSelectedBoat(null);
      setEngineHP("");
      setSelectedEngineHPFromDropdown("");
      return;
    }

    setSelectedBoatName(boatName);

    // set REAL mongo id automatically
    setBoatMongoId(boatMongoIdFromModal);

    // keep boat object (for engine options if exists)
    setSelectedBoat(boat ?? null);

    // set HP automatically from backend boat
    const hp =
      boat?.engineHorsePower != null
        ? String(boat.engineHorsePower)
        : String(defaultEngineHP);

    setEngineHP(hp);
    setSelectedEngineHPFromDropdown(hp);

    // ✅ IMPORTANT: start in list/slider mode so chips are visible
    setUseEngineHPDropdown(true);

    // auto set mode (if boat has mode)
    if (boat?.mode === "island" || boat?.mode === "international") {
      setMode(boat.mode);
    }

    setShowBoatModal(false);
  };

  // coords from zones (must exist)
  const getStartEndFromZones = () => {
    if (!selectedZones || selectedZones.length === 0) return null;

    const first: any = selectedZones[0];
    const last: any = selectedZones[selectedZones.length - 1];

    const firstLat =
      typeof first?.lat === "number"
        ? first.lat
        : typeof first?.latitude === "number"
          ? first.latitude
          : null;

    const firstLon =
      typeof first?.lon === "number"
        ? first.lon
        : typeof first?.longitude === "number"
          ? first.longitude
          : null;

    const lastLat =
      typeof last?.lat === "number"
        ? last.lat
        : typeof last?.latitude === "number"
          ? last.latitude
          : null;

    const lastLon =
      typeof last?.lon === "number"
        ? last.lon
        : typeof last?.longitude === "number"
          ? last.longitude
          : null;

    if (
      firstLat === null ||
      firstLon === null ||
      lastLat === null ||
      lastLon === null
    ) {
      return null;
    }

    return {
      startLat: firstLat,
      startLon: firstLon,
      endLat: lastLat,
      endLon: lastLon,
    };
  };

  const handleMapPress = () =>
    router.push("/(root)/(tabs)/fishtripcost/mapview");

  const handlePredict = async () => {
    const coords = getStartEndFromZones();

    if (!boatMongoId.trim()) {
      Alert.alert(
        "Boat required",
        "Select a boat from the boat modal first (it will auto-fill Mongo ID).",
      );
      return;
    }

    // ✅ Allow either coordinates OR manual distance
    const hasCoords = coords !== null;
    const hasManualDistance = distance && parseFloat(distance) > 0;

    if (!hasCoords && !hasManualDistance) {
      Alert.alert(
        "Missing Route Information",
        "Please either:\n\n" +
          "1. Select fishing zones on the map, OR\n" +
          "2. Enter distance manually (km)\n\n" +
          "At least one method is required for prediction.",
      );
      return;
    }

    if (!duration || !windSpeed || !waveHeight || !fuelPrice) {
      Alert.alert(
        "Missing Fields",
        "Fill fishing hours, number of days, wind, wave, fuel price.",
      );
      return;
    }

    try {
      setLoading(true);

      const body: DatciePredictBody = {
        boatId: boatMongoId.trim(),
        // ✅ Include coordinates if available
        ...(hasCoords ? coords : {}),
        // ✅ Include manual distance if coordinates not available
        ...(hasCoords ? {} : { distanceKm: parseFloat(distance) }),

        speed: parseFloat(speed || "10"),
        fishingHours: parseFloat(duration),
        numberOfDays: parseInt(numberOfDays || "1", 10),
        crewCount: parseInt(crewCount || "3", 10),

        windSpeed: parseFloat(windSpeed),
        waveHeight: parseFloat(waveHeight),
        fuelPrice: parseFloat(fuelPrice),

        expectedCatch: parseFloat(expectedCatch || "120"),
        marketPrice: parseFloat(marketPrice || "550"),
        mode,
        manualExternalCosts:
          manualExternalCosts.length > 0
            ? manualExternalCosts.map(
                ({
                  name,
                  category,
                  quantity,
                  pricePerUnit,
                  amount,
                  description,
                  icon,
                }) => ({
                  name,
                  category,
                  quantity: quantity || 1,
                  pricePerUnit: pricePerUnit || 0,
                  amount,
                  description,
                  icon,
                }),
              )
            : undefined,
      };

      const res: any = await predictTripDatcie(body);

      // ✅ Validate response before processing
      if (!res || typeof res !== "object") {
        throw new Error("Invalid response from prediction service");
      }

      // ✅ STORE for result screen
      setDatcieBody(body);
      setDatciePrediction(res);

      // Local preview with safe property access
      try {
        setPredictedFuel(res?.fuel?.predictedFuelLiters ?? null);
        setPredictedCost(res?.cost?.predictedTotalCost ?? null);
        setRiskScore(
          res?.profitability?.riskCategory ??
            res?.profitability?.risk ??
            res?.riskCategory ??
            null,
        );
        setRecommendations(
          Array.isArray(res?.recommendations) ? res.recommendations : [],
        );
      } catch (parseError) {
        console.warn(
          "Warning: Error parsing prediction response details:",
          parseError,
        );
        // Continue with navigation even if parsing fails
      }

      router.push("/(root)/(tabs)/fishtripcost/result");
    } catch (error: any) {
      console.error("Prediction error:", error);
      Alert.alert("Error", error?.message || "DATCIE predict failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    const coords = getStartEndFromZones();

    if (!boatMongoId.trim()) {
      Alert.alert("Boat required", "Select a boat first.");
      return;
    }

    // ✅ Allow either coordinates OR manual distance
    const hasCoords = coords !== null;
    const hasManualDistance = distance && parseFloat(distance) > 0;

    if (!hasCoords && !hasManualDistance) {
      Alert.alert(
        "Missing Route Information",
        "Please either select fishing zones on the map OR enter distance manually.",
      );
      return;
    }

    try {
      setLoading(true);

      const body: DatciePredictBody = {
        boatId: boatMongoId.trim(),
        // ✅ Include coordinates if available
        ...(hasCoords ? coords : {}),
        // ✅ Include manual distance if coordinates not available
        ...(hasCoords ? {} : { distanceKm: parseFloat(distance) }),

        // optional speed not passed here so backend will test [8,10,12,14]
        fishingHours: parseFloat(duration || "8"),
        numberOfDays: parseInt(numberOfDays || "1", 10),
        crewCount: parseInt(crewCount || "3", 10),

        windSpeed: parseFloat(windSpeed || "10"),
        waveHeight: parseFloat(waveHeight || "1"),
        fuelPrice: parseFloat(fuelPrice || "350"),

        expectedCatch: parseFloat(expectedCatch || "120"),
        marketPrice: parseFloat(marketPrice || "550"),
        mode,
      };

      const res: any = await optimizeTripDatcie(body);

      // ✅ store optimization too
      setDatcieOptimization(res);

      Alert.alert(
        "Optimization Result",
        `Best speed: ${res?.best?.speed ?? "?"}\nPredicted total: Rs ${Math.round(
          res?.best?.predictedTotalCost ?? 0,
        )}`,
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error?.message || "DATCIE optimize failed");
    } finally {
      setLoading(false);
    }
  };

  const getRiskStyle = (risk: string | null) => {
    switch (risk?.toLowerCase()) {
      case "low":
        return {
          container: "bg-emerald-50 border border-emerald-200",
          text: "text-emerald-700",
          badge: "bg-emerald-100",
        };
      case "medium":
        return {
          container: "bg-amber-50 border border-amber-200",
          text: "text-amber-700",
          badge: "bg-amber-100",
        };
      case "high":
        return {
          container: "bg-rose-50 border border-rose-200",
          text: "text-rose-700",
          badge: "bg-rose-100",
        };
      default:
        return {
          container: "bg-slate-50 border border-slate-200",
          text: "text-slate-700",
          badge: "bg-slate-100",
        };
    }
  };

  const formatDistance = (dist: any): string => {
    if (typeof dist === "number") return dist.toFixed(1);
    if (typeof dist === "string") return parseFloat(dist).toFixed(1);
    return "0.0";
  };

  const hasResults =
    predictedFuel !== null ||
    predictedCost !== null ||
    riskScore ||
    (recommendations && recommendations.length > 0);

  const riskStyle = getRiskStyle(riskScore);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pt-3 pb-3 flex-row justify-between items-center bg-white border-b border-slate-100">
        <View>
          <Text className="text-xl font-bold text-slate-900 tracking-tight">
            Trip Planner
          </Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            DATCIE cost prediction
          </Text>
        </View>

        <View className="flex-row gap-2">
          {selectedZones.length > 0 && (
            <TouchableOpacity
              onPress={clearZones}
              className="border border-rose-200 bg-rose-50 rounded-xl px-3 py-2 flex-row items-center"
              activeOpacity={0.7}
            >
              <Text className="text-rose-500 mr-1.5">🗑️</Text>
              <Text className="text-rose-600 font-medium text-sm">Clear</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleMapPress}
            className="bg-blue-600 rounded-xl px-3 py-2 flex-row items-center"
            activeOpacity={0.7}
          >
            <Text className="text-white mr-1.5">🗺️</Text>
            <Text className="text-white font-semibold text-sm">Map View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Zones */}
      {selectedZones.length > 0 && (
        <View className="bg-blue-600 mx-4 mt-3 rounded-2xl p-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white font-semibold text-sm">
              {selectedZones.length} Zone{selectedZones.length > 1 ? "s" : ""}{" "}
              Selected
            </Text>
            <View className="bg-white/20 rounded-full px-3 py-1">
              <Text className="text-white font-bold text-xs">
                {parseFloat(distance || "0").toFixed(1)} km total
              </Text>
            </View>
          </View>

          {selectedZones.map((zone: any, index: number) => (
            <View
              key={zone.id ?? index}
              className="flex-row items-center mb-2 bg-white/10 rounded-xl px-3 py-2.5"
            >
              <View className="w-7 h-7 rounded-full bg-white/20 items-center justify-center mr-3">
                <Text className="text-white font-bold text-xs">
                  {index + 1}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium text-sm">
                  {zone.name}
                </Text>
                <Text className="text-blue-200 text-xs">
                  {zone.fishType || "Various fish"}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-white font-bold text-sm">
                  {formatDistance(zone.distance)} km
                </Text>
                <Text className="text-blue-200 text-xs">
                  {zone.estimatedCatch || "Medium"} catch
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Input Card */}
        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <View className="flex-row items-center mb-5">
            <View className="w-1.5 h-5 bg-blue-600 rounded-full mr-2.5" />
            <Text className="text-base font-semibold text-slate-800">
              Trip Parameters
            </Text>
          </View>

          {/* Trip Date - NEW! */}
          <View className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center mr-3">
                  <Ionicons name="calendar" size={24} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Trip Date
                  </Text>
                  <Text className="text-lg font-bold text-slate-800">
                    {tripDate.toLocaleDateString("en-LK", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={openTripDatePicker}
                className="bg-blue-600 rounded-xl px-4 py-2.5"
                activeOpacity={0.7}
              >
                <Text className="text-white font-semibold text-sm">Change</Text>
              </TouchableOpacity>
            </View>
          </View>

          {Platform.OS === "ios" && showTripDateIOS && (
            <DateTimePicker
              value={tripDate}
              mode="date"
              display="spinner"
              onChange={(_, date) => {
                setShowTripDateIOS(false);
                if (date) setTripDate(date);
              }}
            />
          )}

          {/* ✅ Horizontal Boat Carousel */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Select Your Boat
              </Text>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setShowBoatModal(true)}
                  className="bg-slate-100 rounded-lg px-3 py-1.5"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-slate-600 font-medium">
                    📋 List View
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/fishtripcost/boats/add-boat")}
                  className="bg-blue-600 rounded-lg px-3 py-1.5"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-white font-medium">
                    + Add Boat
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingBoats ? (
              <View className="bg-slate-50 border border-slate-200 rounded-xl p-8 items-center">
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text className="text-slate-500 text-sm mt-2">
                  Loading boats...
                </Text>
              </View>
            ) : boats.length === 0 ? (
              <View className="bg-slate-50 border border-slate-200 rounded-xl p-6 items-center">
                <Text className="text-slate-600 font-medium">
                  🛥️ No boats found
                </Text>
                <Text className="text-slate-400 text-xs mt-1">
                  Add a boat to get started
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-1"
              >
                <View className="flex-row gap-3 px-1">
                  {boats.map((boat) => {
                    const isSelected = selectedBoat?._id === boat._id;
                    const displayName =
                      boat.boatName ||
                      boat.boatType ||
                      `Boat ${boat._id.slice(-4)}`;
                    const imgUrl =
                      boat.boatImage && API_URL
                        ? `${API_URL}${boat.boatImage}`
                        : null;

                    return (
                      <TouchableOpacity
                        key={boat._id}
                        onPress={() =>
                          handleBoatSelect(
                            boat._id,
                            displayName,
                            boat.engineHorsePower || 150,
                            boat,
                          )
                        }
                        activeOpacity={0.8}
                        className={`w-72 rounded-2xl border p-4 ${isSelected ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200"}`}
                      >
                        {/* Boat Image */}
                        <View className="mb-3">
                          {imgUrl ? (
                            <Image
                              source={{ uri: imgUrl }}
                              className="w-full h-32 rounded-xl"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-full h-32 bg-slate-100 rounded-xl items-center justify-center">
                              <Text className="text-4xl">🛥️</Text>
                              <Text className="text-slate-400 text-xs mt-1">
                                No Image
                              </Text>
                            </View>
                          )}

                          {isSelected && (
                            <View className="absolute top-2 right-2 bg-blue-600 rounded-full w-6 h-6 items-center justify-center">
                              <Text className="text-white text-xs font-bold">
                                ✓
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Boat Info */}
                        <View className="mb-3">
                          <Text
                            className={`font-bold text-base ${isSelected ? "text-blue-900" : "text-slate-900"}`}
                          >
                            {displayName}
                          </Text>
                          <Text className="text-slate-500 text-xs mt-1">
                            ID: {boat._id.slice(-8)}
                          </Text>
                          {boat.specifications && (
                            <Text
                              className="text-slate-600 text-xs mt-1"
                              numberOfLines={2}
                            >
                              {boat.specifications}
                            </Text>
                          )}
                        </View>

                        {/* Specs Row */}
                        <View className="flex-row flex-wrap gap-1.5">
                          {boat.boatType && (
                            <View
                              className={`px-2 py-1 rounded-md ${isSelected ? "bg-blue-100" : "bg-slate-100"}`}
                            >
                              <Text
                                className={`text-xs font-medium ${isSelected ? "text-blue-700" : "text-slate-700"}`}
                              >
                                {boat.boatType}
                              </Text>
                            </View>
                          )}

                          <View
                            className={`px-2 py-1 rounded-md ${isSelected ? "bg-blue-100" : "bg-slate-100"}`}
                          >
                            <Text
                              className={`text-xs font-medium ${isSelected ? "text-blue-700" : "text-slate-700"}`}
                            >
                              {boat.engineHorsePower || "150"} HP
                            </Text>
                          </View>

                          {boat.mode && (
                            <View
                              className={`px-2 py-1 rounded-md ${isSelected ? "bg-blue-100" : "bg-slate-100"}`}
                            >
                              <Text
                                className={`text-xs font-medium ${isSelected ? "text-blue-700" : "text-slate-700"}`}
                              >
                                {boat.mode}
                              </Text>
                            </View>
                          )}

                          {boat.boatLength && (
                            <View
                              className={`px-2 py-1 rounded-md ${isSelected ? "bg-blue-100" : "bg-slate-100"}`}
                            >
                              <Text
                                className={`text-xs font-medium ${isSelected ? "text-blue-700" : "text-slate-700"}`}
                              >
                                L: {boat.boatLength}m
                              </Text>
                            </View>
                          )}

                          {boat.registrationNumber && (
                            <View
                              className={`px-2 py-1 rounded-md ${isSelected ? "bg-blue-100" : "bg-slate-100"}`}
                            >
                              <Text
                                className={`text-xs font-medium ${isSelected ? "text-blue-700" : "text-slate-700"}`}
                              >
                                {boat.registrationNumber}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Learning Factors */}
                        <View className="mt-2 pt-2 border-t border-slate-100">
                          <Text className="text-[10px] text-slate-400 mb-1">
                            LEARNING FACTORS
                          </Text>
                          <View className="flex-row gap-1">
                            <View
                              className={`px-1.5 py-0.5 rounded ${isSelected ? "bg-blue-100" : "bg-slate-50"}`}
                            >
                              <Text
                                className={`text-[10px] font-medium ${isSelected ? "text-blue-600" : "text-slate-600"}`}
                              >
                                Eff:{" "}
                                {(boat.fuelEfficiencyFactor || 1).toFixed(2)}
                              </Text>
                            </View>
                            <View
                              className={`px-1.5 py-0.5 rounded ${isSelected ? "bg-blue-100" : "bg-slate-50"}`}
                            >
                              <Text
                                className={`text-[10px] font-medium ${isSelected ? "text-blue-600" : "text-slate-600"}`}
                              >
                                Deg:{" "}
                                {(boat.engineDegradationFactor || 0).toFixed(2)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Boat Mongo ID (auto) */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Boat Mongo ID (auto)
            </Text>
            <TextInput
              placeholder="Select a boat to auto-fill..."
              value={boatMongoId}
              onChangeText={setBoatMongoId}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />
          </View>

          {/* ✅ Engine HP slider / manual toggle */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Engine HP{" "}
                {getFinalEngineHP() ? (
                  <Text className="text-blue-600 normal-case font-bold">
                    · {getFinalEngineHP()} HP
                  </Text>
                ) : null}
              </Text>

              <TouchableOpacity
                onPress={() => setUseEngineHPDropdown(!useEngineHPDropdown)}
                className="bg-slate-100 rounded-lg px-2.5 py-1"
              >
                <Text className="text-xs text-slate-600 font-medium">
                  {useEngineHPDropdown ? "✏️ Manual" : "📋 List"}
                </Text>
              </TouchableOpacity>
            </View>

            {useEngineHPDropdown ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {engineOptions.map((hp) => (
                    <TouchableOpacity
                      key={hp}
                      onPress={() => {
                        setSelectedEngineHPFromDropdown(String(hp));
                        setEngineHP(String(hp));
                      }}
                      className={`px-4 py-2.5 rounded-xl border ${
                        selectedEngineHPFromDropdown === String(hp)
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-slate-200"
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`font-semibold text-sm ${
                          selectedEngineHPFromDropdown === String(hp)
                            ? "text-white"
                            : "text-slate-700"
                        }`}
                      >
                        {hp} HP
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <TextInput
                placeholder="Enter engine HP"
                keyboardType="decimal-pad"
                value={engineHP}
                onChangeText={(v) => {
                  setEngineHP(v);
                  setSelectedEngineHPFromDropdown(v);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
                placeholderTextColor="#94a3b8"
              />
            )}

            <Text className="text-[11px] text-slate-400 mt-2">
              Tip: choose HP from slider, or switch to Manual to type.
            </Text>
          </View>

          {/* DATCIE Inputs */}
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            DATCIE Inputs
          </Text>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1.5 font-medium">
                Speed (knots)
              </Text>
              <TextInput
                placeholder="10"
                keyboardType="decimal-pad"
                value={speed}
                onChangeText={setSpeed}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
              />
            </View>

            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1.5 font-medium">
                Crew Count
              </Text>
              <TextInput
                placeholder="3"
                keyboardType="decimal-pad"
                value={crewCount}
                onChangeText={setCrewCount}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
              />
            </View>
          </View>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1.5 font-medium">
                Expected Catch (kg)
              </Text>
              <TextInput
                placeholder="120"
                keyboardType="decimal-pad"
                value={expectedCatch}
                onChangeText={setExpectedCatch}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
              />
            </View>

            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1.5 font-medium">
                Market Price (Rs/kg)
              </Text>
              <TextInput
                placeholder="550"
                keyboardType="decimal-pad"
                value={marketPrice}
                onChangeText={setMarketPrice}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
              />
            </View>
          </View>

          {/* Mode */}
          <View className="mb-4">
            <Text className="text-xs text-slate-500 mb-2 font-medium">
              Mode
            </Text>
            <View className="flex-row gap-2">
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

          {/* Route & Conditions */}
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Route & Conditions
          </Text>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs text-slate-500 font-medium">
                  Distance (km)
                </Text>
                {selectedZones.length > 0 && (
                  <Text className="text-[10px] text-blue-600 font-semibold">
                    📍 From Map
                  </Text>
                )}
              </View>
              <TextInput
                placeholder="e.g. 35"
                keyboardType="decimal-pad"
                value={distance}
                onChangeText={setDistance}
                className={`border rounded-xl p-3.5 text-slate-800 ${
                  selectedZones.length > 0
                    ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold"
                    : "bg-slate-50 border-slate-200"
                }`}
              />
              <Text className="text-[10px] text-slate-400 mt-1">
                {selectedZones.length > 0
                  ? "✓ Auto-calculated from map zones"
                  : "💡 Enter manually or select zones on map"}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1.5 font-medium">
                Fishing Hours
              </Text>
              <TextInput
                placeholder="8"
                keyboardType="decimal-pad"
                value={duration}
                onChangeText={setDuration}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
              />
            </View>

            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1.5 font-medium">
                Number of Days
              </Text>
              <TextInput
                placeholder="1"
                keyboardType="decimal-pad"
                value={numberOfDays}
                onChangeText={setNumberOfDays}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
              />
            </View>
          </View>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs text-slate-500 font-medium">
                  Fuel Price (Rs/L)
                </Text>
              </View>
              <TextInput
                placeholder="350"
                keyboardType="decimal-pad"
                value={fuelPrice}
                onChangeText={setFuelPrice}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800"
              />
            </View>

            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs text-slate-500 font-medium">
                  Wind Speed (km/h)
                </Text>
                {loadingWeather && (
                  <ActivityIndicator size="small" color="#3b82f6" />
                )}
                {currentWeather && (
                  <Text className="text-[10px] text-blue-600 font-medium">
                    🌊 Live
                  </Text>
                )}
              </View>
              <TextInput
                placeholder="10"
                keyboardType="decimal-pad"
                value={windSpeed}
                onChangeText={(text) => {
                  setWindSpeed(text);
                  setWeatherAutoFilled(false);
                }}
                className={`border rounded-xl p-3.5 text-slate-800 ${
                  currentWeather && weatherAutoFilled
                    ? "bg-blue-50 border-blue-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              />
            </View>
          </View>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs text-slate-500 font-medium">
                  Wave Height (m)
                </Text>
                {currentWeather && (
                  <Text className="text-[10px] text-slate-500 font-medium">
                    {getWeatherEmoji(
                      currentWeather.windSpeed,
                      currentWeather.waveHeight,
                    )}
                    {isWeatherSafeForFishing(currentWeather)
                      ? " Safe"
                      : " Caution"}
                  </Text>
                )}
              </View>
              <TextInput
                placeholder="1.0"
                keyboardType="decimal-pad"
                value={waveHeight}
                onChangeText={(text) => {
                  setWaveHeight(text);
                  setWeatherAutoFilled(false);
                }}
                className={`border rounded-xl p-3.5 text-slate-800 ${
                  currentWeather && weatherAutoFilled
                    ? "bg-blue-50 border-blue-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              />
            </View>

            {currentWeather && (
              <View className="flex-1">
                <Text className="text-xs text-slate-500 mb-1.5 font-medium">
                  Weather Status
                </Text>
                <View
                  className={`border rounded-xl p-3.5 items-center justify-center ${
                    isWeatherSafeForFishing(currentWeather)
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <Text
                    className={`font-semibold text-sm ${
                      isWeatherSafeForFishing(currentWeather)
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {getWeatherEmoji(
                      currentWeather.windSpeed,
                      currentWeather.waveHeight,
                    )}
                    {isWeatherSafeForFishing(currentWeather)
                      ? " Good"
                      : " Caution"}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs text-slate-500 font-medium">
                Weather Data Source
              </Text>
              {currentWeather && (
                <TouchableOpacity
                  onPress={() => {
                    if (selectedZones.length > 0) {
                      // Refresh weather
                      const fetchWeather = async () => {
                        setLoadingWeather(true);
                        try {
                          const weatherData =
                            await getWeatherForZones(selectedZones);
                          if (weatherData.length > 0) {
                            const avgWeather = getAverageWeather(weatherData);
                            setWindSpeed(String(avgWeather.windSpeed));
                            setWaveHeight(String(avgWeather.waveHeight));
                            setWeatherAutoFilled(true);
                          }
                        } finally {
                          setLoadingWeather(false);
                        }
                      };
                      fetchWeather();
                    }
                  }}
                  className="bg-blue-100 rounded-lg px-2 py-1"
                >
                  <Text className="text-xs text-blue-600 font-medium">
                    🔄 Refresh
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-[11px] text-slate-400">
              {currentWeather
                ? `Live marine weather from OpenMeteo API • Updated: ${new Date(currentWeather.timestamp).toLocaleTimeString()}`
                : "Weather will auto-populate when you select fishing zones"}
            </Text>
          </View>
        </View>

        {/* Manual External Costs */}
        <View className="mb-4">
          <ExternalCostForm
            externalCosts={manualExternalCosts}
            onChange={setManualExternalCosts}
            title="Manual External Costs (Optional)"
          />
        </View>

        {/* Input Card - Actions */}
        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          {/* Predict */}
          <TouchableOpacity
            onPress={handlePredict}
            disabled={loading}
            activeOpacity={0.8}
            className={`rounded-xl py-4 items-center ${
              loading ? "bg-blue-400" : "bg-blue-600"
            }`}
          >
            <Text className="text-white font-bold text-base">
              {loading ? "⏳  Calculating..." : "⚡  Predict Cost (DATCIE)"}
            </Text>
          </TouchableOpacity>

          {/* Optimize */}
          <TouchableOpacity
            onPress={handleOptimize}
            disabled={loading}
            activeOpacity={0.8}
            className={`rounded-xl py-4 items-center mt-3 ${
              loading ? "bg-slate-300" : "bg-slate-900"
            }`}
          >
            <Text className="text-white font-bold text-base">
              {loading ? "⏳  Optimizing..." : "🧠  Optimize Speed"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preview results */}
        {hasResults && (
          <View className="gap-3">
            {riskScore && (
              <View className={`rounded-2xl p-4 ${riskStyle.container}`}>
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`font-bold text-lg capitalize ${riskStyle.text}`}
                  >
                    Risk: {riskScore}
                  </Text>
                  <View className={`${riskStyle.badge} rounded-full px-3 py-1`}>
                    <Text className={`text-xs font-semibold ${riskStyle.text}`}>
                      DATCIE
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <BoatSelectionModal
        visible={showBoatModal}
        onClose={() => setShowBoatModal(false)}
        onSelectBoat={handleBoatSelect}
        selectedBoatMongoId={boatMongoId || undefined}
        onAddBoat={() => router.push("/fishtripcost/boats/add-boat")}
      />
    </SafeAreaView>
  );
};

export default TripPlanner;
