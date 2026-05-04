// app/(root)/(tabs)/GradingDetail.tsx
import React, { useCallback, useEffect, useState, useMemo, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { HEADER_GRADIENT } from "@/constants";
import { useGradingRecordStore } from "@/stores/gradingRecordStore";
import type { GradingRecord } from "@/services/gradingRecordService";
import Animated, { FadeInDown } from "react-native-reanimated";

const SERVER_BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const { width: SCREEN_W } = Dimensions.get("window");

// Memoized helper functions
const gradeColor = (g?: string | null) => {
  switch (g) {
    case "A":
      return "#27ae60";
    case "B":
      return "#f39c12";
    case "C":
      return "#e74c3c";
    default:
      return "#95a5a6";
  }
};

const gradeLabel = (g?: string | null) => {
  switch (g) {
    case "A":
      return "Premium Quality";
    case "B":
      return "Standard Quality";
    case "C":
      return "Low Quality";
    default:
      return "Unknown";
  }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Confidence Bar Component
const ConfidenceBar = memo(
  ({
    value,
    color,
    label,
  }: {
    value: number;
    color: string;
    label: string;
  }) => {
    const pct = Math.min(Math.round((value ?? 0) * 100), 100);

    return (
      <View style={cb.container}>
        <View style={cb.labelContainer}>
          <Text style={cb.label}>{label}</Text>
          <Text style={[cb.percentage, { color }]}>{pct}%</Text>
        </View>
        <View style={cb.track}>
          <View
            style={[cb.fill, { width: `${pct}%`, backgroundColor: color }]}
          />
        </View>
      </View>
    );
  },
);

const cb = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  percentage: {
    fontSize: 13,
    fontWeight: "700",
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
});

ConfidenceBar.displayName = "ConfidenceBar";

// Image Gallery Component
const ImageGallery = memo(({ images }: { images: string[] }) => {
  const [imgIndex, setImgIndex] = useState(0);

  if (images.length === 0) {
    return (
      <View style={styles.noImgBox}>
        <MaterialIcons name="image" size={48} color="#94a3b8" />
        <Text style={styles.noImgText}>No image available</Text>
      </View>
    );
  }

  return (
    <View style={styles.imageWrap}>
      <Image
        source={{ uri: images[imgIndex] }}
        style={styles.mainImg}
        resizeMode="cover"
      />
      {images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbRow}
          contentContainerStyle={styles.thumbContainer}
        >
          {images.map((uri, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setImgIndex(i)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri }}
                style={[
                  styles.miniThumb,
                  imgIndex === i && styles.miniThumbActive,
                ]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
});

ImageGallery.displayName = "ImageGallery";

// Info Row Component
const InfoRow = memo(
  ({
    icon,
    label,
    value,
  }: {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    value: string;
  }) => (
    <View style={ir.container}>
      <View style={ir.iconContainer}>
        <MaterialIcons name={icon} size={16} color="#27ae60" />
      </View>
      <View style={ir.content}>
        <Text style={ir.label}>{label}</Text>
        <Text style={ir.value}>{value}</Text>
      </View>
    </View>
  ),
);

const ir = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "500",
    lineHeight: 20,
  },
});

InfoRow.displayName = "InfoRow";

// Main Component
export default function GradingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history, historyLoading, getOne, remove } = useGradingRecordStore();

  const [record, setRecord] = useState<GradingRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadRecord = async () => {
      // Try cache first
      const cached = history.find((h) => h._id === id);
      if (cached) {
        setRecord(cached);
        return;
      }

      // Fetch from API
      setLoading(true);
      try {
        const result = await getOne(id);
        if (result) {
          setRecord(result);
        } else {
          setError("Record not found");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load record");
      } finally {
        setLoading(false);
      }
    };

    loadRecord();
  }, [id, history, getOne]);

  const handleDelete = useCallback(() => {
    if (!record) return;

    Alert.alert(
      "Delete Record",
      `This action cannot be undone. Are you sure you want to delete this grading result?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await remove(record._id);
              router.back();
            } catch {
              Alert.alert(
                "Error",
                "Failed to delete record. Please try again.",
              );
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [record, remove, router]);

  const handleShare = useCallback(async () => {
    if (!record) return;

    try {
      await Share.share({
        message: `Fish Grading Result - ${record.fishName || record.fishSpecies || "Unknown"}: Grade ${record.predictedGrade || "?"}`,
        title: "Grading Result",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share");
    }
  }, [record]);

  // Memoized values
  const images = useMemo(
    () => (record?.imagePaths ?? []).map((p) => `${SERVER_BASE}${p}`),
    [record?.imagePaths],
  );

  const color = useMemo(
    () => gradeColor(record?.predictedGrade),
    [record?.predictedGrade],
  );

  const fishDisplayName = useMemo(() => {
    if (!record) return "";
    if (record.fishName) return record.fishName;
    if (record.fishSpecies) return record.fishSpecies.replace(/_/g, " ");
    return "Unknown Species";
  }, [record]);

  const formattedDate = useMemo(
    () => (record ? formatDate(record.createdAt) : ""),
    [record?.createdAt],
  );

  const formattedTime = useMemo(
    () => (record ? formatTime(record.createdAt) : ""),
    [record?.createdAt],
  );

  if (loading || historyLoading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <LinearGradient
          colors={HEADER_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={styles.headerActions}>
            <View style={styles.headerBtnPlaceholder} />
          </View>
        </LinearGradient>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !record) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <LinearGradient
          colors={HEADER_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={styles.headerActions}>
            <View style={styles.headerBtnPlaceholder} />
          </View>
        </LinearGradient>
        <View style={styles.centered}>
          <View style={styles.errorIconContainer}>
            <MaterialIcons name="error-outline" size={48} color="#e74c3c" />
          </View>
          <Text style={styles.errorMsg}>{error || "Record not found"}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {fishDisplayName}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="share" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleDelete}
            disabled={deleting}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="delete-outline" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View className="p-2">
          <Animated.View entering={FadeInDown.duration(400)}>
            <ImageGallery images={images} />
          </Animated.View>
        </View>

        {/* Grade Banner */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <LinearGradient
            colors={[`${color}15`, "#fff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradeBanner}
          >
            <View style={[styles.gradeRing, { borderColor: color }]}>
              <Text style={[styles.gradeRingText, { color }]}>
                {record.predictedGrade || "?"}
              </Text>
            </View>
            <View style={styles.gradeInfo}>
              <Text style={[styles.gradeLabel, { color }]}>
                {gradeLabel(record.predictedGrade)}
              </Text>
              <Text style={styles.gradeSub}>{fishDisplayName}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Confidence Scores */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Confidence Analysis</Text>
          <ConfidenceBar
            value={record.gradeConfidence ?? 0}
            color={color}
            label="Grade Accuracy"
          />
          <ConfidenceBar
            value={record.speciesConfidence ?? 0}
            color="#3b82f6"
            label="Species Match"
          />
        </Animated.View>

        {/* Details Section */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Details</Text>
          <InfoRow icon="calendar-today" label="Date" value={formattedDate} />
          <InfoRow icon="access-time" label="Time" value={formattedTime} />
          {record.marketStatus && (
            <InfoRow
              icon={
                record.marketStatus === "used_in_market"
                  ? "check-circle"
                  : "save"
              }
              label="Status"
              value={
                record.marketStatus === "used_in_market"
                  ? "Used in Market"
                  : "Saved"
              }
            />
          )}
          {record.notes && (
            <InfoRow icon="notes" label="Notes" value={record.notes} />
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 16,
    color: "#e74c3c",
    textAlign: "center",
    marginBottom: 8,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#27ae60",
    borderRadius: 12,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  header: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    minWidth: 70,
    justifyContent: "flex-end",
  },
  headerBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingVertical: 16,
  },
  imageWrap: {
    backgroundColor: "#1e293b",
  },
  mainImg: {
    width: SCREEN_W,
    height: SCREEN_W * 0.7,
  },
  thumbRow: {
    backgroundColor: "#0f172a",
  },
  thumbContainer: {
    padding: 12,
    gap: 8,
  },
  miniThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    marginRight: 8,
  },
  miniThumbActive: {
    borderColor: "#27ae60",
  },
  noImgBox: {
    height: SCREEN_W * 0.7,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  noImgText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
  gradeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    margin: 16,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  gradeRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    flexShrink: 0,
  },
  gradeRingText: {
    fontSize: 32,
    fontWeight: "900",
  },
  gradeInfo: {
    flex: 1,
  },
  gradeLabel: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  gradeSub: {
    fontSize: 14,
    color: "#64748b",
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
});
