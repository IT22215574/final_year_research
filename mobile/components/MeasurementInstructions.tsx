// components/MeasurementInstructions.tsx
// Visual guide showing where to measure fork-length and girth for each species.

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SPECIES_GUIDES, type SpeciesMeasurementGuide } from "@/types/measurement";

interface MeasurementInstructionsProps {
  /** Internal species key, e.g. "skipjack_tuna" or "indian_scad" */
  speciesKey: string;
  /** Whether to show the girth instructions (default true) */
  showGirth?: boolean;
  /** Compact mode reduces vertical padding */
  compact?: boolean;
}

export default function MeasurementInstructions({
  speciesKey,
  showGirth = true,
  compact = false,
}: MeasurementInstructionsProps) {
  const guide = SPECIES_GUIDES[speciesKey];
  if (!guide) return null;

  return (
    <View style={[s.container, compact && s.containerCompact]}>
      <View style={s.header}>
        <MaterialIcons name="menu-book" size={18} color="#27ae60" />
        <Text style={s.headerText}>How to Measure — {guide.species}</Text>
      </View>

      {/* Length instruction */}
      <View style={s.step}>
        <View style={[s.stepBadge, { backgroundColor: "#0057FF" }]}>
          <Text style={s.stepBadgeText}>1</Text>
        </View>
        <View style={s.stepContent}>
          <Text style={s.stepTitle}>
            {guide.lengthType === "fork" ? "Fork Length" : "Total Length"}
          </Text>
          <Text style={s.stepDesc}>{guide.lengthInstruction}</Text>
          <View style={s.rangeRow}>
            <MaterialIcons name="straighten" size={12} color="#64748b" />
            <Text style={s.rangeText}>
              Typical: {guide.typicalLengthRange.min}–
              {guide.typicalLengthRange.max} cm
            </Text>
          </View>
        </View>
      </View>

      {/* Girth instruction */}
      {showGirth && (
        <View style={s.step}>
          <View style={[s.stepBadge, { backgroundColor: "#e67e22" }]}>
            <Text style={s.stepBadgeText}>2</Text>
          </View>
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Body Girth (optional)</Text>
            <Text style={s.stepDesc}>{guide.girthInstruction}</Text>
            <View style={s.rangeRow}>
              <MaterialIcons name="radio-button-unchecked" size={12} color="#64748b" />
              <Text style={s.rangeText}>
                Typical: {guide.typicalGirthRange.min}–
                {guide.typicalGirthRange.max} cm
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Diagram — simple ASCII art showing measurement lines */}
      <View style={s.diagram}>
        <Text style={s.diagramTitle}>📐 Measurement Diagram</Text>
        <View style={s.fishOutline}>
          {/* Simplified visual guide */}
          <View style={s.fishBody}>
            <Text style={s.fishEmoji}>🐟</Text>
          </View>
          <View style={s.lengthLine}>
            <View style={[s.dot, { backgroundColor: "#0057FF" }]} />
            <View style={[s.dashLine, { backgroundColor: "#0057FF" }]} />
            <View style={[s.dot, { backgroundColor: "#0057FF" }]} />
          </View>
          <Text style={s.lengthLabel}>
            ← {guide.lengthType === "fork" ? "Fork" : "Total"} Length →
          </Text>
          {showGirth && (
            <>
              <View style={s.girthIndicator}>
                <View style={[s.dot, { backgroundColor: "#e67e22" }]} />
                <View style={[s.dashLine, { backgroundColor: "#e67e22", width: 30 }]} />
                <View style={[s.dot, { backgroundColor: "#e67e22" }]} />
              </View>
              <Text style={s.girthLabel}>↕ Girth</Text>
            </>
          )}
        </View>
      </View>

      {/* Notes */}
      {guide.notes.length > 0 && (
        <View style={s.notes}>
          {guide.notes.map((note, i) => (
            <View key={i} style={s.noteRow}>
              <MaterialIcons name="lightbulb-outline" size={13} color="#d68910" />
              <Text style={s.noteText}>{note}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  containerCompact: { padding: 12, gap: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  step: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  stepBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  stepContent: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  stepDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  rangeText: {
    fontSize: 11,
    color: "#64748b",
    fontStyle: "italic",
  },
  diagram: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  diagramTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  fishOutline: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  fishBody: {
    alignItems: "center",
  },
  fishEmoji: {
    fontSize: 48,
  },
  lengthLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dashLine: {
    height: 2,
    width: 120,
    borderRadius: 1,
  },
  lengthLabel: {
    fontSize: 11,
    color: "#0057FF",
    fontWeight: "600",
    marginTop: 2,
  },
  girthIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 6,
  },
  girthLabel: {
    fontSize: 11,
    color: "#e67e22",
    fontWeight: "600",
    marginTop: 2,
  },
  notes: {
    backgroundColor: "#fef9e7",
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    color: "#92400e",
    lineHeight: 16,
  },
});
