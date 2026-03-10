// (screens)/QualityGrading.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { HEADER_GRADIENT } from "@/constants";
import {
  loadModels,
  runFishPipeline,
} from "@/utils/fish_quality_utils/runFishPipeline";
import type { PredictionResult } from "@/utils/fish_quality_utils/fishTypes";
import FishWeightCard from "@/components/FishWeightCard";
import { useGradingRecordStore } from "@/stores/gradingRecordStore";

// ── Measurement system imports ───────────────────────────────────────────────
import type {
  CalibrationData,
  LinearMeasurement,
  FishMeasurements,
} from "@/types/measurement";
import MeasurementCalibrationModal from "@/components/MeasurementCalibrationModal";
import FishMeasurementModal from "@/components/FishMeasurementModal";
import MeasurementResultsCard from "@/components/MeasurementResultsCard";
import MeasurementInstructions from "@/components/MeasurementInstructions";
import { buildFishMeasurements } from "@/utils/measurementUtils";
import { resolveSpecies, getSizeCategoryForSpecies } from "@/utils/fishWeight";

/** Species that support quality grading (match labels from the model exactly) */
const GRADABLE_SPECIES = ["tuna", "makerel"];

// ── Fish name dictionary (model label → display names) ──────────────────────
const FISH_NAMES: Record<
  string,
  { english: string; sinhala: string; romanized: string }
> = {
  tuna: { english: "Skipjack Tuna", sinhala: "බලයා", romanized: "Balaya" },
  makerel: { english: "Shortfin Scad", sinhala: "ලින්නා", romanized: "Linna" },
};

const getFishName = (label?: string | null) => {
  const key = (label ?? "").toLowerCase().trim();
  return (
    FISH_NAMES[key] ?? {
      english: label ?? "Unknown",
      sinhala: "",
      romanized: "",
    }
  );
};

const gradeColor = (grade?: string | null) => {
  if (grade === "A") return "#27ae60";
  if (grade === "B") return "#f39c12";
  if (grade === "C") return "#e74c3c";
  return "#95a5a6";
};

const gradeDescription = (grade?: string | null) => {
  if (grade === "A") return "Excellent freshness — premium quality";
  if (grade === "B") return "Good freshness — acceptable quality";
  if (grade === "C") return "Poor freshness — use promptly";
  return "Grade unavailable";
};

/** Icon, colour and title for each per-image validation failure status. */
const VALIDATION_STATUS_UI: Record<
  string,
  { icon: string; color: string; title: string }
> = {
  no_fish: {
    icon: "no-photography",
    color: "#e74c3c",
    title: "No Fish Detected",
  },
  invalid_pair: {
    icon: "broken-image",
    color: "#e74c3c",
    title: "Invalid Image Pair",
  },
  species_mismatch: {
    icon: "compare-arrows",
    color: "#f39c12",
    title: "Species Mismatch",
  },
  unknown_species: {
    icon: "help-outline",
    color: "#f39c12",
    title: "Unknown Species",
  },
  unsupported_species: {
    icon: "block",
    color: "#f39c12",
    title: "Unsupported Species",
  },
  low_confidence: {
    icon: "warning",
    color: "#f39c12",
    title: "Low Confidence",
  },
};

export default function QualityGrading() {
  const router = useRouter();

  const [leftImage, setLeftImage] = useState<string | null>(null);
  const [rightImage, setRightImage] = useState<string | null>(null);
  const [leftName, setLeftName] = useState("No image selected");
  const [rightName, setRightName] = useState("No image selected");

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Preparing…");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [predError, setPredError] = useState<string | null>(null);

  const [apiStatus, setApiStatus] = useState<
    "idle" | "checking" | "ok" | "error"
  >("idle");
  const [apiError, setApiError] = useState<string | null>(null);

  const [showDetails, setShowDetails] = useState(false);

  // ── Measurement state ──────────────────────────────────────────────────────
  const [showCalibration, setShowCalibration] = useState(false);
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [fishMeasurements, setFishMeasurements] =
    useState<FishMeasurements | null>(null);

  // ── API health check ───────────────────────────────────────────────────────
  const checkApi = useCallback(async () => {
    setApiStatus("checking");
    setApiError(null);
    try {
      const ok = await loadModels();
      setApiStatus(ok ? "ok" : "error");
      if (!ok) setApiError("Backend models not loaded.");
    } catch (e: any) {
      setApiStatus("error");
      setApiError(e?.message ?? "Cannot reach backend.");
    }
  }, []);

  // ── Image pickers ──────────────────────────────────────────────────────────
  const openGallery = async (side: "left" | "right") => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Gallery access is needed.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92,
    });
    if (!res.canceled && res.assets.length > 0) {
      const asset = res.assets[0];
      const name = asset.fileName ?? asset.uri.split("/").pop() ?? "image";
      if (side === "left") {
        setLeftImage(asset.uri);
        setLeftName(name);
      } else {
        setRightImage(asset.uri);
        setRightName(name);
      }
    }
  };

  const openCamera = async (side: "left" | "right") => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Camera access is needed.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.92 });
    if (!res.canceled && res.assets.length > 0) {
      const asset = res.assets[0];
      const name = asset.fileName ?? `photo_${side}.jpg`;
      if (side === "left") {
        setLeftImage(asset.uri);
        setLeftName(name);
      } else {
        setRightImage(asset.uri);
        setRightName(name);
      }
    }
  };

  const pickImage = (side: "left" | "right") =>
    Alert.alert("Select Image", `Choose source for ${side} image`, [
      { text: "Camera", onPress: () => openCamera(side) },
      { text: "Gallery", onPress: () => openGallery(side) },
      { text: "Cancel", style: "cancel" },
    ]);

  // ── Predict ────────────────────────────────────────────────────────────────
  const canPredict =
    !!leftImage && !!rightImage && !loading && apiStatus !== "error";

  const predict = async () => {
    if (!leftImage || !rightImage) return;
    setLoading(true);
    setPredError(null);
    setResult(null);
    setLoadingMsg("Running stage 1 — Fish detector…");
    try {
      const r = await runFishPipeline(leftImage, rightImage, {
        useTTA: true,
        onProgress: (msg: string) => setLoadingMsg(msg),
      });

      // ── Per-image validation failures from backend ───────────────────────
      const valFailures = [
        "no_fish",
        "invalid_pair",
        "species_mismatch",
        "unknown_species",
        "unsupported_species",
      ];
      if (
        r.validationStatus &&
        valFailures.includes(r.validationStatus)
      ) {
        setResult(r);
        return; // validation failure card will render in the UI
      }

      // ── Pair mismatch check (backward-compat fallback) ───────────────────
      if (r.isFish && r.pairValidation && !r.pairValidation.matched) {
        const leftDisplay = getFishName(r.pairValidation.leftLabel).english;
        const rightDisplay = getFishName(r.pairValidation.rightLabel).english;
        setResult(r);
        Alert.alert(
          "⚠️ Image Mismatch",
          `The left and right images appear to be different species:\n\n🐟 Left:   ${leftDisplay}\n🐟 Right:  ${rightDisplay}\n\nGrading requires both images to be of the same fish. Please try again with matching images.`,
          [{ text: "Got it" }],
        );
        return;
      }

      // ── Species gate ─────────────────────────────────────────────────────
      if (r.isFish && r.species) {
        const speciesLower = r.species.toLowerCase().trim();
        if (!GRADABLE_SPECIES.includes(speciesLower)) {
          setResult(r); // still store so user can see the species name
          Alert.alert(
            "Not Supported Yet",
            `Quality grading is only available for:\n\n• Skipjack Tuna (බලයා · Balaya)\n• Shortfin Scad (ලිනා · Linna)\n\nDetected: ${getFishName(r.species).english}${getFishName(r.species).sinhala ? ` (${getFishName(r.species).sinhala})` : ""}`,
            [{ text: "OK" }],
          );
          return;
        }
      }

      setResult(r);
    } catch (e: any) {
      setPredError(e?.message ?? "Prediction failed.");
    } finally {
      setLoading(false);
      setLoadingMsg("Preparing…");
    }
  };

  const { save: saveRecord, savingRecord } = useGradingRecordStore();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveResult = useCallback(async () => {
    if (!result || !isGradable) return;
    try {
      const names = getFishName(result.species);
      const speciesKey = resolveSpecies(result.species);

      // Build notes including measurement data if available
      let notes = "";
      if (fishMeasurements) {
        const m = fishMeasurements;
        notes += `Length: ${m.length.valueCm} cm (${m.length.confidence} conf.)`;
        if (m.girth) {
          notes += ` | Girth: ${m.girth.valueCm} cm (${m.girth.confidence} conf.)`;
        }
        notes += ` | Weight: ${m.weightEstimate.valueKg} kg (${m.weightEstimate.method})`;
        if (m.weightEstimate.sizeCategory) {
          notes += ` | Size: ${m.weightEstimate.sizeCategory}`;
        }
        notes += ` | Calibration: ${m.calibration.pixelsPerCm.toFixed(1)} px/cm`;
      }

      // ── Build measurement payload fields ─────────────────────────────────
      // Measured length and estimated weight are stored for future
      // reporting and analytics.
      const measuredLengthCm = fishMeasurements?.length.valueCm;
      const estimatedWeightKg = fishMeasurements?.weightEstimate.valueKg;
      const estimatedWeightGrams = estimatedWeightKg != null
        ? parseFloat((estimatedWeightKg * 1000).toFixed(1))
        : undefined;
      const measurementMethod = fishMeasurements?.weightEstimate.method;
      const measurementConfidence = fishMeasurements?.weightEstimate.confidence;

      // Size category is only for Skipjack Tuna — based on estimated weight thresholds
      const sizeCategory = getSizeCategoryForSpecies(
        speciesKey,
        estimatedWeightKg ?? null,
      );

      await saveRecord({
        fishSpecies: result.species ?? undefined,
        fishName: names.english,
        predictedGrade: result.grade ?? undefined,
        gradeConfidence: result.gradeConfidence,
        speciesConfidence: result.speciesConfidence,
        imageUris: [leftImage, rightImage].filter(Boolean) as string[],
        notes: notes || undefined,
        measuredLengthCm,
        estimatedWeightKg,
        estimatedWeightGrams,
        sizeCategory,
        measurementMethod,
        measurementConfidence,
      });
      Alert.alert("Saved!", "Grading result saved to your history.");
      setSaveSuccess(true);
    } catch (e: any) {
      Alert.alert("Save Failed", e?.message ?? "Could not save result.");
    }
  }, [result, leftImage, rightImage, saveRecord, fishMeasurements]);

  const reset = () => {
    setLeftImage(null);
    setRightImage(null);
    setLeftName("No image selected");
    setRightName("No image selected");
    setResult(null);
    setPredError(null);
    setSaveSuccess(false);
    setCalibration(null);
    setFishMeasurements(null);
  };

  // ── Measurement handlers ───────────────────────────────────────────────────
  const handleStartMeasurement = useCallback(() => {
    if (!calibration) {
      setShowCalibration(true);
    } else {
      setShowMeasurement(true);
    }
  }, [calibration]);

  const handleCalibrated = useCallback((cal: CalibrationData) => {
    setCalibration(cal);
    setShowCalibration(false);
    // Immediately open measurement modal after calibration
    setShowMeasurement(true);
  }, []);

  const handleMeasurementComplete = useCallback(
    (length: LinearMeasurement, girth?: LinearMeasurement) => {
      if (!result?.species) return;
      const speciesKey = resolveSpecies(result.species);
      if (!speciesKey || !calibration) return;

      const measurements = buildFishMeasurements(
        calibration,
        length,
        speciesKey,
        girth
      );
      setFishMeasurements(measurements);
      setShowMeasurement(false);
    },
    [result, calibration]
  );

  const handleRecalibrate = useCallback(() => {
    setCalibration(null);
    setFishMeasurements(null);
    setShowCalibration(true);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const apiStatusColor =
    apiStatus === "ok"
      ? "#27ae60"
      : apiStatus === "error"
        ? "#e74c3c"
        : apiStatus === "checking"
          ? "#f39c12"
          : "#95a5a6";

  const apiStatusText =
    apiStatus === "ok"
      ? "Backend Ready"
      : apiStatus === "error"
        ? "Backend Offline"
        : apiStatus === "checking"
          ? "Checking…"
          : "Not checked";

  const isGradable =
    result?.isFish &&
    GRADABLE_SPECIES.includes((result.species ?? "").toLowerCase().trim());

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={["left", "right"]}>
      {/* Header - No top edge to avoid double padding */}
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.header}
      ></LinearGradient>
      <View className="p-4">
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.push("/Quality")}
        >
          <MaterialIcons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <View style={s.statusContainer}>
          <View style={[s.statusDot, { backgroundColor: apiStatusColor }]} />
          <Text style={[s.statusText, { color: apiStatusColor }]}>
            {apiStatusText}
          </Text>
          {(apiStatus === "idle" || apiStatus === "error") && (
            <TouchableOpacity onPress={checkApi} style={s.retryBtn}>
              <MaterialIcons name="refresh" size={12} color="#fff" />
              <Text style={s.retryText}>
                {apiStatus === "idle" ? "Check" : "Retry"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {apiStatus === "error" && apiError && (
          <Text style={s.apiErrText}>{apiError}</Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={apiStatus === "checking"}
            onRefresh={checkApi}
          />
        }
      >
        {/* ── Supported species notice ── */}
        <View style={s.noticeBox}>
          <MaterialIcons name="info-outline" size={16} color="#27ae60" />
          <Text style={s.noticeText}>
            Grading is available for <Text style={s.noticeBold}>Tuna</Text> and{" "}
            <Text style={s.noticeBold}>Mackerel</Text> only. Other species will
            show an alert.
          </Text>
        </View>

        {/* ── Image pickers ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Select Images</Text>
          <View style={s.imageRow}>
            {(["left", "right"] as const).map((side) => {
              const uri = side === "left" ? leftImage : rightImage;
              return (
                <View key={side} style={s.slotWrapper}>
                  <TouchableOpacity
                    style={s.imageSlot}
                    onPress={() => pickImage(side)}
                  >
                    {uri ? (
                      <Image source={{ uri }} style={s.thumb} />
                    ) : (
                      <View style={s.thumbEmpty}>
                        <MaterialIcons
                          name="add-photo-alternate"
                          size={34}
                          color="#95a5a6"
                        />
                        <Text style={s.thumbLabel}>Tap to add</Text>
                      </View>
                    )}
                    <View style={s.slotBadge}>
                      <Text style={s.slotBadgeText}>{side.toUpperCase()}</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={s.slotActions}>
                    <TouchableOpacity
                      style={s.slotBtn}
                      onPress={() => openCamera(side)}
                    >
                      <MaterialIcons
                        name="photo-camera"
                        size={16}
                        color="#27ae60"
                      />
                      <Text style={[s.slotBtnText, { color: "#27ae60" }]}>
                        Camera
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.slotBtn}
                      onPress={() => openGallery(side)}
                    >
                      <MaterialIcons
                        name="photo-library"
                        size={16}
                        color="#27ae60"
                      />
                      <Text style={[s.slotBtnText, { color: "#27ae60" }]}>
                        Gallery
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={s.fileNames}>
            <Text style={s.fileName} numberOfLines={1}>
              L: {leftName}
            </Text>
            <Text style={s.fileName} numberOfLines={1}>
              R: {rightName}
            </Text>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.predictBtn, !canPredict && s.predictBtnDisabled]}
              onPress={predict}
              disabled={!canPredict}
            >
              <LinearGradient
                colors={
                  canPredict ? ["#27ae60", "#2ecc71"] : ["#95a5a6", "#7f8c8d"]
                }
                style={s.predictGradient}
              >
                {loading ? (
                  <View style={s.loadingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={s.loadingText}>{loadingMsg}</Text>
                  </View>
                ) : (
                  <Text style={s.predictText}>⭐ GRADE FISH</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={s.resetBtn} onPress={reset}>
              <MaterialIcons name="restart-alt" size={20} color="#e74c3c" />
            </TouchableOpacity>
          </View>

          {predError && (
            <View style={s.errorBox}>
              <MaterialIcons name="error-outline" size={15} color="#c0392b" />
              <Text style={s.errorText}>{predError}</Text>
            </View>
          )}
        </View>

        {/* ── Result ── */}
        {result && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Grading Result</Text>

            {/* Pair mismatch banner (backward-compat; new pipeline uses validationStatus) */}
            {result.pairValidation &&
              !result.pairValidation.matched &&
              result.validationStatus !== "species_mismatch" && (
                <View style={s.mismatchBanner}>
                  <MaterialIcons
                    name="compare-arrows"
                    size={24}
                    color="#e74c3c"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.mismatchTitle}>Images Don't Match!</Text>
                    <Text style={s.mismatchRow}>
                      <Text style={s.mismatchSide}>Left: </Text>
                      {getFishName(result.pairValidation.leftLabel).english}
                    </Text>
                    <Text style={s.mismatchRow}>
                      <Text style={s.mismatchSide}>Right: </Text>
                      {getFishName(result.pairValidation.rightLabel).english}
                    </Text>
                    <Text style={s.mismatchHint}>
                      Grading requires both images to be of the same fish.
                    </Text>
                  </View>
                </View>
              )}

            {/* ── Per-image validation failure card ── */}
            {result.validationStatus &&
            !["success", "success_no_grade", "low_confidence"].includes(
              result.validationStatus,
            ) ? (
              <View style={s.validationBox}>
                <MaterialIcons
                  name={
                    (VALIDATION_STATUS_UI[result.validationStatus]?.icon ??
                      "error") as any
                  }
                  size={48}
                  color={
                    VALIDATION_STATUS_UI[result.validationStatus]?.color ??
                    "#e74c3c"
                  }
                />
                <Text
                  style={[
                    s.validationTitle,
                    {
                      color:
                        VALIDATION_STATUS_UI[result.validationStatus]?.color ??
                        "#e74c3c",
                    },
                  ]}
                >
                  {VALIDATION_STATUS_UI[result.validationStatus]?.title ??
                    "Validation Failed"}
                </Text>
                <Text style={s.validationMessage}>
                  {result.validationMessage ??
                    "An issue was detected with the uploaded images."}
                </Text>

                {/* Per-image breakdown */}
                {result.perImageValidation && (
                  <View style={s.perImageDetails}>
                    <Text style={s.perImageHeading}>Per-Image Analysis</Text>

                    {/* Left */}
                    <View style={s.perImageRow}>
                      <View
                        style={[
                          s.perImageDot,
                          {
                            backgroundColor:
                              result.perImageValidation.leftFishDetected
                                ? "#27ae60"
                                : "#e74c3c",
                          },
                        ]}
                      />
                      <Text style={s.perImageLabel}>Left:</Text>
                      <Text style={s.perImageValue}>
                        {result.perImageValidation.leftFishDetected
                          ? "✓ Fish"
                          : "✗ Not fish"}
                        {" · "}
                        {(
                          result.perImageValidation.leftFishConfidence * 100
                        ).toFixed(0)}
                        %
                        {result.perImageValidation.leftSpecies
                          ? ` · ${getFishName(result.perImageValidation.leftSpecies).english}`
                          : ""}
                      </Text>
                    </View>

                    {/* Right */}
                    <View style={s.perImageRow}>
                      <View
                        style={[
                          s.perImageDot,
                          {
                            backgroundColor:
                              result.perImageValidation.rightFishDetected
                                ? "#27ae60"
                                : "#e74c3c",
                          },
                        ]}
                      />
                      <Text style={s.perImageLabel}>Right:</Text>
                      <Text style={s.perImageValue}>
                        {result.perImageValidation.rightFishDetected
                          ? "✓ Fish"
                          : "✗ Not fish"}
                        {" · "}
                        {(
                          result.perImageValidation.rightFishConfidence * 100
                        ).toFixed(0)}
                        %
                        {result.perImageValidation.rightSpecies
                          ? ` · ${getFishName(result.perImageValidation.rightSpecies).english}`
                          : ""}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ) : !result.isFish ? (
              <View style={s.notFishBox}>
                <MaterialIcons
                  name="no-photography"
                  size={48}
                  color="#e74c3c"
                />
                <Text style={s.notFishText}>Not identified as a fish</Text>
                <Text style={s.notFishSub}>
                  ({(result.fishConfidence * 100).toFixed(1)}% confidence)
                </Text>
              </View>
            ) : !isGradable ? (
              /* Species not supported */
              <View style={s.unsupportedBox}>
                <MaterialIcons name="warning" size={48} color="#f39c12" />
                <Text style={s.unsupportedTitle}>Species Not Supported</Text>
                <Text style={s.unsupportedSub}>
                  Detected:{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {getFishName(result.species).english}
                  </Text>
                  {getFishName(result.species).sinhala
                    ? ` (${getFishName(result.species).sinhala} · ${getFishName(result.species).romanized})`
                    : ""}
                  {"\n\n"}Quality grading only works with:{"\n"}
                  {"• Skipjack Tuna (බලයා)\n• Shortfin Scad (ලිනා)"}
                </Text>
              </View>
            ) : (
              /* Grade display */
              <>
                {/* Species banner */}
                <View style={s.speciesBanner}>
                  <LinearGradient
                    colors={["#27ae60", "#2ecc71"]}
                    style={s.speciesBannerIcon}
                  >
                    <MaterialIcons name="set-meal" size={28} color="#fff" />
                  </LinearGradient>
                  <View style={s.speciesBannerText}>
                    <Text style={s.speciesBannerEnglish}>
                      {getFishName(result.species).english}
                    </Text>
                    {getFishName(result.species).sinhala ? (
                      <View style={s.speciesBannerSinhalaRow}>
                        <Text style={s.speciesBannerSinhala}>
                          {getFishName(result.species).sinhala}
                        </Text>
                        <Text style={s.speciesBannerRomanized}>
                          {" · "}
                          {getFishName(result.species).romanized}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={s.speciesBannerConfBadge}>
                    <Text style={s.speciesBannerConfText}>
                      {((result.speciesConfidence ?? 0) * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <View style={s.gradeCenter}>
                  <View
                    style={[
                      s.gradeRing,
                      { borderColor: gradeColor(result.grade) },
                    ]}
                  >
                    <Text
                      style={[s.gradeText, { color: gradeColor(result.grade) }]}
                    >
                      {result.grade ?? "?"}
                    </Text>
                  </View>
                  <Text
                    style={[s.gradeLabel, { color: gradeColor(result.grade) }]}
                  >
                    Grade {result.grade ?? "Unknown"}
                  </Text>
                  <Text style={s.gradeDesc}>
                    {gradeDescription(result.grade)}
                  </Text>
                  {result.gradeConfidence != null && (
                    <Text style={s.gradeConf}>
                      {(result.gradeConfidence * 100).toFixed(1)}% confidence
                    </Text>
                  )}
                </View>

                {/* Low-confidence warning banner */}
                {result.validationStatus === "low_confidence" && (
                  <View style={s.lowConfBanner}>
                    <MaterialIcons name="warning" size={16} color="#d68910" />
                    <Text style={s.lowConfText}>
                      {result.validationMessage ??
                        "Grade confidence is below the minimum threshold."}
                    </Text>
                  </View>
                )}

                {result.warnings && result.warnings.length > 0 && (
                  <View style={s.warnBox}>
                    {result.warnings.map((w, i) => (
                      <Text key={i} style={s.warnText}>
                        ⚠ {w}
                      </Text>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={s.detailsBtn}
                  onPress={() => setShowDetails(true)}
                >
                  <MaterialIcons
                    name="info-outline"
                    size={16}
                    color="#27ae60"
                  />
                  <Text style={s.detailsBtnText}>View Stage Details</Text>
                </TouchableOpacity>

                {/* Save + History row */}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[s.detailsBtn, { flex: 1 }]}
                    onPress={handleSaveResult}
                    disabled={savingRecord || saveSuccess}
                  >
                    {savingRecord ? (
                      <ActivityIndicator size="small" color="#27ae60" />
                    ) : (
                      <>
                        <MaterialIcons
                          name={saveSuccess ? "check-circle" : "save"}
                          size={16}
                          color="#27ae60"
                        />
                        <Text style={s.detailsBtnText}>
                          {saveSuccess ? "Saved!" : "Save Result"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.detailsBtn, { flex: 1 }]}
                    onPress={() => router.push("/(root)/(tabs)/GradingHistory")}
                  >
                    <MaterialIcons name="history" size={16} color="#27ae60" />
                    <Text style={s.detailsBtnText}>View History</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Weight estimation ── 
        {isGradable && result?.species && (
          <FishWeightCard
            modelLabel={result.species}
            leftImageUri={leftImage}
            rightImageUri={rightImage}
          />
        )}*/}

        {/* ── Fish Measurement System ── */}
        {isGradable && result?.species && resolveSpecies(result.species) && (
          <>
            {/* Measurement instructions */}
            <MeasurementInstructions
              speciesKey={resolveSpecies(result.species)!}
            />

            {/* Start measurement / re-measure button */}
            {!fishMeasurements ? (
              <TouchableOpacity
                style={s.measureBtn}
                onPress={handleStartMeasurement}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#0057FF", "#00C6FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.measureBtnGradient}
                >
                  <MaterialIcons name="straighten" size={20} color="#fff" />
                  <Text style={s.measureBtnText}>
                    {calibration
                      ? "📏 Measure Fish on Image"
                      : "📐 Calibrate & Measure Fish"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                {/* Measurement results card */}
                <MeasurementResultsCard
                  measurements={fishMeasurements}
                  species={resolveSpecies(result.species)!}
                />

                {/* Re-measure options */}
                <View style={s.reMeasureRow}>
                  <TouchableOpacity
                    style={s.reMeasureBtn}
                    onPress={() => setShowMeasurement(true)}
                  >
                    <MaterialIcons name="refresh" size={16} color="#0057FF" />
                    <Text style={[s.reMeasureBtnText, { color: "#0057FF" }]}>
                      Re-measure
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.reMeasureBtn}
                    onPress={handleRecalibrate}
                  >
                    <MaterialIcons name="settings" size={16} color="#e67e22" />
                    <Text style={[s.reMeasureBtnText, { color: "#e67e22" }]}>
                      Re-calibrate
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}

        {/* ── Empty state ── */}
        {!result && !loading && (
          <View style={s.emptyState}>
            <MaterialIcons name="grade" size={64} color="#dfe6e9" />
            <Text style={s.emptyText}>
              Add left + right fish photos{"\n"}then tap GRADE FISH
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Measurement Calibration Modal ── */}
      {leftImage && (
        <MeasurementCalibrationModal
          visible={showCalibration}
          imageUri={leftImage}
          onCalibrated={handleCalibrated}
          onCancel={() => setShowCalibration(false)}
        />
      )}

      {/* ── Fish Measurement Modal ── */}
      {leftImage && calibration && result?.species && resolveSpecies(result.species) && (
        <FishMeasurementModal
          visible={showMeasurement}
          imageUri={leftImage}
          calibration={calibration}
          speciesKey={resolveSpecies(result.species)!}
          onComplete={handleMeasurementComplete}
          onCancel={() => setShowMeasurement(false)}
        />
      )}

      {/* ── Stage Details Modal ── */}
      <Modal visible={showDetails} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Stage Details</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {result && (
                <>
                  <DetailRow
                    label="Stage 1 (Fish)"
                    value={`${result.fishLabel} — ${(result.fishConfidence * 100).toFixed(2)}%`}
                  />
                  {result.isFish && (
                    <>
                      <DetailRow
                        label="Stage 2 (Species)"
                        value={`${getFishName(result.species).english}${getFishName(result.species).sinhala ? ` · ${getFishName(result.species).sinhala}` : ""} — ${((result.speciesConfidence ?? 0) * 100).toFixed(2)}%`}
                      />
                      {result.grade && (
                        <DetailRow
                          label="Stage 3 (Grade)"
                          value={`${result.grade} — ${((result.gradeConfidence ?? 0) * 100).toFixed(2)}%`}
                        />
                      )}
                    </>
                  )}
                  {result.uncertainty != null && result.uncertainty > 0 && (
                    <DetailRow
                      label="Uncertainty"
                      value={`${(result.uncertainty * 100).toFixed(2)}%`}
                    />
                  )}
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={() => setShowDetails(false)}
            >
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={s.detailRow}>
    <Text style={s.detailLabel}>{label}</Text>
    <Text style={s.detailValue}>{value}</Text>
  </View>
);

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },

  // Updated header styles - removed top padding since SafeAreaView handles it
  header: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    left: 20,
    top: 18,
    zIndex: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  headerContent: {
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 4,
  },
  retryText: { color: "#fff", fontSize: 11, marginLeft: 2 },
  apiErrText: {
    color: "#d0ffd6",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },

  scroll: { padding: 16, paddingBottom: 40, gap: 14 },

  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#edfbf0",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#a8e6c1",
  },
  noticeText: { flex: 1, fontSize: 13, color: "#1a6636", lineHeight: 18 },
  noticeBold: { fontWeight: "700" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 14,
  },

  imageRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  slotWrapper: { flex: 1, gap: 6 },
  imageSlot: {
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "#ecf0f1",
  },
  thumb: { width: "100%", aspectRatio: 1, borderRadius: 8 },
  thumbEmpty: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbLabel: { fontSize: 11, color: "#95a5a6", marginTop: 4 },
  slotBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  slotBadgeText: { fontSize: 10, color: "#fff", fontWeight: "700" },
  slotActions: { flexDirection: "row", gap: 6 },
  slotBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#b7e4c7",
    backgroundColor: "#edfbf0",
  },
  slotBtnText: { fontSize: 11, fontWeight: "600" },

  fileNames: { flexDirection: "row", gap: 8, marginBottom: 12 },
  fileName: { flex: 1, fontSize: 11, color: "#7f8c8d" },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  predictBtn: { flex: 1, borderRadius: 10, overflow: "hidden" },
  predictBtnDisabled: { opacity: 0.6 },
  predictGradient: { paddingVertical: 14, alignItems: "center" },
  loadingRow: { alignItems: "center" },
  loadingText: { color: "#f5f6fa", fontSize: 11, marginTop: 6 },
  predictText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  resetBtn: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e74c3c",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fdf0f0",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 6,
  },
  errorText: { flex: 1, color: "#c0392b", fontSize: 13 },

  speciesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  speciesLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#27ae60",
    textTransform: "capitalize",
  },

  // Species banner (grade screen)
  speciesBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#edfbf0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#a8e6c1",
  },
  speciesBannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  speciesBannerText: { flex: 1 },
  speciesBannerEnglish: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  speciesBannerSinhalaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  speciesBannerSinhala: { fontSize: 20, fontWeight: "700", color: "#27ae60" },
  speciesBannerRomanized: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
  },
  speciesBannerConfBadge: {
    backgroundColor: "#d4efdf",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  speciesBannerConfText: { fontSize: 13, fontWeight: "700", color: "#1a6636" },

  gradeCenter: { alignItems: "center", paddingVertical: 12, gap: 6 },
  gradeRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  gradeText: { fontSize: 42, fontWeight: "bold" },
  gradeLabel: { fontSize: 20, fontWeight: "700" },
  gradeDesc: { fontSize: 14, color: "#64748b", textAlign: "center" },
  gradeConf: { fontSize: 13, color: "#94a3b8" },

  warnBox: {
    backgroundColor: "#fef9e7",
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginTop: 8,
  },
  warnText: { color: "#d68910", fontSize: 12 },

  mismatchBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#fca5a5",
  },
  mismatchTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#e74c3c",
    marginBottom: 4,
  },
  mismatchRow: { fontSize: 13, color: "#374151", marginBottom: 1 },
  mismatchSide: { fontWeight: "700", color: "#0f172a" },
  mismatchHint: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 6,
    fontStyle: "italic",
  },

  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#a8e6c1",
    backgroundColor: "#edfbf0",
  },
  detailsBtnText: { color: "#27ae60", fontSize: 14, fontWeight: "600" },

  notFishBox: { alignItems: "center", paddingVertical: 20, gap: 8 },
  notFishText: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    fontWeight: "600",
  },
  notFishSub: { fontSize: 13, color: "#b2bec3" },

  unsupportedBox: { alignItems: "center", paddingVertical: 20, gap: 10 },
  unsupportedTitle: { fontSize: 17, fontWeight: "700", color: "#f39c12" },
  unsupportedSub: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    lineHeight: 20,
  },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: {
    color: "#b2bec3",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: { fontSize: 13, color: "#7f8c8d", flex: 1 },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2c3e50",
    flex: 1,
    textAlign: "right",
  },
  closeBtn: {
    backgroundColor: "#27ae60",
    padding: 13,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 18,
  },
  closeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // ── Measurement styles ──────────────────────────────────────────────────
  measureBtn: { borderRadius: 12, overflow: "hidden" },
  measureBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  measureBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  reMeasureRow: {
    flexDirection: "row",
    gap: 10,
  },
  reMeasureBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  reMeasureBtnText: { fontSize: 13, fontWeight: "600" },

  /* ── Per-image validation failure ───────────────────────────────── */
  validationBox: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  validationTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  validationMessage: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  perImageDetails: {
    width: "100%" as any,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  perImageHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 2,
  },
  perImageRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  perImageDot: { width: 8, height: 8, borderRadius: 4 },
  perImageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
    width: 50,
  },
  perImageValue: { flex: 1, fontSize: 12, color: "#64748b" },

  /* ── Low-confidence warning banner ─────────────────────────────── */
  lowConfBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: "#fef9e7",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#f9e79f",
  },
  lowConfText: {
    flex: 1,
    fontSize: 12,
    color: "#7d6608",
    lineHeight: 16,
  },
});
