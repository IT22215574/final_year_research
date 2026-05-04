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
  Modal,
} from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();

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
  const [rainMmPerHour, setRainMmPerHour] = useState("0");
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
  const [showRouteModal, setShowRouteModal] = useState(false);

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

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.8.135:5000';

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
              rainMmPerHour: avgWeather.rainMmPerHour,
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
              setRainMmPerHour(String(avgWeather.rainMmPerHour));
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

  const getFinalEngineHPNumber = () => {
    const value = parseFloat(getFinalEngineHP() || "");
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };

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
      const finalEngineHP = getFinalEngineHPNumber();

      const body: DatciePredictBody = {
        boatId: boatMongoId.trim(),
        // ✅ Include coordinates if available
        ...(hasCoords ? coords : {}),

        // Pass the distance directly regardless of whether we used coordinates or manual entry
        distanceKm: parseFloat(distance || "0"),

        speed: parseFloat(speed || "10"),
        fishingHours: parseFloat(duration),
        numberOfDays: parseInt(numberOfDays || "1", 10),
        crewCount: parseInt(crewCount || "3", 10),
        ...(finalEngineHP
          ? { engineHP: finalEngineHP, engineHorsePower: finalEngineHP }
          : {}),

        windSpeed: parseFloat(windSpeed),
        waveHeight: parseFloat(waveHeight),
        rainMmPerHour: parseFloat(rainMmPerHour || "0"),
        fuelPrice: parseFloat(fuelPrice),

        expectedCatch: parseFloat(expectedCatch || "120"),
        marketPrice: parseFloat(marketPrice || "550"),
        mode,
        manualExternalCosts:
          manualExternalCosts.length > 0
            ? manualExternalCosts.map(
                ({ name, category, amount, description }) => ({
                  name,
                  category,
                  amount,
                  description,
                  source: "manual" as const,
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
      const finalEngineHP = getFinalEngineHPNumber();

      const body: DatciePredictBody = {
        boatId: boatMongoId.trim(),
        // ✅ Include coordinates if available
        ...(hasCoords ? coords : {}),

        // Pass the distance directly regardless of whether we used coordinates or manual entry
        distanceKm: parseFloat(distance || "0"),

        // optional speed not passed here so backend will test [8,10,12,14]
        fishingHours: parseFloat(duration || "8"),
        numberOfDays: parseInt(numberOfDays || "1", 10),
        crewCount: parseInt(crewCount || "3", 10),
        ...(finalEngineHP
          ? { engineHP: finalEngineHP, engineHorsePower: finalEngineHP }
          : {}),

        windSpeed: parseFloat(windSpeed || "10"),
        waveHeight: parseFloat(waveHeight || "1"),
        rainMmPerHour: parseFloat(rainMmPerHour || "0"),
        fuelPrice: parseFloat(fuelPrice || "350"),

        expectedCatch: parseFloat(expectedCatch || "120"),
        marketPrice: parseFloat(marketPrice || "550"),
        mode,
        manualExternalCosts:
          manualExternalCosts.length > 0
            ? manualExternalCosts.map(
                ({ name, category, amount, description }) => ({
                  name,
                  category,
                  amount,
                  description,
                  source: "manual" as const,
                }),
              )
            : undefined,
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
  const routeDistanceKm = Number.parseFloat(distance || "0") || 0;
  const expectedRevenue =
    (Number.parseFloat(expectedCatch || "0") || 0) *
    (Number.parseFloat(marketPrice || "0") || 0);
  const weatherSeverityPreview = useMemo(() => {
    const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
    const windN = clamp01((Number.parseFloat(windSpeed || "0") || 0) / 60);
    const waveN = clamp01((Number.parseFloat(waveHeight || "0") || 0) / 4);
    const rainN = clamp01((Number.parseFloat(rainMmPerHour || "0") || 0) / 25);
    return clamp01(windN * 0.4 + waveN * 0.45 + rainN * 0.15);
  }, [windSpeed, waveHeight, rainMmPerHour]);
  const weatherState = currentWeather
    ? isWeatherSafeForFishing(currentWeather)
      ? {
          label: "Good",
          container: "bg-emerald-50 border-emerald-200",
          text: "text-emerald-700",
          icon: "shield-checkmark" as const,
        }
      : {
          label: "Caution",
          container: "bg-amber-50 border-amber-200",
          text: "text-amber-700",
          icon: "warning" as const,
        }
    : {
        label: "Manual",
        container: "bg-slate-50 border-slate-200",
        text: "text-slate-600",
        icon: "cloud-outline" as const,
      };
  const scrollBottomPadding =
    Platform.OS === "web" ? 32 : Math.max(128, 96 + insets.bottom);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-4 pt-3 pb-4 bg-white border-b border-slate-100">
        <View className="flex-row justify-between items-center">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-bold text-slate-950 tracking-tight">
              Trip Planner
            </Text>
            <Text className="text-xs text-slate-500 mt-1">
              Boat-wise fuel, route weather, and cost prediction
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleMapPress}
            className="bg-blue-600 rounded-2xl px-4 py-3 flex-row items-center"
            activeOpacity={0.75}
          >
            <Ionicons name="map" size={17} color="#ffffff" />
            <Text className="text-white font-semibold text-sm ml-2">Map</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row mt-4 gap-2">
          <SummaryChip
            icon="boat"
            label={selectedBoatName || "No boat"}
            value={selectedBoat?.boatType || "Select"}
          />
          <TouchableOpacity
            className="flex-1"
            activeOpacity={0.75}
            onPress={() =>
              selectedZones.length > 0
                ? setShowRouteModal(true)
                : handleMapPress()
            }
          >
            <SummaryChip
              icon="map"
              label={`${routeDistanceKm.toFixed(1)} km`}
              value={selectedZones.length > 0 ? "Route" : "Select route"}
            />
          </TouchableOpacity>
          <SummaryChip
            icon={weatherState.icon}
            label={`WSI ${(weatherSeverityPreview * 100).toFixed(0)}%`}
            value={weatherState.label}
          />
        </View>

        <View className="flex-row gap-2 mt-3">
          {selectedZones.length > 0 && (
            <TouchableOpacity
              onPress={clearZones}
              className="border border-rose-200 bg-rose-50 rounded-xl px-3 py-2 flex-row items-center"
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={15} color="#ef4444" />
              <Text className="text-rose-600 font-medium text-sm ml-1.5">
                Clear
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setShowBoatModal(true)}
            className="bg-slate-100 rounded-xl px-3 py-2 flex-row items-center"
            activeOpacity={0.7}
          >
            <Ionicons name="list" size={15} color="#475569" />
            <Text className="text-slate-600 font-semibold text-sm ml-1.5">
              Boats
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
        scrollIndicatorInsets={{ bottom: scrollBottomPadding }}
      >
        {/* Input Card */}
        <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <SectionHeader
            icon="compass"
            title="Trip Setup"
            subtitle="Choose boat, route, operating plan, and live weather"
          />

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
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
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

          {selectedBoat && (
            <View className="mb-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <View className="flex-row items-center">
                <View className="w-11 h-11 rounded-xl bg-blue-600 items-center justify-center mr-3">
                  <Ionicons name="boat" size={21} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-blue-950 font-bold text-base">
                    {selectedBoatName}
                  </Text>
                  <Text className="text-blue-700 text-xs mt-0.5">
                    {selectedBoat.boatType || "Boat type"} •{" "}
                    {getFinalEngineHP() || selectedBoat.engineHorsePower || "-"}{" "}
                    HP • {mode}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowBoatModal(true)}
                  className="bg-white rounded-xl px-3 py-2"
                  activeOpacity={0.75}
                >
                  <Text className="text-blue-700 text-xs font-bold">
                    Change
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Boat Mongo ID (auto) */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Boat Link
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

          <MiniSectionTitle icon="speedometer" title="Operating Plan" />

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

          <MiniSectionTitle icon="cloudy" title="Route & Conditions" />

          <View className="flex-row flex-wrap justify-between">
            <PlannerField
              label="Distance"
              unit="km"
              value={distance}
              onChangeText={setDistance}
              placeholder="35"
              badge={selectedZones.length > 0 ? "From map" : undefined}
              helper={
                selectedZones.length > 0
                  ? "Auto-calculated from route"
                  : "Enter manually or select route"
              }
              highlighted={selectedZones.length > 0}
            />

            <PlannerField
              label="Fishing time"
              unit="hours"
              value={duration}
              onChangeText={setDuration}
              placeholder="8"
            />

            <PlannerField
              label="Trip length"
              unit="days"
              value={numberOfDays}
              onChangeText={setNumberOfDays}
              placeholder="1"
            />

            <PlannerField
              label="Fuel price"
              unit="Rs/L"
              value={fuelPrice}
              onChangeText={setFuelPrice}
              placeholder="350"
            />

            <PlannerField
              label="Wind speed"
              unit="km/h"
              value={windSpeed}
              onChangeText={(text) => {
                setWindSpeed(text);
                setWeatherAutoFilled(false);
              }}
              placeholder="10"
              badge={currentWeather ? "Live" : undefined}
              loading={loadingWeather}
              highlighted={!!currentWeather && weatherAutoFilled}
            />

            <PlannerField
              label="Wave height"
              unit="m"
              value={waveHeight}
              onChangeText={(text) => {
                setWaveHeight(text);
                setWeatherAutoFilled(false);
              }}
              placeholder="1.0"
              badge={
                currentWeather
                  ? isWeatherSafeForFishing(currentWeather)
                    ? "Safe"
                    : "Caution"
                  : undefined
              }
              highlighted={!!currentWeather && weatherAutoFilled}
            />

            <PlannerField
              label="Rain"
              unit="mm/h"
              value={rainMmPerHour}
              onChangeText={(text) => {
                setRainMmPerHour(text);
                setWeatherAutoFilled(false);
              }}
              placeholder="0"
              highlighted={!!currentWeather && weatherAutoFilled}
            />
          </View>

          <View
            className={`mb-5 border rounded-2xl p-4 ${weatherState.container}`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 pr-2">
                <View className="w-10 h-10 rounded-xl bg-white items-center justify-center mr-3">
                  <Ionicons
                    name={weatherState.icon}
                    size={20}
                    color={
                      weatherState.label === "Good"
                        ? "#047857"
                        : weatherState.label === "Caution"
                          ? "#b45309"
                          : "#475569"
                    }
                  />
                </View>
                <View className="flex-1">
                  <Text className={`font-bold text-sm ${weatherState.text}`}>
                    Weather {weatherState.label} • WSI{" "}
                    {(weatherSeverityPreview * 100).toFixed(0)}%
                  </Text>
                  <Text className="text-slate-500 text-xs mt-0.5">
                    Wind {windSpeed || "-"} km/h • Wave {waveHeight || "-"} m •
                    Rain {rainMmPerHour || "0"} mm/h
                  </Text>
                </View>
              </View>

              {currentWeather ? (
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
                            setRainMmPerHour(String(avgWeather.rainMmPerHour));
                            setWeatherAutoFilled(true);
                          }
                        } finally {
                          setLoadingWeather(false);
                        }
                      };
                      fetchWeather();
                    }
                  }}
                  className="bg-white rounded-xl px-3 py-2"
                  activeOpacity={0.75}
                >
                  <Ionicons name="refresh" size={16} color="#2563eb" />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text className="text-[11px] text-slate-500 mt-3">
              {currentWeather
                ? `Forecast wind/rain + marine wave data • Updated ${new Date(currentWeather.timestamp).toLocaleTimeString()}`
                : "Select map zones for route weather, or enter weather manually."}
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
          <SectionHeader
            icon="analytics"
            title="Prediction Actions"
            subtitle="Run cost forecast or compare speed options"
          />
          {/* Predict */}
          <TouchableOpacity
            onPress={handlePredict}
            disabled={loading}
            activeOpacity={0.8}
            className={`rounded-2xl py-4 px-4 flex-row items-center justify-center ${
              loading ? "bg-blue-400" : "bg-blue-600"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Ionicons name="flash" size={18} color="#ffffff" />
            )}
            <Text className="text-white font-bold text-base ml-2">
              {loading ? "Calculating..." : "Predict Cost"}
            </Text>
          </TouchableOpacity>

          {/* Optimize */}
          <TouchableOpacity
            onPress={handleOptimize}
            disabled={loading}
            activeOpacity={0.8}
            className={`rounded-2xl py-4 px-4 flex-row items-center justify-center mt-3 ${
              loading ? "bg-slate-300" : "bg-slate-900"
            }`}
          >
            <Ionicons name="options" size={18} color="#ffffff" />
            <Text className="text-white font-bold text-base ml-2">
              {loading ? "Optimizing..." : "Optimize Speed"}
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

      <Modal
        visible={showRouteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRouteModal(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setShowRouteModal(false)}
          />

          <View
            className="bg-white rounded-t-3xl px-4 pt-4"
            style={{ paddingBottom: Math.max(24, insets.bottom + 16) }}
          >
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-4" />

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-11 h-11 rounded-2xl bg-blue-50 items-center justify-center mr-3">
                  <Ionicons name="map" size={21} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-slate-950">
                    Selected Route
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    {selectedZones.length} zone
                    {selectedZones.length === 1 ? "" : "s"} selected
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowRouteModal(false)}
                className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-2 mb-4">
              <View className="flex-1 bg-blue-50 border border-blue-100 rounded-2xl p-3">
                <Text className="text-[11px] text-blue-600 font-semibold">
                  Distance
                </Text>
                <Text className="text-blue-950 font-bold text-base mt-1">
                  {routeDistanceKm.toFixed(1)} km
                </Text>
              </View>
              <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                <Text className="text-[11px] text-slate-500 font-semibold">
                  WSI
                </Text>
                <Text className="text-slate-950 font-bold text-base mt-1">
                  {(weatherSeverityPreview * 100).toFixed(0)}%
                </Text>
              </View>
              <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                <Text className="text-[11px] text-slate-500 font-semibold">
                  Boat
                </Text>
                <Text
                  className="text-slate-950 font-bold text-base mt-1"
                  numberOfLines={1}
                >
                  {selectedBoat?.boatType || "None"}
                </Text>
              </View>
            </View>

            <View className="max-h-64 mb-4">
              {selectedZones.length > 0 ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="gap-2">
                    {selectedZones.map((zone: any, index: number) => {
                      const zoneName =
                        zone.name ||
                        zone.zoneName ||
                        zone.title ||
                        `Zone ${index + 1}`;
                      const zoneDistance =
                        typeof zone.distance === "number"
                          ? zone.distance
                          : Number.parseFloat(zone.distance || "0") || 0;

                      return (
                        <View
                          key={`${zoneName}-${index}`}
                          className="flex-row items-center bg-slate-50 border border-slate-100 rounded-2xl p-3"
                        >
                          <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center mr-3">
                            <Text className="text-white text-xs font-bold">
                              {index + 1}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-slate-900 font-semibold text-sm"
                              numberOfLines={1}
                            >
                              {zoneName}
                            </Text>
                            <Text className="text-slate-500 text-xs mt-0.5">
                              {zoneDistance.toFixed(1)} km
                            </Text>
                          </View>
                          <Ionicons
                            name="location-outline"
                            size={18}
                            color="#64748b"
                          />
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : (
                <View className="bg-slate-50 border border-slate-100 rounded-2xl p-5 items-center">
                  <Ionicons name="map-outline" size={28} color="#94a3b8" />
                  <Text className="text-slate-600 font-semibold mt-2">
                    No route selected
                  </Text>
                  <Text className="text-slate-400 text-xs mt-1">
                    Open the map and choose fishing zones
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row gap-2">
              {selectedZones.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    clearZones();
                    setShowRouteModal(false);
                  }}
                  className="border border-rose-200 bg-rose-50 rounded-2xl px-4 py-3 flex-row items-center justify-center"
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash-outline" size={17} color="#ef4444" />
                  <Text className="text-rose-600 font-bold text-sm ml-2">
                    Clear
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => {
                  setShowRouteModal(false);
                  handleMapPress();
                }}
                className="flex-1 bg-blue-600 rounded-2xl px-4 py-3 flex-row items-center justify-center"
                activeOpacity={0.8}
              >
                <Ionicons name="navigate" size={17} color="#ffffff" />
                <Text className="text-white font-bold text-sm ml-2">
                  Open Map
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

const SummaryChip = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 min-h-[70px]">
    <View className="flex-row items-center mb-1.5">
      <Ionicons name={icon} size={15} color="#2563eb" />
      <Text className="text-[11px] text-slate-500 font-semibold ml-1.5">
        {value}
      </Text>
    </View>
    <Text className="text-slate-900 font-bold text-sm" numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle: string;
}) => (
  <View className="flex-row items-center mb-5">
    <View className="w-10 h-10 rounded-2xl bg-blue-50 items-center justify-center mr-3">
      <Ionicons name={icon} size={19} color="#2563eb" />
    </View>
    <View className="flex-1">
      <Text className="text-base font-bold text-slate-900">{title}</Text>
      <Text className="text-xs text-slate-500 mt-0.5">{subtitle}</Text>
    </View>
  </View>
);

const MiniSectionTitle = ({ icon, title }: { icon: any; title: string }) => (
  <View className="flex-row items-center mb-3 mt-1">
    <Ionicons name={icon} size={15} color="#64748b" />
    <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-2">
      {title}
    </Text>
  </View>
);

const PlannerField = ({
  label,
  unit,
  value,
  onChangeText,
  placeholder,
  badge,
  helper,
  highlighted = false,
  loading = false,
}: {
  label: string;
  unit: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  badge?: string;
  helper?: string;
  highlighted?: boolean;
  loading?: boolean;
}) => (
  <View style={{ width: "48%", marginBottom: 12 }}>
    <View className="min-h-[34px] mb-1.5 justify-end">
      <View className="flex-row items-center justify-between">
        <Text
          className="text-xs text-slate-500 font-semibold"
          numberOfLines={1}
        >
          {label}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#2563eb" />
        ) : badge ? (
          <View className="bg-blue-50 rounded-full px-2 py-0.5 ml-1">
            <Text className="text-[10px] text-blue-600 font-bold">{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text className="text-[10px] text-slate-400 mt-0.5" numberOfLines={1}>
        {unit}
      </Text>
    </View>
    <TextInput
      placeholder={placeholder}
      keyboardType="decimal-pad"
      value={value}
      onChangeText={onChangeText}
      className={`border rounded-xl px-3 py-3.5 text-slate-800 ${
        highlighted
          ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold"
          : "bg-slate-50 border-slate-200"
      }`}
      placeholderTextColor="#94a3b8"
    />
    {helper ? (
      <Text className="text-[10px] text-slate-400 mt-1" numberOfLines={1}>
        {helper}
      </Text>
    ) : null}
  </View>
);

export default TripPlanner;
