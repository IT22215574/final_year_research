// (screens)/QualityGrading.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
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
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_BAR_SPACE = 112;
const SINGLE_IMAGE_MODE = true;

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
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [leftImage, setLeftImage] = useState<string | null>(null);
  const [rightImage, setRightImage] = useState<string | null>(null);
  const [leftName, setLeftName] = useState("No image selected");
  const [rightName, setRightName] = useState("Optional");

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Preparing…");
  const [loadingProgress, setLoadingProgress] = useState(0);
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

  // Auto-check API on mount
  useEffect(() => {
    checkApi();
  }, []);

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

  // ── Image pickers with better error handling ───────────────────────────────
  const openGallery = async (side: "left" | "right") => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission Required",
          "Gallery access is needed to select images.",
          [{ text: "OK" }],
        );
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.92,
        allowsEditing: false,
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
    } catch (error) {
      Alert.alert("Error", "Failed to open gallery. Please try again.");
    }
  };

  const openCamera = async (side: "left" | "right") => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to take photos.",
          [{ text: "OK" }],
        );
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        quality: 0.92,
        allowsEditing: false,
      });

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
    } catch (error) {
      Alert.alert("Error", "Failed to open camera. Please try again.");
    }
  };

  const pickImage = (side: "left" | "right") =>
    Alert.alert("Select Image", "Choose a clear side-view fish image", [
      { text: "Camera", onPress: () => openCamera(side) },
      { text: "Gallery", onPress: () => openGallery(side) },
      { text: "Cancel", style: "cancel" },
    ]);

  // ── Predict with progress tracking ─────────────────────────────────────────
  const canPredict = !!leftImage && !loading && apiStatus === "ok";

  const predict = async () => {
    if (!leftImage) {
      Alert.alert("Missing Image", "Please select at least one fish image.");
      return;
    }

    if (apiStatus !== "ok") {
      Alert.alert(
        "Backend Offline",
        "Please check your connection and try again.",
      );
      return;
    }

    setLoading(true);
    setPredError(null);
    setResult(null);
    setLoadingProgress(0);

    const progressMessages = [
      "Analyzing images...",
      "Detecting fish...",
      "Identifying species...",
      "Grading quality...",
      "Finalizing results...",
    ];

    let progressIndex = 0;
    const progressInterval = setInterval(() => {
      if (progressIndex < progressMessages.length - 1) {
        progressIndex++;
        setLoadingMsg(progressMessages[progressIndex]);
        setLoadingProgress(
          (progressIndex / (progressMessages.length - 1)) * 100,
        );
      }
    }, 1500);

    try {
      const r = await runFishPipeline(leftImage, rightImage || undefined, {
        useTTA: true,
        singleImageMode: SINGLE_IMAGE_MODE,
        onProgress: (msg: string) => {
          setLoadingMsg(msg);
        },
      });

      clearInterval(progressInterval);
      setLoadingProgress(100);

      // Small delay to show 100% completion
      await new Promise((resolve) => setTimeout(resolve, 300));

      // ── Per-image validation failures from backend ───────────────────────
      const valFailures = [
        "no_fish",
        "invalid_pair",
        "species_mismatch",
        "unknown_species",
        "unsupported_species",
      ];

      if (r.validationStatus && valFailures.includes(r.validationStatus)) {
        setResult(r);
        return;
      }

      // ── Pair mismatch check (only for paired mode) ───────────────────────
      if (
        rightImage &&
        r.isFish &&
        r.pairValidation &&
        !r.pairValidation.matched
      ) {
        const leftDisplay = getFishName(r.pairValidation.leftLabel).english;
        const rightDisplay = getFishName(r.pairValidation.rightLabel).english;
        setResult(r);
        Alert.alert(
          "⚠️ Image Mismatch",
          `The left and right images appear to be different species:\n\n🐟 Left: ${leftDisplay}\n🐟 Right: ${rightDisplay}\n\nGrading requires both images to be of the same fish. Please try again with matching images.`,
          [{ text: "Got it" }],
        );
        return;
      }

      // ── Species gate ─────────────────────────────────────
      if (r.isFish && r.species) {
        const speciesLower = r.species.toLowerCase().trim();
        if (!GRADABLE_SPECIES.includes(speciesLower)) {
          setResult(r);
          Alert.alert(
            "Not Supported Yet",
            `Quality grading is only available for:\n\n• Skipjack Tuna (බලයා · Balaya)\n• Shortfin Scad (ලින්නා · Linna)\n\nDetected: ${getFishName(r.species).english}`,
            [{ text: "OK" }],
          );
          return;
        }
      }

      setResult(r);

      // Scroll to results
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 500);
    } catch (e: any) {
      clearInterval(progressInterval);
      setPredError(e?.message ?? "Prediction failed. Please try again.");
      Alert.alert("Error", "Failed to process images. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMsg("Preparing…");
      setLoadingProgress(0);
    }
  };

  const { save: saveRecord, savingRecord } = useGradingRecordStore();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveResult = useCallback(async () => {
    if (!result || !isGradable) {
      Alert.alert("Cannot Save", "No valid grading result to save.");
      return;
    }

    try {
      const names = getFishName(result.species);
      const speciesKey = resolveSpecies(result.species);

      // Build notes including measurement data if available
      let notes = "";
      if (fishMeasurements) {
        const m = fishMeasurements;
        notes += `Length: ${m.length.valueCm.toFixed(1)} cm`;
        if (m.girth) {
          notes += ` | Girth: ${m.girth.valueCm.toFixed(1)} cm`;
        }
        notes += ` | Weight: ${m.weightEstimate.valueKg.toFixed(2)} kg`;
      }

      const measuredLengthCm = fishMeasurements?.length.valueCm;
      const estimatedWeightKg = fishMeasurements?.weightEstimate.valueKg;
      const estimatedWeightGrams =
        estimatedWeightKg != null
          ? parseFloat((estimatedWeightKg * 1000).toFixed(1))
          : undefined;
      const measurementMethod = fishMeasurements?.weightEstimate.method;
      const measurementConfidence = fishMeasurements?.weightEstimate.confidence;

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
        imageUris: [leftImage].filter(Boolean) as string[],
        notes: notes || undefined,
        measuredLengthCm,
        estimatedWeightKg,
        estimatedWeightGrams,
        sizeCategory,
        measurementMethod,
        measurementConfidence,
      });

      Alert.alert(
        "✅ Saved Successfully",
        "Grading result saved to your history.",
        [{ text: "OK" }],
      );
      setSaveSuccess(true);

      // Reset success state after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      Alert.alert("Save Failed", e?.message ?? "Could not save result.");
    }
  }, [result, leftImage, rightImage, saveRecord, fishMeasurements]);

  const reset = () => {
    Alert.alert(
      "Reset All",
      "Are you sure you want to clear all images and results?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setLeftImage(null);
            setRightImage(null);
            setLeftName("No image selected");
            setRightName("Optional");
            setResult(null);
            setPredError(null);
            setSaveSuccess(false);
            setCalibration(null);
            setFishMeasurements(null);
          },
        },
      ],
    );
  };

  // ── Measurement handlers ───────────────────────────────────────────────────
  const handleStartMeasurement = useCallback(() => {
    if (!leftImage) {
      Alert.alert("No Image", "Please select a left image first.");
      return;
    }

    if (!calibration) {
      setShowCalibration(true);
    } else {
      setShowMeasurement(true);
    }
  }, [calibration, leftImage]);

  const handleCalibrated = useCallback((cal: CalibrationData) => {
    setCalibration(cal);
    setShowCalibration(false);
    // Small delay to ensure modal is closed
    setTimeout(() => setShowMeasurement(true), 300);
  }, []);

  const handleMeasurementComplete = useCallback(
    (length: LinearMeasurement, girth?: LinearMeasurement) => {
      if (!result?.species) {
        Alert.alert("Error", "Species information not available.");
        return;
      }

      const speciesKey = resolveSpecies(result.species);
      if (!speciesKey || !calibration) {
        Alert.alert("Error", "Calibration data not available.");
        return;
      }

      const measurements = buildFishMeasurements(
        calibration,
        length,
        speciesKey,
        girth,
      );
      setFishMeasurements(measurements);
      setShowMeasurement(false);

      // Show success message
      Alert.alert(
        "✅ Measurements Complete",
        `Length: ${measurements.length.valueCm.toFixed(1)} cm\n` +
          `Est. Weight: ${measurements.weightEstimate.valueKg.toFixed(2)} kg`,
        [{ text: "Great" }],
      );
    },
    [result, calibration],
  );

  const handleRecalibrate = useCallback(() => {
    Alert.alert(
      "Recalibrate",
      "This will clear current measurements and start new calibration.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            setCalibration(null);
            setFishMeasurements(null);
            setShowCalibration(true);
          },
        },
      ],
    );
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
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.header}
      >
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.push("/Quality")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerContent}>
          <Text style={s.headerSub}>Analyze freshness from one clear fish image</Text>
        </View>
        <View style={s.statusContainer}>
          <View style={[s.statusDot, { backgroundColor: apiStatusColor }]} />
          <Text style={s.statusText}>
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
      </LinearGradient>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 12) + TAB_BAR_SPACE },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={apiStatus === "checking"}
            onRefresh={checkApi}
            colors={["#27ae60"]}
            tintColor="#27ae60"
          />
        }
      >
        {/* ── Supported species notice ── 
        <View style={s.noticeBox}>
          <MaterialIcons name="info-outline" size={20} color="#27ae60" />
          <Text style={s.noticeText}>
            Grading available for{' '}
            <Text style={s.noticeBold}>Skipjack Tuna</Text> and{' '}
            <Text style={s.noticeBold}>Shortfin Scad</Text>
          </Text>
        </View>*/}

        {/* ── Image pickers ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>1. Select Fish Image</Text>
          <Text style={s.cardSubTitle}>
            Use one clear, uncropped side-view image of the fish.
          </Text>

          <View style={s.singleImageRow}>
            <View style={s.singleSlotWrapper}>
              <TouchableOpacity
                style={[s.imageSlot, leftImage && s.imageSlotFilled]}
                onPress={() => pickImage("left")}
                activeOpacity={0.7}
              >
                {leftImage ? (
                  <Image source={{ uri: leftImage }} style={s.thumb} />
                ) : (
                  <View style={s.thumbEmpty}>
                    <MaterialIcons
                      name="add-a-photo"
                      size={32}
                      color="#95a5a6"
                    />
                    <Text style={s.thumbLabel}>Add Fish Image</Text>
                  </View>
                )}
                <View style={s.slotBadge}>
                  <Text style={s.slotBadgeText}>Single Image</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.fileNames}>
            <Text style={s.fileName} numberOfLines={1}>
              Image: {leftName}
            </Text>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.predictBtn, !canPredict && s.predictBtnDisabled]}
              onPress={predict}
              disabled={!canPredict}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  canPredict ? ["#27ae60", "#2ecc71"] : ["#95a5a6", "#7f8c8d"]
                }
                style={s.predictGradient}
              >
                {loading ? (
                  <View style={s.loadingContainer}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={s.loadingText}>{loadingMsg}</Text>
                    {loadingProgress > 0 && (
                      <View style={s.progressBarContainer}>
                        <View
                          style={[
                            s.progressBar,
                            { width: `${loadingProgress}%` },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    <MaterialIcons name="grade" size={20} color="#fff" />
                    <Text style={s.predictText}>Start Grading</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.resetBtn}
              onPress={reset}
              activeOpacity={0.7}
            >
              <MaterialIcons name="restart-alt" size={24} color="#e74c3c" />
            </TouchableOpacity>
          </View>

          {predError && (
            <View style={s.errorBox}>
              <MaterialIcons name="error-outline" size={20} color="#c0392b" />
              <Text style={s.errorText}>{predError}</Text>
            </View>
          )}
        </View>

        {/* ── Result Section ── */}
        {result && (
          <View style={s.card}>
            <Text style={s.cardTitle}>2. Grading Results</Text>

            {/* Validation failure or result display */}
            {result.validationStatus &&
            !["success", "success_no_grade", "low_confidence"].includes(
              result.validationStatus,
            ) ? (
              <ValidationFailureView
                result={result}
                validationUI={VALIDATION_STATUS_UI}
                getFishName={getFishName}
              />
            ) : !result.isFish ? (
              <NotFishView confidence={result.fishConfidence} />
            ) : !isGradable ? (
              <UnsupportedSpeciesView
                species={result.species}
                getFishName={getFishName}
              />
            ) : (
              <>
                <GradeResultView
                  result={result}
                  getFishName={getFishName}
                  gradeColor={gradeColor}
                  gradeDescription={gradeDescription}
                />

                {/* Measurement Section */}
                <MeasurementSection
                  isGradable={isGradable}
                  result={result}
                  leftImage={leftImage}
                  calibration={calibration}
                  fishMeasurements={fishMeasurements}
                  onStartMeasurement={handleStartMeasurement}
                  onRecalibrate={handleRecalibrate}
                  onRemasure={() => setShowMeasurement(true)}
                />

                {/* Action Buttons */}
                <ActionButtons
                  onSave={handleSaveResult}
                  onViewDetails={() => setShowDetails(true)}
                  onViewHistory={() =>
                    router.push("/(root)/(tabs)/GradingHistory")
                  }
                  savingRecord={savingRecord}
                  saveSuccess={saveSuccess}
                  showDetails={!!result}
                />
              </>
            )}
          </View>
        )}

        {/* ── Empty state ── */}
        {!result && !loading && (
          <View style={s.emptyState}>
            <MaterialIcons name="analytics" size={64} color="#dfe6e9" />
            <Text style={s.emptyTitle}>No Analysis Yet</Text>
            <Text style={s.emptyText}>
              Select one clear image of your fish{"\n"}
              then tap "Start Grading" to begin analysis
            </Text>
          </View>
        )}

      </ScrollView>

      {/* ── Modals ── */}
      {leftImage && (
        <MeasurementCalibrationModal
          visible={showCalibration}
          imageUri={leftImage}
          onCalibrated={handleCalibrated}
          onCancel={() => setShowCalibration(false)}
        />
      )}

      {leftImage &&
        calibration &&
        result?.species &&
        resolveSpecies(result.species) && (
          <FishMeasurementModal
            visible={showMeasurement}
            imageUri={leftImage}
            calibration={calibration}
            speciesKey={resolveSpecies(result.species)!}
            onComplete={handleMeasurementComplete}
            onCancel={() => setShowMeasurement(false)}
          />
        )}

      {/* Stage Details Modal */}
      <Modal visible={showDetails} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Analysis Details</Text>
            <ScrollView style={s.modalScroll}>
              {result && (
                <>
                  <DetailRow
                    label="Fish Detection"
                    value={`${(result.fishConfidence * 100).toFixed(1)}% confidence`}
                  />
                  {result.isFish && (
                    <>
                      <DetailRow
                        label="Species"
                        value={`${getFishName(result.species).english} (${((result.speciesConfidence ?? 0) * 100).toFixed(1)}%)`}
                      />
                      {result.grade && (
                        <DetailRow
                          label="Quality Grade"
                          value={`${result.grade} (${((result.gradeConfidence ?? 0) * 100).toFixed(1)}%)`}
                        />
                      )}
                    </>
                  )}
                  {result.uncertainty != null && result.uncertainty > 0 && (
                    <DetailRow
                      label="Uncertainty"
                      value={`${(result.uncertainty * 100).toFixed(1)}%`}
                    />
                  )}
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={s.closeBtn}
              onPress={() => setShowDetails(false)}
              activeOpacity={0.8}
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

const ValidationFailureView = ({ result, validationUI, getFishName }: any) => (
  <View style={s.validationBox}>
    <MaterialIcons
      name={validationUI[result.validationStatus]?.icon ?? "error"}
      size={56}
      color={validationUI[result.validationStatus]?.color ?? "#e74c3c"}
    />
    <Text
      style={[
        s.validationTitle,
        { color: validationUI[result.validationStatus]?.color ?? "#e74c3c" },
      ]}
    >
      {validationUI[result.validationStatus]?.title ?? "Validation Failed"}
    </Text>
    <Text style={s.validationMessage}>
      {result.validationMessage ??
        "An issue was detected with the uploaded images."}
    </Text>

    {result.perImageValidation && (
      <View style={s.perImageDetails}>
        <Text style={s.perImageHeading}>Image Analysis</Text>
        <View style={s.perImageRow}>
          <View
            style={[
              s.perImageDot,
              {
                backgroundColor: result.perImageValidation.leftFishDetected
                  ? "#27ae60"
                  : "#e74c3c",
              },
            ]}
          />
          <Text style={s.perImageLabel}>Left:</Text>
          <Text style={s.perImageValue}>
            {result.perImageValidation.leftFishDetected
              ? "✓ Fish"
              : "✗ No fish"}
            {result.perImageValidation.leftSpecies &&
              ` · ${getFishName(result.perImageValidation.leftSpecies).english}`}
          </Text>
        </View>
        <View style={s.perImageRow}>
          <View
            style={[
              s.perImageDot,
              {
                backgroundColor: result.perImageValidation.rightFishDetected
                  ? "#27ae60"
                  : "#e74c3c",
              },
            ]}
          />
          <Text style={s.perImageLabel}>Right:</Text>
          <Text style={s.perImageValue}>
            {result.perImageValidation.rightFishDetected
              ? "✓ Fish"
              : "✗ No fish"}
            {result.perImageValidation.rightSpecies &&
              ` · ${getFishName(result.perImageValidation.rightSpecies).english}`}
          </Text>
        </View>
      </View>
    )}
  </View>
);

const NotFishView = ({ confidence }: any) => (
  <View style={s.notFishBox}>
    <MaterialIcons name="no-photography" size={64} color="#e74c3c" />
    <Text style={s.notFishText}>No Fish Detected</Text>
    <Text style={s.notFishSub}>
      The image does not appear to contain a fish{"\n"}(
      {(confidence * 100).toFixed(1)}% confidence)
    </Text>
  </View>
);

const UnsupportedSpeciesView = ({ species, getFishName }: any) => (
  <View style={s.unsupportedBox}>
    <MaterialIcons name="warning" size={56} color="#f39c12" />
    <Text style={s.unsupportedTitle}>Species Not Supported</Text>
    <Text style={s.unsupportedSub}>
      Detected: {getFishName(species).english}
      {"\n\n"}
      Currently supporting:{"\n"}• Skipjack Tuna (බලයා){"\n"}• Shortfin Scad
      (ලින්නා)
    </Text>
  </View>
);

const GradeResultView = ({
  result,
  getFishName,
  gradeColor,
  gradeDescription,
}: any) => (
  <>
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
        {getFishName(result.species).sinhala && (
          <View style={s.speciesBannerSinhalaRow}>
            <Text style={s.speciesBannerSinhala}>
              {getFishName(result.species).sinhala}
            </Text>
            <Text style={s.speciesBannerRomanized}>
              · {getFishName(result.species).romanized}
            </Text>
          </View>
        )}
      </View>
      <View style={s.speciesBannerConfBadge}>
        <Text style={s.speciesBannerConfText}>
          {((result.speciesConfidence ?? 0) * 100).toFixed(0)}%
        </Text>
      </View>
    </View>

    <View style={s.gradeCenter}>
      <View style={[s.gradeRing, { borderColor: gradeColor(result.grade) }]}>
        <Text style={[s.gradeText, { color: gradeColor(result.grade) }]}>
          {result.grade ?? "?"}
        </Text>
      </View>
      <Text style={[s.gradeLabel, { color: gradeColor(result.grade) }]}>
        Grade {result.grade ?? "Unknown"}
      </Text>
      <Text style={s.gradeDesc}>{gradeDescription(result.grade)}</Text>
      <View style={s.gradeConfBadge}>
        <Text style={s.gradeConf}>
          {(result.gradeConfidence * 100).toFixed(1)}% confidence
        </Text>
      </View>
    </View>

    {result.validationStatus === "low_confidence" && (
      <View style={s.lowConfBanner}>
        <MaterialIcons name="warning" size={20} color="#d68910" />
        <Text style={s.lowConfText}>
          {result.validationMessage ?? "Grade confidence is below threshold"}
        </Text>
      </View>
    )}
  </>
);

const MeasurementSection = ({
  isGradable,
  result,
  leftImage,
  calibration,
  fishMeasurements,
  onStartMeasurement,
  onRecalibrate,
  onRemasure,
}: any) => {
  if (
    !isGradable ||
    !result?.species ||
    !resolveSpecies(result.species) ||
    !leftImage ||
    result.species.toLowerCase().trim() === "makerel"
  ) {
    return null;
  }

  return (
    <View style={s.measurementSection}>
      <Text style={s.sectionSubtitle}>3. Physical Measurements (Optional)</Text>

      <MeasurementInstructions speciesKey={resolveSpecies(result.species)!} />

      {!fishMeasurements ? (
        <TouchableOpacity
          style={s.measureBtn}
          onPress={onStartMeasurement}
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
              {calibration ? "Measure Fish" : "Calibrate & Measure"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <>
          <MeasurementResultsCard
            measurements={fishMeasurements}
            species={resolveSpecies(result.species)!}
          />
          <View style={s.reMeasureRow}>
            <TouchableOpacity style={s.reMeasureBtn} onPress={onRemasure}>
              <MaterialIcons name="refresh" size={16} color="#0057FF" />
              <Text style={[s.reMeasureBtnText, { color: "#0057FF" }]}>
                Remeasure
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.reMeasureBtn} onPress={onRecalibrate}>
              <MaterialIcons name="settings" size={16} color="#e67e22" />
              <Text style={[s.reMeasureBtnText, { color: "#e67e22" }]}>
                Recalibrate
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const ActionButtons = ({
  onSave,
  onViewDetails,
  onViewHistory,
  savingRecord,
  saveSuccess,
  showDetails,
}: any) => (
  <View style={s.actionButtons}>
    <TouchableOpacity
      style={[s.actionButton, s.saveButton]}
      onPress={onSave}
      disabled={savingRecord || saveSuccess}
      activeOpacity={0.7}
    >
      {savingRecord ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <MaterialIcons
            name={saveSuccess ? "check-circle" : "save"}
            size={20}
            color="#fff"
          />
          <Text style={s.actionButtonText}>
            {saveSuccess ? "Saved!" : "Save"}
          </Text>
        </>
      )}
    </TouchableOpacity>

    <TouchableOpacity
      style={[s.actionButton, s.historyButton]}
      onPress={onViewHistory}
      activeOpacity={0.7}
    >
      <MaterialIcons name="history" size={20} color="#fff" />
      <Text style={s.actionButtonText}>History</Text>
    </TouchableOpacity>

    {showDetails && (
      <TouchableOpacity
        style={[s.actionButton, s.detailsButton]}
        onPress={onViewDetails}
        activeOpacity={0.7}
      >
        <MaterialIcons name="info" size={20} color="#fff" />
        <Text style={s.actionButtonText}>Details</Text>
      </TouchableOpacity>
    )}
  </View>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={s.detailRow}>
    <Text style={s.detailLabel}>{label}</Text>
    <Text style={s.detailValue}>{value}</Text>
  </View>
);

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  backBtn: {
    position: "absolute",
    left: 20,
    top: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    alignItems: "center",
    paddingHorizontal: 48,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 4,
  },
  retryText: {
    color: "#fff",
    fontSize: 10,
    marginLeft: 2,
  },
  apiErrText: {
    color: "#ffcdd2",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  scrollContent: {
    padding: 16,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: "#2e7d32",
  },
  noticeBold: {
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
  },
  cardSubTitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: -10,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
  },
  imageRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  singleImageRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  slotWrapper: {
    flex: 1,
  },
  singleSlotWrapper: {
    width: "100%",
    maxWidth: 320,
  },
  imageSlot: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  imageSlotFilled: {
    borderColor: "#27ae60",
  },
  thumb: {
    width: "100%",
    aspectRatio: 1,
  },
  thumbEmpty: {
    width: "100%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  thumbLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  slotBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slotBadgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
  },
  fileNames: {
    gap: 4,
    marginBottom: 16,
  },
  fileName: {
    fontSize: 11,
    color: "#64748b",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  predictBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  predictBtnDisabled: {
    opacity: 0.6,
  },
  predictGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  predictText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  loadingText: {
    color: "#fff",
    fontSize: 13,
  },
  progressBarContainer: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    marginTop: 4,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  resetBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#b91c1c",
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748b",
  },
  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },

  // Result styles
  speciesBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  speciesBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  speciesBannerText: {
    flex: 1,
  },
  speciesBannerEnglish: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  speciesBannerSinhalaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  speciesBannerSinhala: {
    fontSize: 18,
    fontWeight: "600",
    color: "#16a34a",
  },
  speciesBannerRomanized: {
    fontSize: 11,
    color: "#64748b",
    fontStyle: "italic",
  },
  speciesBannerConfBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  speciesBannerConfText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  gradeCenter: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  gradeRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  gradeText: {
    fontSize: 48,
    fontWeight: "bold",
  },
  gradeLabel: {
    fontSize: 22,
    fontWeight: "700",
  },
  gradeDesc: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  gradeConfBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  gradeConf: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },

  // Measurement styles
  measurementSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  measureBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  measureBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  measureBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  reMeasureRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
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
  reMeasureBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Action buttons
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveButton: {
    backgroundColor: "#27ae60",
  },
  historyButton: {
    backgroundColor: "#3498db",
  },
  detailsButton: {
    backgroundColor: "#95a5a6",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Validation failure styles
  validationBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
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
    paddingHorizontal: 16,
  },
  perImageDetails: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  perImageHeading: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  perImageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  perImageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  perImageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
    width: 45,
  },
  perImageValue: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
  },

  notFishBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  notFishText: {
    fontSize: 18,
    color: "#e74c3c",
    fontWeight: "600",
  },
  notFishSub: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },

  unsupportedBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  unsupportedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f39c12",
  },
  unsupportedSub: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
  },

  lowConfBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  lowConfText: {
    flex: 1,
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: 300,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailLabel: {
    fontSize: 13,
    color: "#64748b",
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
    textAlign: "right",
  },
  closeBtn: {
    backgroundColor: "#27ae60",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  closeBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
