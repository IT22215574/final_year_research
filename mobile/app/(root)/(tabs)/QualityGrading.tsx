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

      // ── Pair mismatch check ──────────────────────────────────────────────
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
      await saveRecord({
        fishSpecies: result.species ?? undefined,
        fishName: names.english,
        predictedGrade: result.grade ?? undefined,
        gradeConfidence: result.gradeConfidence,
        speciesConfidence: result.speciesConfidence,
        imageUris: [leftImage, rightImage].filter(Boolean) as string[],
      });
      Alert.alert("Saved!", "Grading result saved to your history.");
      setSaveSuccess(true);
    } catch (e: any) {
      Alert.alert("Save Failed", e?.message ?? "Could not save result.");
    }
  }, [result, leftImage, rightImage, saveRecord]);

  const reset = () => {
    setLeftImage(null);
    setRightImage(null);
    setLeftName("No image selected");
    setRightName("No image selected");
    setResult(null);
    setPredError(null);
    setSaveSuccess(false);
  };

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

            {/* Pair mismatch banner */}
            {result.pairValidation && !result.pairValidation.matched && (
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

            {!result.isFish ? (
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

        {/* ── Weight estimation ── */}
        {isGradable && result?.species && (
          <FishWeightCard
            modelLabel={result.species}
            leftImageUri={leftImage}
            rightImageUri={rightImage}
          />
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
});
