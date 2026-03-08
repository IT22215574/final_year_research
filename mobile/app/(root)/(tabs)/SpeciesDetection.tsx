// (screens)/SpeciesDetection.tsx
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { HEADER_GRADIENT } from "@/constants";
import { loadModels, runFishPipeline } from "@/utils/fish_quality_utils/runFishPipeline";
import type { PredictionResult } from "@/utils/fish_quality_utils/fishTypes";

// ── Fish name dictionary (ALL model labels → display names) ───────────────────
const FISH_NAMES: Record<string, { english: string; sinhala: string; romanized: string }> = {
  tuna: {
    english: "Skipjack Tuna",
    sinhala: "බලයා",
    romanized: "Balaya"
  },

  makerel: {
    english: "Shortfin Scad",
    sinhala: "ලින්නා",
    romanized: "Linna"
  },

  flyingfish: {
    english: "Flying Fish",
    sinhala: "පියාමැස්සා",
    romanized: "Piyamessa"
  },

  graymullet: {
    english: "Gray Mullet",
    sinhala: "සිරියාව",
    romanized: "Siriyawa"
  },

  whitemullet: {
    english: "White Mullet",
    sinhala: "ගල් මාළු",
    romanized: "Gal Maalu"
  },

  yellowfintrevally: {
    english: "Yellowfin Trevally",
    sinhala: "පරව්",
    romanized: "Paraw"
  },

  unknown: {
    english: "Unknown Fish",
    sinhala: "නොදන්නා මාළු",
    romanized: "Nodanna Maalu"
  },
};

const getFishName = (label?: string | null) => {
  // Strip any "unknown_" prefix the pipeline adds
  const key = (label ?? "").toLowerCase().trim().replace(/^unknown_/, "");
  return FISH_NAMES[key] ?? { english: label ?? "Unknown Fish", sinhala: "නොදන්නා මාළු", romanized: "Nodanna Maalu" };
};

export default function SpeciesDetection() {
  const router = useRouter();

  const [leftImage, setLeftImage] = useState<string | null>(null);
  const [rightImage, setRightImage] = useState<string | null>(null);
  const [leftName, setLeftName] = useState("No image selected");
  const [rightName, setRightName] = useState("No image selected");

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Preparing…");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [predError, setPredError] = useState<string | null>(null);

  const [apiStatus, setApiStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [apiError, setApiError] = useState<string | null>(null);

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
      if (side === "left") { setLeftImage(asset.uri); setLeftName(name); }
      else { setRightImage(asset.uri); setRightName(name); }
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
      if (side === "left") { setLeftImage(asset.uri); setLeftName(name); }
      else { setRightImage(asset.uri); setRightName(name); }
    }
  };

  const pickImage = (side: "left" | "right") =>
    Alert.alert("Select Image", `Choose source for ${side} image`, [
      { text: "Camera", onPress: () => openCamera(side) },
      { text: "Gallery", onPress: () => openGallery(side) },
      { text: "Cancel", style: "cancel" },
    ]);

  // ── Predict ────────────────────────────────────────────────────────────────
  // Allow predict even if apiStatus is "idle" — checkApi runs automatically on first predict
  const canPredict = !!leftImage && !!rightImage && !loading && apiStatus !== "error";

  const predict = async () => {
    if (!leftImage || !rightImage) return;

    // Auto-check API if not done yet
    if (apiStatus === "idle") {
      await checkApi();
    }

    setLoading(true);
    setPredError(null);
    setResult(null);
    setLoadingMsg("Running stage 1 — Fish detector…");
    try {
      const r = await runFishPipeline(leftImage, rightImage, {
        useTTA: true,
        onProgress: (msg: string) => setLoadingMsg(msg),
      });

      // ── Pair mismatch check ────────────────────────────────────────────
      if (r.isFish && r.pairValidation && !r.pairValidation.matched) {
        const leftDisplay  = getFishName(r.pairValidation.leftLabel).english;
        const rightDisplay = getFishName(r.pairValidation.rightLabel).english;
        setResult(r);
        Alert.alert(
          "⚠️ Image Mismatch",
          `The left and right images appear to be different species:\n\n🐟 Left:   ${leftDisplay}\n🐟 Right:  ${rightDisplay}\n\nPlease use two images of the same fish for accurate results.`,
          [{ text: "Got it" }],
        );
        return;
      }

      setResult(r);
    } catch (e: any) {
      setPredError(e?.message ?? "Prediction failed.");
    } finally {
      setLoading(false);
      setLoadingMsg("Preparing…");
    }
  };

  const reset = () => {
    setLeftImage(null);
    setRightImage(null);
    setLeftName("No image selected");
    setRightName("No image selected");
    setResult(null);
    setPredError(null);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const apiStatusColor =
    apiStatus === "ok" ? "#27ae60" :
    apiStatus === "error" ? "#e74c3c" :
    apiStatus === "checking" ? "#f39c12" : "#95a5a6";

  const apiStatusText =
    apiStatus === "ok"       ? "Backend Ready" :
    apiStatus === "error"    ? "Backend Offline" :
    apiStatus === "checking" ? "Checking…" : "Not checked";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={["left", "right"]}>
      {/* Header - No top edge to avoid double padding */}
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={s.statusContainer}>
          <View style={[s.statusDot, { backgroundColor: apiStatusColor }]} />
          <Text style={[s.statusText, { color: apiStatusColor }]}>{apiStatusText}</Text>
          {(apiStatus === "idle" || apiStatus === "error") && (
            <TouchableOpacity onPress={checkApi} style={s.retryBtn}>
              <MaterialIcons name="refresh" size={12} color="#fff" />
              <Text style={s.retryText}>{apiStatus === "idle" ? "Check" : "Retry"}</Text>
            </TouchableOpacity>
          )}
        </View>
        {apiStatus === "error" && apiError && (
          <Text style={s.apiErrText}>{apiError}</Text>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={apiStatus === "checking"} onRefresh={checkApi} />
        }
      >
        {/* ── Image pickers ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Select Images</Text>
          <View style={s.imageRow}>
            {(["left", "right"] as const).map((side) => {
              const uri = side === "left" ? leftImage : rightImage;
              return (
                <View key={side} style={s.slotWrapper}>
                  <TouchableOpacity style={s.imageSlot} onPress={() => pickImage(side)}>
                    {uri ? (
                      <Image source={{ uri }} style={s.thumb} />
                    ) : (
                      <View style={s.thumbEmpty}>
                        <MaterialIcons name="add-photo-alternate" size={34} color="#95a5a6" />
                        <Text style={s.thumbLabel}>Tap to add</Text>
                      </View>
                    )}
                    <View style={s.slotBadge}>
                      <Text style={s.slotBadgeText}>{side.toUpperCase()}</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={s.slotActions}>
                    <TouchableOpacity style={s.slotBtn} onPress={() => openCamera(side)}>
                      <MaterialIcons name="photo-camera" size={16} color="#3498db" />
                      <Text style={s.slotBtnText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.slotBtn} onPress={() => openGallery(side)}>
                      <MaterialIcons name="photo-library" size={16} color="#3498db" />
                      <Text style={s.slotBtnText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={s.fileNames}>
            <Text style={s.fileName} numberOfLines={1}>L: {leftName}</Text>
            <Text style={s.fileName} numberOfLines={1}>R: {rightName}</Text>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.predictBtn, !canPredict && s.predictBtnDisabled]}
              onPress={predict}
              disabled={!canPredict}
            >
              <LinearGradient
                colors={canPredict ? ["#0057FF", "#00C6FF"] : ["#95a5a6", "#7f8c8d"]}
                style={s.predictGradient}
              >
                {loading ? (
                  <View style={s.loadingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={s.loadingText}>{loadingMsg}</Text>
                  </View>
                ) : (
                  <Text style={s.predictText}>🔍 DETECT SPECIES</Text>
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
            <Text style={s.cardTitle}>Detection Result</Text>

            {/* Pair mismatch banner */}
            {result.pairValidation && !result.pairValidation.matched && (
              <View style={s.mismatchBanner}>
                <MaterialIcons name="compare-arrows" size={24} color="#e74c3c" />
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
                    Use two images of the same fish for best accuracy.
                  </Text>
                </View>
              </View>
            )}

            {/* Fish / Not Fish */}
            <View style={s.badgeRow}>
              <View style={[s.badge, result.isFish ? s.badgeGreen : s.badgeRed]}>
                <Text style={s.badgeText}>
                  {result.isFish ? "✓ Fish Detected" : "✗ Not a Fish"}
                </Text>
              </View>
            </View>

            {result.isFish ? (
              <>
                {/* Species name card */}
                <View style={s.speciesBlock}>
                  <LinearGradient colors={["#0057FF", "#00C6FF"]} style={s.speciesIconBg}>
                    <MaterialIcons name="set-meal" size={36} color="#fff" />
                  </LinearGradient>

                  <Text style={s.speciesEnglish}>
                    {getFishName(result.species).english}
                  </Text>

                  {/* Sinhala name — show for all species including unknown */}
                  <View style={s.speciesSinhalaRow}>
                    <Text style={s.speciesSinhala}>
                      {getFishName(result.species).sinhala}
                    </Text>
                    <Text style={s.speciesRomanized}>
                      ({getFishName(result.species).romanized})
                    </Text>
                  </View>

                  <View style={s.confBadge}>
                    <MaterialIcons name="verified" size={13} color="#0057FF" />
                    <Text style={s.confBadgeText}>
                      {((result.speciesConfidence ?? 0) * 100).toFixed(1)}% confidence
                    </Text>
                  </View>

                  {/* Show note if species is not in the known list */}
                  {(result.species === "unknown" || (result.species ?? "").startsWith("unknown_")) && (
                    <View style={s.unknownNote}>
                      <MaterialIcons name="info-outline" size={14} color="#f39c12" />
                      <Text style={s.unknownNoteText}>
                        This fish species is outside the supported list. Detection may be inaccurate.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Stage breakdown */}
                <View style={s.stages}>
                  <StageRow
                    stage="S1"
                    label={result.fishLabel}
                    confidence={result.fishConfidence}
                    color="#3498db"
                  />
                  <StageRow
                    stage="S2"
                    label={getFishName(result.species).english}
                    confidence={result.speciesConfidence ?? 0}
                    color="#0057FF"
                  />
                </View>

                {result.warnings && result.warnings.length > 0 && (
                  <View style={s.warnBox}>
                    {result.warnings.map((w, i) => (
                      <Text key={i} style={s.warnText}>⚠ {w}</Text>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={s.notFishBox}>
                <MaterialIcons name="no-photography" size={48} color="#e74c3c" />
                <Text style={s.notFishText}>Not identified as a fish</Text>
                <Text style={s.notFishSub}>
                  Stage 1 confidence: {(result.fishConfidence * 100).toFixed(1)}%
                </Text>
                <View style={s.notFishHint}>
                  <MaterialIcons name="info-outline" size={14} color="#3498db" />
                  <Text style={s.notFishHintText}>
                    If this is a fish, the image quality may be too low or the species is very different from the training data.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Empty state ── */}
        {!result && !loading && (
          <View style={s.emptyState}>
            <MaterialIcons name="search" size={64} color="#dfe6e9" />
            <Text style={s.emptyText}>
              Add left + right fish photos{"\n"}then tap DETECT SPECIES
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
const StageRow = ({
  stage,
  label,
  confidence,
  color,
}: {
  stage: string;
  label: string;
  confidence: number;
  color: string;
}) => (
  <View style={s.stageRow}>
    <View style={[s.stageBadge, { backgroundColor: color }]}>
      <Text style={s.stageBadgeText}>{stage}</Text>
    </View>
    <Text style={s.stageLabel} numberOfLines={1}>{label}</Text>
    <Text style={s.stageConf}>{(confidence * 100).toFixed(1)}%</Text>
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
  apiErrText: { color: "#ffd0cc", fontSize: 11, textAlign: "center", marginTop: 4 },

  scroll: { padding: 16, paddingBottom: 40, gap: 14 },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#2c3e50", marginBottom: 14 },

  imageRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  slotWrapper: { flex: 1, gap: 6 },
  imageSlot: { borderRadius: 10, overflow: "hidden", position: "relative", borderWidth: 2, borderColor: "#ecf0f1" },
  thumb: { width: "100%", aspectRatio: 1, borderRadius: 8 },
  thumbEmpty: { width: "100%", aspectRatio: 1, backgroundColor: "#f8f9fa", justifyContent: "center", alignItems: "center" },
  thumbLabel: { fontSize: 11, color: "#95a5a6", marginTop: 4 },
  slotBadge: { position: "absolute", top: 6, left: 6, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  slotBadgeText: { fontSize: 10, color: "#fff", fontWeight: "700" },
  slotActions: { flexDirection: "row", gap: 6 },
  slotBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#d0e8f7", backgroundColor: "#eaf5fd" },
  slotBtnText: { fontSize: 11, color: "#3498db", fontWeight: "600" },

  fileNames: { flexDirection: "row", gap: 8, marginBottom: 12 },
  fileName: { flex: 1, fontSize: 11, color: "#7f8c8d" },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  predictBtn: { flex: 1, borderRadius: 10, overflow: "hidden" },
  predictBtnDisabled: { opacity: 0.6 },
  predictGradient: { paddingVertical: 14, alignItems: "center" },
  loadingRow: { alignItems: "center" },
  loadingText: { color: "#f5f6fa", fontSize: 11, marginTop: 6 },
  predictText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  resetBtn: { padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: "#e74c3c" },

  errorBox: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fdf0f0", borderRadius: 8, padding: 10, marginTop: 10, gap: 6 },
  errorText: { flex: 1, color: "#c0392b", fontSize: 13 },

  badgeRow: { alignItems: "center", marginBottom: 14 },
  badge: { paddingHorizontal: 22, paddingVertical: 8, borderRadius: 20 },
  badgeGreen: { backgroundColor: "#d4efdf" },
  badgeRed: { backgroundColor: "#fadbd8" },
  badgeText: { fontWeight: "700", fontSize: 14, color: "#2c3e50" },

  speciesBlock: { alignItems: "center", paddingVertical: 16, gap: 8 },
  speciesIconBg: { width: 72, height: 72, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  speciesEnglish: { fontSize: 26, fontWeight: "800", color: "#0f172a", textAlign: "center" },
  speciesSinhalaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  speciesSinhala: { fontSize: 22, fontWeight: "700", color: "#0057FF" },
  speciesRomanized: { fontSize: 14, color: "#64748b", fontStyle: "italic" },
  confBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#eff6ff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 4 },
  confBadgeText: { fontSize: 13, fontWeight: "600", color: "#0057FF" },

  stages: { gap: 8, marginTop: 8, marginBottom: 4 },
  stageRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stageBadge: { width: 28, height: 28, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  stageBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  stageLabel: { flex: 1, fontSize: 14, color: "#2c3e50", textTransform: "capitalize" },
  stageConf: { fontSize: 13, fontWeight: "600", color: "#636e72" },

  warnBox: { backgroundColor: "#fef9e7", borderRadius: 8, padding: 10, gap: 4, marginTop: 8 },
  warnText: { color: "#d68910", fontSize: 12 },

  mismatchBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#fff5f5", borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: "#fca5a5" },
  mismatchTitle: { fontSize: 14, fontWeight: "800", color: "#e74c3c", marginBottom: 4 },
  mismatchRow: { fontSize: 13, color: "#374151", marginBottom: 1 },
  mismatchSide: { fontWeight: "700", color: "#0f172a" },
  mismatchHint: { fontSize: 11, color: "#9ca3af", marginTop: 6, fontStyle: "italic" },

  notFishBox: { alignItems: "center", paddingVertical: 20, gap: 10 },
  notFishText: { fontSize: 16, color: "#7f8c8d", textAlign: "center", fontWeight: "600" },
  notFishSub: { fontSize: 13, color: "#94a3b8", fontWeight: "500" },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { color: "#b2bec3", textAlign: "center", fontSize: 14, lineHeight: 22 },

  unknownNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#fde68a",
    maxWidth: "92%",
  },
  unknownNoteText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 17 },

  notFishHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    maxWidth: "92%",
  },
  notFishHintText: { flex: 1, fontSize: 12, color: "#1e40af", lineHeight: 17 },
});