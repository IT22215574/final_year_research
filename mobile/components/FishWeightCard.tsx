// components/FishWeightCard.tsx
// Reusable card that estimates a fish's weight from its measured length.
//
// Workflow:
//   1. User can tap "Auto-Measure" to attempt server-side pixel measurement.
//   2. If the server is unavailable (or the user prefers), a manual text input
//      accepts the length in centimetres.
//   3. Weight is computed on-device using species-specific formulas from
//      utils/fishWeight.ts.

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";

import {
  estimateFishWeight,
  resolveSpecies,
  lengthRangeWarning,
  SPECIES_INFO,
  type WeightEstimate,
  type SupportedSpecies,
} from "@/utils/fishWeight";
import {
  extractFishLengthFromImage,
  averageLengthFromBothImages,
  manualMeasurement,
  type FishLengthMeasurement,
} from "@/utils/imageMeasurement";

// ── Component props ───────────────────────────────────────────────────────────

export interface FishWeightCardProps {
  /** Raw model label, e.g. "tuna" or "makerel" */
  modelLabel: string;
  /** URI of the left-side image captured by the user */
  leftImageUri?: string | null;
  /** URI of the right-side image captured by the user */
  rightImageUri?: string | null;
  /** FastAPI backend base URL (e.g. "http://192.168.1.100:8000") */
  apiBase?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FishWeightCard({
  modelLabel,
  leftImageUri,
  rightImageUri,
  apiBase = process.env.EXPO_PUBLIC_FISH_API_URL ?? "http://10.0.2.2:8000",
}: FishWeightCardProps) {
  // ── state ──────────────────────────────────────────────────────────────────
  const [manualLength, setManualLength] = useState("");
  const [estimate, setEstimate] = useState<WeightEstimate | null>(null);
  const [measurement, setMeasurement] = useState<FishLengthMeasurement | null>(
    null
  );
  const [measuring, setMeasuring] = useState(false);
  const [measureError, setMeasureError] = useState<string | null>(null);
  const [rangeWarn, setRangeWarn] = useState<string | null>(null);

  const species = resolveSpecies(modelLabel) as SupportedSpecies | null;

  // ── helpers ────────────────────────────────────────────────────────────────

  const applyLength = useCallback(
    (lengthCm: number, src: FishLengthMeasurement) => {
      setMeasurement(src);
      setManualLength(String(lengthCm));

      if (!species) return;
      const est = estimateFishWeight(modelLabel, lengthCm);
      setEstimate(est);
      setRangeWarn(lengthRangeWarning(species, lengthCm));
    },
    [modelLabel, species]
  );

  // ── auto-measure via backend ───────────────────────────────────────────────

  const autoMeasure = useCallback(async () => {
    if (!leftImageUri && !rightImageUri) {
      setMeasureError("No images available for measurement.");
      return;
    }

    setMeasuring(true);
    setMeasureError(null);

    try {
      const [leftM, rightM] = await Promise.all([
        leftImageUri
          ? extractFishLengthFromImage(leftImageUri, apiBase, "left")
          : Promise.resolve(null),
        rightImageUri
          ? extractFishLengthFromImage(rightImageUri, apiBase, "right")
          : Promise.resolve(null),
      ]);

      const combined = averageLengthFromBothImages(leftM, rightM);

      if (!combined) {
        setMeasureError(
          "Auto-measurement failed. Please enter the length manually."
        );
      } else {
        applyLength(combined.lengthCm, combined);
      }
    } catch (err: any) {
      setMeasureError(err?.message ?? "Auto-measurement failed.");
    } finally {
      setMeasuring(false);
    }
  }, [leftImageUri, rightImageUri, apiBase, applyLength]);

  // ── manual calculate ───────────────────────────────────────────────────────

  const calculateManual = useCallback(() => {
    const len = parseFloat(manualLength);
    if (!isFinite(len) || len <= 0) {
      setMeasureError("Please enter a valid length in centimetres.");
      return;
    }
    setMeasureError(null);
    applyLength(len, manualMeasurement(len));
  }, [manualLength, applyLength]);

  // ── early-exit when species is unsupported ─────────────────────────────────

  if (!species) return null;

  const info = SPECIES_INFO[species];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.card}>
      {/* Card header */}
      <View style={s.cardHeader}>
        <LinearGradient colors={["#27ae60", "#2ecc71"]} style={s.headerIcon}>
          <MaterialIcons name="scale" size={20} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>Weight Estimation</Text>
          <Text style={s.cardSub}>{info.scientificName}</Text>
        </View>
      </View>

      {/* ── Step 1: length input ── */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>
          <MaterialIcons name="straighten" size={13} color="#64748b" />
          {"  "}Measure fish length (cm)
        </Text>

        {/* Auto-measure button */}
        <TouchableOpacity
          style={[s.autoBtn, measuring && s.autoBtnDisabled]}
          onPress={autoMeasure}
          disabled={measuring || (!leftImageUri && !rightImageUri)}
          activeOpacity={0.8}
        >
          {measuring ? (
            <ActivityIndicator color="#27ae60" size={14} />
          ) : (
            <MaterialIcons name="photo-size-select-large" size={15} color="#27ae60" />
          )}
          <Text style={s.autoBtnText}>
            {measuring ? "Measuring…" : "Auto-Measure from Images"}
          </Text>
        </TouchableOpacity>

        {/* Manual input row */}
        <View style={s.inputRow}>
          <View style={s.inputWrapper}>
            <TextInput
              style={s.input}
              keyboardType="decimal-pad"
              placeholder="e.g. 48.2"
              placeholderTextColor="#b2bec3"
              value={manualLength}
              onChangeText={(t) => {
                setManualLength(t);
                setEstimate(null);
                setMeasurement(null);
              }}
              returnKeyType="done"
              onSubmitEditing={calculateManual}
            />
            <Text style={s.inputUnit}>cm</Text>
          </View>
          <TouchableOpacity style={s.calcBtn} onPress={calculateManual}>
            <LinearGradient
              colors={["#27ae60", "#2ecc71"]}
              style={s.calcBtnGradient}
            >
              <MaterialIcons name="calculate" size={18} color="#fff" />
              <Text style={s.calcBtnText}>Calculate</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Measurement source badge */}
        {measurement && (
          <View style={s.sourceBadge}>
            <MaterialIcons
              name={measurement.source === "auto" ? "auto-awesome" : "edit"}
              size={11}
              color={measurement.source === "auto" ? "#0057FF" : "#27ae60"}
            />
            <Text
              style={[
                s.sourceBadgeText,
                {
                  color:
                    measurement.source === "auto" ? "#0057FF" : "#27ae60",
                },
              ]}
            >
              {measurement.source === "auto"
                ? `Auto-measured · ${(measurement.confidence * 100).toFixed(0)}% confidence`
                : "Manual entry"}
            </Text>
          </View>
        )}

        {/* Error */}
        {measureError && (
          <View style={s.errorBox}>
            <MaterialIcons name="error-outline" size={14} color="#c0392b" />
            <Text style={s.errorText}>{measureError}</Text>
          </View>
        )}
      </View>

      {/* ── Step 2: result ── */}
      {estimate && (
        <View style={s.resultSection}>
          {/* Result cards row */}
          <View style={s.resultRow}>
            {/* Length */}
            <View style={[s.resultTile, { borderColor: "#a8e6c1" }]}>
              <MaterialIcons name="straighten" size={22} color="#27ae60" />
              <Text style={s.tileValue}>{estimate.lengthCm.toFixed(1)}</Text>
              <Text style={s.tileUnit}>cm</Text>
              <Text style={s.tileLabel}>Length</Text>
            </View>

            <MaterialIcons name="arrow-forward" size={20} color="#b2bec3" />

            {/* Weight kg */}
            <View style={[s.resultTile, s.resultTileHighlight]}>
              <MaterialIcons name="scale" size={22} color="#27ae60" />
              <Text style={[s.tileValue, { color: "#27ae60" }]}>
                {estimate.weightKg.toFixed(3)}
              </Text>
              <Text style={s.tileUnit}>kg</Text>
              <Text style={s.tileLabel}>Est. Weight</Text>
            </View>

            {/* Weight grams */}
            <View style={[s.resultTile, { borderColor: "#a8e6c1" }]}>
              <MaterialIcons name="grain" size={22} color="#27ae60" />
              <Text style={s.tileValue}>{estimate.weightGrams.toFixed(0)}</Text>
              <Text style={s.tileUnit}>g</Text>
              <Text style={s.tileLabel}>Grams</Text>
            </View>
          </View>

          {/* Formula used */}
          <View style={s.formulaBox}>
            <Text style={s.formulaTitle}>Formula applied</Text>
            <Text style={s.formulaText}>
              {species === "skipjack_tuna"
                ? "W = 0.00000497 × FL³·³⁹²⁹² (FL = fork length)"
                : "W = 0.005975 × L³·¹⁶⁸⁰ (L = total length)"}
            </Text>
            <Text style={s.formulaSub}>
              {species === "skipjack_tuna"
                ? "Katsuwonus pelamis — Froese & Pauly, FishBase"
                : "Decapterus russelli — FishBase length-weight relation"}
            </Text>
          </View>

          {/* Range warning */}
          {rangeWarn && (
            <View style={s.warnBox}>
              <MaterialIcons name="warning" size={13} color="#d68910" />
              <Text style={s.warnText}>{rangeWarn}</Text>
            </View>
          )}

          {/* Measurement warnings */}
          {measurement?.warnings && measurement.warnings.length > 0 && (
            <View style={s.warnBox}>
              {measurement.warnings.map((w, i) => (
                <View key={i} style={s.warnRow}>
                  <MaterialIcons name="info-outline" size={12} color="#d68910" />
                  <Text style={s.warnText}>{w}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#2c3e50" },
  cardSub: { fontSize: 12, color: "#64748b", fontStyle: "italic" },

  section: { gap: 8, marginBottom: 4 },
  sectionLabel: { fontSize: 12, color: "#64748b", fontWeight: "600" },

  autoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#a8e6c1",
    backgroundColor: "#edfbf0",
  },
  autoBtnDisabled: { opacity: 0.55 },
  autoBtnText: { fontSize: 13, fontWeight: "600", color: "#27ae60" },

  inputRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#a8e6c1",
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#f9fffe",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#0f172a",
    paddingVertical: 9,
  },
  inputUnit: { fontSize: 13, color: "#64748b", marginLeft: 4 },
  calcBtn: { borderRadius: 8, overflow: "hidden" },
  calcBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  calcBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceBadgeText: { fontSize: 11, fontWeight: "600" },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    backgroundColor: "#fdf0f0",
    borderRadius: 8,
    padding: 8,
  },
  errorText: { flex: 1, color: "#c0392b", fontSize: 12 },

  resultSection: { marginTop: 14, gap: 10 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  resultTile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 2,
    borderColor: "#ecf0f1",
    backgroundColor: "#f9fffe",
  },
  resultTileHighlight: {
    borderColor: "#a8e6c1",
    backgroundColor: "#edfbf0",
  },
  tileValue: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  tileUnit: { fontSize: 11, color: "#64748b" },
  tileLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },

  formulaBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    gap: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  formulaTitle: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  formulaText: { fontSize: 12, color: "#0f172a", fontFamily: "monospace" },
  formulaSub: { fontSize: 10, color: "#94a3b8", fontStyle: "italic" },

  warnBox: {
    backgroundColor: "#fef9e7",
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  warnRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  warnText: { flex: 1, color: "#d68910", fontSize: 11, lineHeight: 16 },
});
