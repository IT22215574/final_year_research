// components/FishMeasurementModal.tsx
// Full-screen modal for interactive fish length and girth measurement.
// User marks points on the fish image; measurements are calculated in real-time
// using the calibration from MeasurementCalibrationModal.

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  PanResponder,
  TextInput,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Line, Circle, Text as SvgText } from "react-native-svg";

import type {
  Point,
  CalibrationData,
  LinearMeasurement,
  MeasurementAction,
} from "@/types/measurement";
import {
  distance,
  pixelsToCm,
  createMeasurement,
  createManualMeasurement,
  validateMeasurement,
} from "@/utils/measurementUtils";
import { SPECIES_GUIDES } from "@/types/measurement";

type DrawMode = "length" | "girth";

interface FishMeasurementModalProps {
  visible: boolean;
  imageUri: string;
  calibration: CalibrationData;
  speciesKey: string;
  onComplete: (length: LinearMeasurement, girth?: LinearMeasurement) => void;
  onCancel: () => void;
}

export default function FishMeasurementModal({
  visible,
  imageUri,
  calibration,
  speciesKey,
  onComplete,
  onCancel,
}: FishMeasurementModalProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<DrawMode>("length");
  const [lengthPoints, setLengthPoints] = useState<Point[]>([]);
  const [girthPoints, setGirthPoints] = useState<Point[]>([]);
  const [history, setHistory] = useState<MeasurementAction[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLength, setManualLength] = useState("");
  const [manualGirth, setManualGirth] = useState("");

  const guide = SPECIES_GUIDES[speciesKey];

  // ── Touch handler ──────────────────────────────────────────────────────
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const point: Point = { x: locationX, y: locationY };

          if (mode === "length" && lengthPoints.length < 2) {
            setLengthPoints((prev) => [...prev, point]);
            setHistory((prev) => [
              ...prev,
              { type: "add-point", target: "length", point, timestamp: Date.now() },
            ]);
          } else if (mode === "girth" && girthPoints.length < 2) {
            setGirthPoints((prev) => [...prev, point]);
            setHistory((prev) => [
              ...prev,
              { type: "add-point", target: "girth", point, timestamp: Date.now() },
            ]);
          }
        },
      }),
    [mode, lengthPoints.length, girthPoints.length]
  );

  // ── Computed measurements ──────────────────────────────────────────────
  const lengthMeasurement = useMemo(() => {
    if (lengthPoints.length < 2) return null;
    return createMeasurement(
      { start: lengthPoints[0], end: lengthPoints[1] },
      calibration,
      guide?.typicalLengthRange
    );
  }, [lengthPoints, calibration, guide]);

  const girthMeasurement = useMemo(() => {
    if (girthPoints.length < 2) return null;
    return createMeasurement(
      { start: girthPoints[0], end: girthPoints[1] },
      calibration,
      guide?.typicalGirthRange
    );
  }, [girthPoints, calibration, guide]);

  const lengthPxDist =
    lengthPoints.length === 2
      ? distance(lengthPoints[0], lengthPoints[1])
      : 0;
  const girthPxDist =
    girthPoints.length === 2
      ? distance(girthPoints[0], girthPoints[1])
      : 0;

  const lengthCm = lengthPxDist > 0 ? pixelsToCm(lengthPxDist, calibration) : 0;
  const girthCm = girthPxDist > 0 ? pixelsToCm(girthPxDist, calibration) : 0;

  // Validation warnings
  const lengthWarning = lengthMeasurement
    ? validateMeasurement("length", lengthMeasurement.valueCm, speciesKey)
    : null;
  const girthWarning = girthMeasurement
    ? validateMeasurement("girth", girthMeasurement.valueCm, speciesKey)
    : null;

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;

      if (last.target === "length") {
        setLengthPoints((p) => p.slice(0, -1));
      } else if (last.target === "girth") {
        setGirthPoints((p) => p.slice(0, -1));
      }
      return prev.slice(0, -1);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setLengthPoints([]);
    setGirthPoints([]);
    setHistory([]);
    setMode("length");
  }, []);

  const handleConfirm = useCallback(() => {
    if (!lengthMeasurement) {
      Alert.alert("Missing Length", "Please mark the fish length before confirming.");
      return;
    }
    onComplete(lengthMeasurement, girthMeasurement ?? undefined);
  }, [lengthMeasurement, girthMeasurement, onComplete]);

  const handleManualConfirm = useCallback(() => {
    const len = parseFloat(manualLength);
    if (!isFinite(len) || len <= 0) {
      Alert.alert("Invalid Length", "Please enter a valid length in cm.");
      return;
    }
    const lengthM = createManualMeasurement(len, guide?.typicalLengthRange);

    let girthM: LinearMeasurement | undefined;
    const gr = parseFloat(manualGirth);
    if (isFinite(gr) && gr > 0) {
      girthM = createManualMeasurement(gr, guide?.typicalGirthRange);
    }

    onComplete(lengthM, girthM);
  }, [manualLength, manualGirth, guide, onComplete]);

  const hasLength = lengthPoints.length === 2;
  const isComplete = hasLength;

  // ── Confidence badge ─────────────────────────────────────────────────────
  const confColor = (c?: string) => {
    if (c === "high") return "#27ae60";
    if (c === "medium") return "#f39c12";
    return "#e74c3c";
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={s.container}>
        {/* Header */}
        <LinearGradient
          colors={["#27ae60", "#2ecc71"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.header}
        >
          <TouchableOpacity onPress={onCancel} style={s.headerBtn}>
            <MaterialIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Measure Fish</Text>
          <TouchableOpacity
            onPress={() => setShowManualInput(!showManualInput)}
            style={s.headerBtn}
          >
            <MaterialIcons name="edit" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {showManualInput ? (
          // ── Manual input fallback ──
          <ScrollView contentContainerStyle={s.manualContainer}>
            <Text style={s.manualTitle}>Manual Measurement Entry</Text>
            <Text style={s.manualSub}>
              Enter measurements directly if image-based marking is difficult.
            </Text>

            <View style={s.manualField}>
              <Text style={s.manualLabel}>
                {guide?.lengthType === "fork" ? "Fork Length" : "Total Length"} (cm) *
              </Text>
              <TextInput
                style={s.manualInput}
                keyboardType="decimal-pad"
                placeholder="e.g. 48.5"
                placeholderTextColor="#94a3b8"
                value={manualLength}
                onChangeText={setManualLength}
              />
            </View>

            <View style={s.manualField}>
              <Text style={s.manualLabel}>Body Girth (cm) — optional</Text>
              <TextInput
                style={s.manualInput}
                keyboardType="decimal-pad"
                placeholder="e.g. 32.0"
                placeholderTextColor="#94a3b8"
                value={manualGirth}
                onChangeText={setManualGirth}
              />
            </View>

            <TouchableOpacity
              style={s.manualConfirmBtn}
              onPress={handleManualConfirm}
            >
              <LinearGradient
                colors={["#27ae60", "#2ecc71"]}
                style={s.manualConfirmGradient}
              >
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={s.manualConfirmText}>Apply Measurements</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            {/* Mode selector */}
            <View style={s.modeTabs}>
              <TouchableOpacity
                style={[s.modeTab, mode === "length" && s.modeTabActive]}
                onPress={() => setMode("length")}
              >
                <MaterialIcons
                  name="straighten"
                  size={16}
                  color={mode === "length" ? "#fff" : "#0057FF"}
                />
                <Text style={[s.modeTabText, mode === "length" && s.modeTabTextActive]}>
                  Length {hasLength ? "✓" : `(${lengthPoints.length}/2)`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modeTab, mode === "girth" && s.modeTabActiveGirth]}
                onPress={() => setMode("girth")}
              >
                <MaterialIcons
                  name="radio-button-unchecked"
                  size={16}
                  color={mode === "girth" ? "#fff" : "#e67e22"}
                />
                <Text
                  style={[
                    s.modeTabText,
                    { color: "#e67e22" },
                    mode === "girth" && s.modeTabTextActive,
                  ]}
                >
                  Girth {girthPoints.length === 2 ? "✓" : `(${girthPoints.length}/2)`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Instruction */}
            <Text style={s.hint}>
              {mode === "length"
                ? `Tap the snout then the ${guide?.lengthType === "fork" ? "fork of the tail" : "tip of the tail"}.`
                : "Tap the top and bottom of the widest body section."}
            </Text>

            {/* Image + SVG overlay */}
            <View style={s.imageContainer} {...panResponder.panHandlers}>
              <Image source={{ uri: imageUri }} style={s.image} resizeMode="contain" />
              <Svg style={StyleSheet.absoluteFill}>
                {/* Length line */}
                {lengthPoints.length === 2 && (
                  <>
                    <Line
                      x1={lengthPoints[0].x}
                      y1={lengthPoints[0].y}
                      x2={lengthPoints[1].x}
                      y2={lengthPoints[1].y}
                      stroke="#0057FF"
                      strokeWidth={2.5}
                    />
                    <SvgText
                      x={(lengthPoints[0].x + lengthPoints[1].x) / 2}
                      y={(lengthPoints[0].y + lengthPoints[1].y) / 2 - 10}
                      fill="#0057FF"
                      fontSize={13}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {lengthCm.toFixed(1)} cm
                    </SvgText>
                  </>
                )}
                {lengthPoints.map((p, i) => (
                  <Circle
                    key={`l${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={8}
                    fill="#0057FF"
                    stroke="#fff"
                    strokeWidth={2.5}
                  />
                ))}

                {/* Girth line */}
                {girthPoints.length === 2 && (
                  <>
                    <Line
                      x1={girthPoints[0].x}
                      y1={girthPoints[0].y}
                      x2={girthPoints[1].x}
                      y2={girthPoints[1].y}
                      stroke="#e67e22"
                      strokeWidth={2.5}
                    />
                    <SvgText
                      x={(girthPoints[0].x + girthPoints[1].x) / 2 + 12}
                      y={(girthPoints[0].y + girthPoints[1].y) / 2}
                      fill="#e67e22"
                      fontSize={13}
                      fontWeight="bold"
                      textAnchor="start"
                    >
                      {girthCm.toFixed(1)} cm
                    </SvgText>
                  </>
                )}
                {girthPoints.map((p, i) => (
                  <Circle
                    key={`g${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={8}
                    fill="#e67e22"
                    stroke="#fff"
                    strokeWidth={2.5}
                  />
                ))}
              </Svg>
            </View>

            {/* Live readout */}
            <View style={s.readout}>
              <View style={s.readoutTile}>
                <Text style={s.readoutLabel}>Length</Text>
                <Text style={[s.readoutValue, { color: "#0057FF" }]}>
                  {lengthCm > 0 ? `${lengthCm.toFixed(1)} cm` : "—"}
                </Text>
                {lengthMeasurement && (
                  <View
                    style={[
                      s.confBadge,
                      { backgroundColor: confColor(lengthMeasurement.confidence) + "22" },
                    ]}
                  >
                    <Text
                      style={[s.confText, { color: confColor(lengthMeasurement.confidence) }]}
                    >
                      {lengthMeasurement.confidence}
                    </Text>
                  </View>
                )}
              </View>
              <View style={s.readoutTile}>
                <Text style={s.readoutLabel}>Girth</Text>
                <Text style={[s.readoutValue, { color: "#e67e22" }]}>
                  {girthCm > 0 ? `${girthCm.toFixed(1)} cm` : "—"}
                </Text>
                {girthMeasurement && (
                  <View
                    style={[
                      s.confBadge,
                      { backgroundColor: confColor(girthMeasurement.confidence) + "22" },
                    ]}
                  >
                    <Text
                      style={[s.confText, { color: confColor(girthMeasurement.confidence) }]}
                    >
                      {girthMeasurement.confidence}
                    </Text>
                  </View>
                )}
              </View>
              <View style={s.readoutTile}>
                <Text style={s.readoutLabel}>px/cm</Text>
                <Text style={s.readoutValue}>
                  {calibration.pixelsPerCm.toFixed(1)}
                </Text>
              </View>
            </View>

            {/* Warnings */}
            {(lengthWarning || girthWarning) && (
              <View style={s.warnBox}>
                {lengthWarning && (
                  <View style={s.warnRow}>
                    <MaterialIcons name="warning" size={13} color="#d68910" />
                    <Text style={s.warnText}>{lengthWarning}</Text>
                  </View>
                )}
                {girthWarning && (
                  <View style={s.warnRow}>
                    <MaterialIcons name="warning" size={13} color="#d68910" />
                    <Text style={s.warnText}>{girthWarning}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Action bar */}
            <View style={s.actionRow}>
              <TouchableOpacity style={s.undoBtn} onPress={handleUndo} disabled={history.length === 0}>
                <MaterialIcons
                  name="undo"
                  size={18}
                  color={history.length > 0 ? "#e74c3c" : "#cbd5e1"}
                />
              </TouchableOpacity>
              <TouchableOpacity style={s.clearBtn} onPress={handleClearAll}>
                <MaterialIcons name="delete-outline" size={18} color="#e74c3c" />
                <Text style={s.clearBtnText}>Clear All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.confirmBtn, !isComplete && s.confirmBtnDisabled]}
                onPress={handleConfirm}
                disabled={!isComplete}
              >
                <LinearGradient
                  colors={isComplete ? ["#27ae60", "#2ecc71"] : ["#95a5a6", "#7f8c8d"]}
                  style={s.confirmGradient}
                >
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={s.confirmText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 44,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },

  modeTabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#0057FF",
    backgroundColor: "#fff",
  },
  modeTabActive: {
    backgroundColor: "#0057FF",
  },
  modeTabActiveGirth: {
    backgroundColor: "#e67e22",
    borderColor: "#e67e22",
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0057FF",
  },
  modeTabTextActive: {
    color: "#fff",
  },

  hint: {
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },

  imageContainer: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },

  readout: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  readoutTile: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 2,
  },
  readoutLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  readoutValue: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  confBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  confText: { fontSize: 10, fontWeight: "700" },

  warnBox: {
    marginHorizontal: 12,
    marginTop: 4,
    backgroundColor: "#fef9e7",
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  warnRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  warnText: { flex: 1, color: "#92400e", fontSize: 11, lineHeight: 16 },

  actionRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 30,
  },
  undoBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    backgroundColor: "#fff",
  },
  clearBtnText: { color: "#e74c3c", fontWeight: "600", fontSize: 12 },
  confirmBtn: { flex: 1, borderRadius: 10, overflow: "hidden" },
  confirmBtnDisabled: { opacity: 0.55 },
  confirmGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 13,
  },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Manual input
  manualContainer: {
    padding: 20,
    gap: 16,
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  manualSub: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 20,
  },
  manualField: { gap: 6 },
  manualLabel: { fontSize: 13, fontWeight: "600", color: "#334155" },
  manualInput: {
    borderWidth: 1.5,
    borderColor: "#a8e6c1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  manualConfirmBtn: { borderRadius: 10, overflow: "hidden", marginTop: 8 },
  manualConfirmGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
  },
  manualConfirmText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
