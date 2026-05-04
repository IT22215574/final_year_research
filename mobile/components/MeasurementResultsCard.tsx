// components/MeasurementResultsCard.tsx
// Display measured length, girth, and estimated weight with confidence feedback.

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import type {
  FishMeasurements,
  MeasurementConfidence,
} from "@/types/measurement";
import { SPECIES_INFO, type SupportedSpecies } from "@/utils/fishWeight";

// ── Size category display helpers ─────────────────────────────────────────────
const SIZE_CAT_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
  small:  { color: "#e67e22", bg: "#fef3e7", icon: "compress" },
  medium: { color: "#0057FF", bg: "#e8f0fe", icon: "swap-vert" },
  large:  { color: "#27ae60", bg: "#edfbf0", icon: "expand" },
};

const SIZE_CAT_LABEL: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

interface MeasurementResultsCardProps {
  measurements: FishMeasurements;
  species: SupportedSpecies;
}

const confLabel: Record<MeasurementConfidence, string> = {
  high: "High Confidence",
  medium: "Medium Confidence",
  low: "Low Confidence",
};

const confColor: Record<MeasurementConfidence, string> = {
  high: "#27ae60",
  medium: "#f39c12",
  low: "#e74c3c",
};

const confIcon: Record<MeasurementConfidence, string> = {
  high: "verified",
  medium: "info-outline",
  low: "warning",
};

export default function MeasurementResultsCard({
  measurements,
  species,
}: MeasurementResultsCardProps) {
  const info = SPECIES_INFO[species];
  const w = measurements.weightEstimate;
  const weightGrams = parseFloat((w.valueKg * 1000).toFixed(1));

  // Determine overall confidence from component measurements
  const overallConfidence = useMemo<MeasurementConfidence>(() => {
    const confidences: MeasurementConfidence[] = [measurements.length.confidence];
    if (measurements.girth) confidences.push(measurements.girth.confidence);

    if (confidences.every((c) => c === "high")) return "high";
    if (confidences.some((c) => c === "low")) return "low";
    return "medium";
  }, [measurements]);

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <LinearGradient colors={["#27ae60", "#2ecc71"]} style={s.headerIcon}>
          <MaterialIcons name="assessment" size={20} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Measurement Results</Text>
          <Text style={s.headerSub}>{info.displayName}</Text>
        </View>
        <View
          style={[
            s.overallBadge,
            { backgroundColor: confColor[overallConfidence] + "1A" },
          ]}
        >
          <MaterialIcons
            name={confIcon[overallConfidence] as any}
            size={14}
            color={confColor[overallConfidence]}
          />
          <Text style={[s.overallText, { color: confColor[overallConfidence] }]}>
            {confLabel[overallConfidence]}
          </Text>
        </View>
      </View>

      {/* Measurement tiles */}
      <View style={s.tileRow}>
        {/* Length */}
        <View style={s.tile}>
          <MaterialIcons name="straighten" size={20} color="#0057FF" />
          <Text style={[s.tileValue, { color: "#0057FF" }]}>
            {measurements.length.valueCm.toFixed(1)}
          </Text>
          <Text style={s.tileUnit}>cm</Text>
          <Text style={s.tileLabel}>Length</Text>
          <View
            style={[
              s.tileConf,
              { backgroundColor: confColor[measurements.length.confidence] + "22" },
            ]}
          >
            <Text
              style={[
                s.tileConfText,
                { color: confColor[measurements.length.confidence] },
              ]}
            >
              {measurements.length.confidence}
            </Text>
          </View>
        </View>

        {/* Girth (optional) */}
        {measurements.girth ? (
          <View style={s.tile}>
            <MaterialIcons name="radio-button-unchecked" size={20} color="#e67e22" />
            <Text style={[s.tileValue, { color: "#e67e22" }]}>
              {measurements.girth.valueCm.toFixed(1)}
            </Text>
            <Text style={s.tileUnit}>cm</Text>
            <Text style={s.tileLabel}>Girth</Text>
            <View
              style={[
                s.tileConf,
                { backgroundColor: confColor[measurements.girth.confidence] + "22" },
              ]}
            >
              <Text
                style={[
                  s.tileConfText,
                  { color: confColor[measurements.girth.confidence] },
                ]}
              >
                {measurements.girth.confidence}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[s.tile, { borderStyle: "dashed" }]}>
            <MaterialIcons name="radio-button-unchecked" size={20} color="#cbd5e1" />
            <Text style={[s.tileValue, { color: "#cbd5e1" }]}>—</Text>
            <Text style={s.tileLabel}>Girth</Text>
            <Text style={{ fontSize: 9, color: "#94a3b8" }}>not measured</Text>
          </View>
        )}

        {/* Weight */}
        <View style={[s.tile, s.tilePrimary]}>
          <MaterialIcons name="scale" size={20} color="#27ae60" />
          <Text style={[s.tileValue, { color: "#27ae60" }]}>
            {w.valueKg.toFixed(3)}
          </Text>
          <Text style={s.tileUnit}>kg</Text>
          <Text style={s.tileLabel}>Est. Weight</Text>
        </View>
      </View>

      {/* Grams row */}
      <View style={s.gramsRow}>
        <MaterialIcons name="grain" size={14} color="#64748b" />
        <Text style={s.gramsText}>
          {weightGrams.toFixed(0)} grams
        </Text>
      </View>

      {/* Size Category — only displayed for Skipjack Tuna */}
      {species === "skipjack_tuna" && w.sizeCategory && (
        <View
          style={[
            s.sizeCatBox,
            { backgroundColor: SIZE_CAT_STYLES[w.sizeCategory].bg },
          ]}
        >
          <MaterialIcons
            name={SIZE_CAT_STYLES[w.sizeCategory].icon as any}
            size={18}
            color={SIZE_CAT_STYLES[w.sizeCategory].color}
          />
          <Text
            style={[
              s.sizeCatLabel,
              { color: SIZE_CAT_STYLES[w.sizeCategory].color },
            ]}
          >
            Size Category: {SIZE_CAT_LABEL[w.sizeCategory]}
          </Text>
          <View
            style={[
              s.sizeCatBadge,
              { backgroundColor: SIZE_CAT_STYLES[w.sizeCategory].color + "22" },
            ]}
          >
            <Text
              style={[
                s.sizeCatBadgeText,
                { color: SIZE_CAT_STYLES[w.sizeCategory].color },
              ]}
            >
              {w.sizeCategory.toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      {/* Method & formula */}
      <View style={s.formulaBox}>
        <View style={s.methodRow}>
          <View
            style={[
              s.methodBadge,
              {
                backgroundColor:
                  w.method === "research-length-weight" ? "#8e44ad22" : "#0057FF22",
              },
            ]}
          >
            <Text
              style={[
                s.methodText,
                {
                  color: w.method === "research-length-weight" ? "#8e44ad" : "#0057FF",
                },
              ]}
            >
              {w.method === "research-length-weight" ? "Research Formula" : "Length Only"}
            </Text>
          </View>
          <Text style={s.confPercent}>
            {(w.confidence * 100).toFixed(0)}% confidence
          </Text>
        </View>
        {w.formula && <Text style={s.formulaText}>{w.formula}</Text>}
        <Text style={s.formulaSub}>
          {species === "skipjack_tuna"
            ? "Estimated using skipjack tuna length-weight research formula"
            : "Decapterus russelli — FishBase length-weight relation"}
        </Text>
        {species === "skipjack_tuna" && measurements.girth && (
          <Text style={s.formulaSub}>
            Girth ({measurements.girth.valueCm.toFixed(1)} cm) recorded for validation — not used in primary formula
          </Text>
        )}
      </View>

      {/* Calibration info */}
      <View style={s.calInfo}>
        <MaterialIcons name="settings" size={12} color="#94a3b8" />
        <Text style={s.calText}>
          Calibration: {measurements.calibration.pixelsPerCm.toFixed(1)} px/cm
          {measurements.calibration.referenceObjectType
            ? ` · ${measurements.calibration.referenceObjectType.replace(/_/g, " ")}`
            : ""}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#2c3e50" },
  headerSub: { fontSize: 12, color: "#64748b", fontStyle: "italic" },
  overallBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  overallText: { fontSize: 11, fontWeight: "700" },

  tileRow: {
    flexDirection: "row",
    gap: 8,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f9fffe",
    gap: 2,
  },
  tilePrimary: {
    borderColor: "#a8e6c1",
    backgroundColor: "#edfbf0",
  },
  tileValue: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  tileUnit: { fontSize: 11, color: "#64748b" },
  tileLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  tileConf: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
  },
  tileConfText: { fontSize: 9, fontWeight: "700", textTransform: "capitalize" },

  gramsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  gramsText: { fontSize: 13, color: "#64748b", fontWeight: "600" },

  formulaBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  methodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  methodBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  methodText: { fontSize: 11, fontWeight: "700" },
  confPercent: { fontSize: 11, color: "#94a3b8" },
  formulaText: {
    fontSize: 11,
    color: "#0f172a",
    fontFamily: "monospace",
    lineHeight: 16,
  },
  formulaSub: { fontSize: 10, color: "#94a3b8", fontStyle: "italic" },

  // ── Size category styles (Skipjack Tuna only) ─────────────────────────
  sizeCatBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sizeCatLabel: { flex: 1, fontSize: 14, fontWeight: "700" },
  sizeCatBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sizeCatBadgeText: { fontSize: 12, fontWeight: "800" },

  calInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  calText: { fontSize: 10, color: "#94a3b8" },
});
