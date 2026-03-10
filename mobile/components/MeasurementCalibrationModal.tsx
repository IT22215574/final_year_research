// components/MeasurementCalibrationModal.tsx
// Full-screen modal guiding the user to calibrate by marking a known-size
// reference object (ruler, card, crate, etc.) on the captured image.

import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  PanResponder,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Line, Circle } from "react-native-svg";

import {
  REFERENCE_OBJECTS as REF_OBJECTS,
  type Point,
  type CalibrationData,
} from "@/types/measurement";
import {
  distance,
  buildCalibration,
} from "@/utils/measurementUtils";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface MeasurementCalibrationModalProps {
  visible: boolean;
  imageUri: string;
  onCalibrated: (calibration: CalibrationData) => void;
  onCancel: () => void;
}

export default function MeasurementCalibrationModal({
  visible,
  imageUri,
  onCalibrated,
  onCancel,
}: MeasurementCalibrationModalProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<"select-ref" | "mark-points">("select-ref");
  const [selectedRef, setSelectedRef] = useState<typeof REF_OBJECTS[number] | null>(null);
  const [customSize, setCustomSize] = useState("");
  const [points, setPoints] = useState<Point[]>([]);

  const imageLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const refSizeCm = useMemo(() => {
    if (!selectedRef) return 0;
    if (selectedRef.key === "custom") {
      const v = parseFloat(customSize);
      return isFinite(v) && v > 0 ? v : 0;
    }
    return selectedRef.sizeCm;
  }, [selectedRef, customSize]);

  // ── Touch handler ──────────────────────────────────────────────────────
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (points.length >= 2) return;
          const { locationX, locationY } = evt.nativeEvent;
          setPoints((prev) => [...prev, { x: locationX, y: locationY }]);
        },
      }),
    [points.length]
  );

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleRefSelect = useCallback((ref: typeof REF_OBJECTS[number]) => {
    setSelectedRef(ref);
    if (ref.key !== "custom") {
      setStep("mark-points");
    }
  }, []);

  const handleConfirmCustom = useCallback(() => {
    const v = parseFloat(customSize);
    if (!isFinite(v) || v <= 0) {
      Alert.alert("Invalid Size", "Please enter a positive number in cm.");
      return;
    }
    setStep("mark-points");
  }, [customSize]);

  const handleUndo = useCallback(() => {
    setPoints((prev) => prev.slice(0, -1));
  }, []);

  const handleConfirm = useCallback(() => {
    if (points.length < 2 || refSizeCm <= 0) return;
    try {
      const calibration = buildCalibration(
        [points[0], points[1]] as [Point, Point],
        refSizeCm,
        selectedRef?.key
      );
      onCalibrated(calibration);
    } catch (e: any) {
      Alert.alert("Calibration Error", e?.message ?? "Could not calibrate.");
    }
  }, [points, refSizeCm, selectedRef, onCalibrated]);

  const handleReset = useCallback(() => {
    setPoints([]);
    setStep("select-ref");
    setSelectedRef(null);
    setCustomSize("");
  }, []);

  // ── Computed ─────────────────────────────────────────────────────────────
  const pixelDist =
    points.length === 2 ? distance(points[0], points[1]) : 0;
  const isComplete = points.length === 2 && refSizeCm > 0;
  const pxPerCm = isComplete ? (pixelDist / refSizeCm).toFixed(1) : "—";

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={s.container}>
        {/* Header */}
        <LinearGradient
          colors={["#0057FF", "#00C6FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.header}
        >
          <TouchableOpacity onPress={onCancel} style={s.headerBtn}>
            <MaterialIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {step === "select-ref" ? "Select Reference Object" : "Mark Reference"}
          </Text>
          <TouchableOpacity onPress={handleReset} style={s.headerBtn}>
            <MaterialIcons name="restart-alt" size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {step === "select-ref" ? (
          // ── Step 1: Choose reference object ──
          <ScrollView contentContainerStyle={s.refList}>
            <Text style={s.instruction}>
              Choose a reference object that is visible in the image.
              You'll mark its ends to calibrate measurements.
            </Text>
            {REF_OBJECTS.map((ref) => (
              <TouchableOpacity
                key={ref.key}
                style={[
                  s.refCard,
                  selectedRef?.key === ref.key && s.refCardSelected,
                ]}
                onPress={() => handleRefSelect(ref)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={ref.icon as any}
                  size={28}
                  color={selectedRef?.key === ref.key ? "#0057FF" : "#64748b"}
                />
                <View style={s.refInfo}>
                  <Text style={s.refLabel}>{ref.label}</Text>
                  <Text style={s.refDesc}>{ref.description}</Text>
                  {ref.key !== "custom" && (
                    <Text style={s.refSize}>{ref.sizeCm} cm</Text>
                  )}
                </View>
                <MaterialIcons
                  name={
                    selectedRef?.key === ref.key
                      ? "radio-button-checked"
                      : "radio-button-unchecked"
                  }
                  size={22}
                  color={selectedRef?.key === ref.key ? "#0057FF" : "#cbd5e1"}
                />
              </TouchableOpacity>
            ))}

            {/* Custom size input */}
            {selectedRef?.key === "custom" && (
              <View style={s.customRow}>
                <TextInput
                  style={s.customInput}
                  placeholder="Enter size in cm"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={customSize}
                  onChangeText={setCustomSize}
                />
                <TouchableOpacity
                  style={s.customBtn}
                  onPress={handleConfirmCustom}
                >
                  <Text style={s.customBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        ) : (
          // ── Step 2: Mark the two ends on the image ──
          <View style={s.markArea}>
            <Text style={s.markInstruction}>
              Tap the <Text style={{ fontWeight: "800", color: "#0057FF" }}>two ends</Text> of the{" "}
              <Text style={{ fontWeight: "800" }}>
                {selectedRef?.label ?? "reference object"}
              </Text>{" "}
              ({refSizeCm} cm) on the image below.
            </Text>

            {/* Image + overlay */}
            <View
              style={s.imageContainer}
              onLayout={(e) => {
                imageLayoutRef.current = e.nativeEvent.layout;
              }}
              {...panResponder.panHandlers}
            >
              <Image
                source={{ uri: imageUri }}
                style={s.image}
                resizeMode="contain"
              />

              {/* SVG overlay for points and line */}
              <Svg style={StyleSheet.absoluteFill}>
                {points.length === 2 && (
                  <Line
                    x1={points[0].x}
                    y1={points[0].y}
                    x2={points[1].x}
                    y2={points[1].y}
                    stroke="#0057FF"
                    strokeWidth={2.5}
                    strokeDasharray="6,4"
                  />
                )}
                {points.map((p, i) => (
                  <Circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={8}
                    fill={i === 0 ? "#0057FF" : "#00C6FF"}
                    stroke="#fff"
                    strokeWidth={2.5}
                  />
                ))}
              </Svg>
            </View>

            {/* Real-time info */}
            <View style={s.infoRow}>
              <View style={s.infoPill}>
                <Text style={s.infoLabel}>Points</Text>
                <Text style={s.infoValue}>{points.length} / 2</Text>
              </View>
              <View style={s.infoPill}>
                <Text style={s.infoLabel}>Pixel Dist</Text>
                <Text style={s.infoValue}>
                  {pixelDist > 0 ? pixelDist.toFixed(0) + " px" : "—"}
                </Text>
              </View>
              <View style={s.infoPill}>
                <Text style={s.infoLabel}>px/cm</Text>
                <Text style={s.infoValue}>{pxPerCm}</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={s.actionRow}>
              <TouchableOpacity
                style={s.undoBtn}
                onPress={handleUndo}
                disabled={points.length === 0}
              >
                <MaterialIcons
                  name="undo"
                  size={18}
                  color={points.length > 0 ? "#e74c3c" : "#cbd5e1"}
                />
                <Text
                  style={[
                    s.undoBtnText,
                    points.length === 0 && { color: "#cbd5e1" },
                  ]}
                >
                  Undo
                </Text>
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
                  <Text style={s.confirmText}>Confirm Calibration</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
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
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Step 1: ref list ──────────────────────────────────────────────────────
  refList: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  instruction: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 4,
  },
  refCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  refCardSelected: {
    borderColor: "#0057FF",
    backgroundColor: "#f0f7ff",
  },
  refInfo: { flex: 1, gap: 2 },
  refLabel: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  refDesc: { fontSize: 11, color: "#64748b" },
  refSize: { fontSize: 12, fontWeight: "600", color: "#0057FF" },
  customRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "stretch",
    marginTop: 4,
  },
  customInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#0057FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  customBtn: {
    backgroundColor: "#0057FF",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  customBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // ── Step 2: mark area ─────────────────────────────────────────────────────
  markArea: {
    flex: 1,
    padding: 12,
    gap: 10,
  },
  markInstruction: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    textAlign: "center",
  },
  imageContainer: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 8,
  },
  infoPill: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  infoValue: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    backgroundColor: "#fff",
  },
  undoBtnText: { color: "#e74c3c", fontWeight: "600", fontSize: 13 },
  confirmBtn: { flex: 1, borderRadius: 10, overflow: "hidden" },
  confirmBtnDisabled: { opacity: 0.55 },
  confirmGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
  },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
