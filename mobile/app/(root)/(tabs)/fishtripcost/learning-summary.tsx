import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ProgressChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { getLearningSummary } from "@/services/tripService";
import FishTripNavBar from "./components/FishTripNavBar";

type LearningBoat = {
  boatId: string;
  totalTrips?: number;
  confidence?: number;
  avgPredictionError?: number;
  improvementTrend?: string;
  maturityLevel?: string;
};

type LearningSummary = {
  totalBoats: number;
  totalTripsLearned: number;
  averageConfidence: number;
  averagePredictionError: number;
  improvementStatus: string;
  topPerformingBoats: LearningBoat[];
  needsAttentionBoats: LearningBoat[];
  lastUpdated: string | null;
};

const colors = {
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  subtext: "#64748b",
  border: "#e2e8f0",
  blue: "#2563eb",
  blueSoft: "#eff6ff",
  green: "#16a34a",
  greenSoft: "#f0fdf4",
  purple: "#7c3aed",
  purpleSoft: "#f5f3ff",
  rose: "#e11d48",
  roseSoft: "#fff1f2",
  amber: "#d97706",
  amberSoft: "#fffbeb",
  indigo: "#4f46e5",
  indigoSoft: "#eef2ff",
};

const formatPercent = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${(value * 100).toFixed(0)}%`;
};

const formatLiters = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(1)} L`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getStatusColors = (status?: string) => {
  switch (status) {
    case "improving":
      return {
        bg: "#dcfce7",
        text: "#15803d",
        border: "#bbf7d0",
      };
    case "stable":
      return {
        bg: "#dbeafe",
        text: "#1d4ed8",
        border: "#bfdbfe",
      };
    default:
      return {
        bg: "#fef3c7",
        text: "#b45309",
        border: "#fde68a",
      };
  }
};

const getMaturityColors = (level?: string) => {
  switch (level) {
    case "expert":
      return { bg: "#dcfce7", text: "#15803d" };
    case "experienced":
      return { bg: "#dbeafe", text: "#1d4ed8" };
    default:
      return { bg: "#fef3c7", text: "#b45309" };
  }
};

const getTrendMeta = (trend?: string) => {
  switch (trend) {
    case "improving":
      return {
        icon: "trending-up" as const,
        color: "#16a34a",
        text: "Improving",
      };
    case "stable":
      return {
        icon: "remove" as const,
        color: "#2563eb",
        text: "Stable",
      };
    case "declining":
      return {
        icon: "trending-down" as const,
        color: "#ef4444",
        text: "Declining",
      };
    default:
      return {
        icon: "help-circle-outline" as const,
        color: "#94a3b8",
        text: trend || "-",
      };
  }
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
  accent,
  accentSoft,
  width,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  accentSoft: string;
  width: number;
}) => (
  <View
    style={{
      width,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: Platform.OS === "ios" ? 0.06 : 0,
      shadowRadius: 8,
      elevation: 2,
      marginBottom: 12,
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: accentSoft,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Ionicons name={icon} size={19} color={accent} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.subtext, flex: 1 }}>
        {title}
      </Text>
    </View>

    <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>{value}</Text>
    <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 6 }}>{subtitle}</Text>
  </View>
);

const SectionTitle = ({ title }: { title: string }) => (
  <Text
    style={{
      fontSize: 19,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 12,
      marginTop: 4,
    }}
  >
    {title}
  </Text>
);

const LearningSummaryScreen = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [data, setData] = useState<LearningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const horizontalPadding = 16;
  const contentWidth = width - horizontalPadding * 2;
  const isWide = width >= 700;
  const metricCardWidth = isWide ? (contentWidth - 12) / 2 : contentWidth;
  const progressWidth = Math.max(220, contentWidth - 32);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getLearningSummary();
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load learning summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const statusMeta = useMemo(
    () => getStatusColors(data?.improvementStatus),
    [data?.improvementStatus]
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={{ marginTop: 12, color: colors.subtext, fontSize: 14 }}>
            Loading learning summary...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#fef2f2",
              borderColor: "#fecaca",
              borderWidth: 1,
              borderRadius: 18,
              padding: 18,
            }}
          >
            <Text
              style={{
                color: "#b91c1c",
                textAlign: "center",
                fontSize: 14,
                fontWeight: "600",
                marginBottom: 14,
              }}
            >
              {error}
            </Text>

            <TouchableOpacity
              onPress={loadSummary}
              activeOpacity={0.85}
              style={{
                backgroundColor: colors.text,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <FishTripNavBar />

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 12,
          backgroundColor: "#ffffff",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
            Learning Summary
          </Text>
          <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            DATCIE adaptive learning overview
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#f1f5f9",
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            minHeight: 42,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#334155", fontWeight: "700" }}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingTop: 16,
          paddingBottom: 28,
        }}
      >
        <View
          style={{
            backgroundColor: colors.blueSoft,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "#bfdbfe",
            padding: 18,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: "#dbeafe",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="stats-chart" size={22} color={colors.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#1e3a8a" }}>
                System-Wide Learning Analytics
              </Text>
              <Text style={{ fontSize: 12, color: "#3b82f6", marginTop: 2 }}>
                Overall intelligence and model adaptation health
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <MetricCard
              title="TOTAL BOATS"
              value={String(data?.totalBoats ?? 0)}
              subtitle="Boats participating in learning"
              icon="boat-outline"
              accent={colors.blue}
              accentSoft="#dbeafe"
              width={metricCardWidth}
            />
            <MetricCard
              title="TRIPS LEARNED"
              value={String(data?.totalTripsLearned ?? 0)}
              subtitle="Trips used to improve predictions"
              icon="git-merge-outline"
              accent={colors.green}
              accentSoft="#dcfce7"
              width={metricCardWidth}
            />
            <MetricCard
              title="AVG CONFIDENCE"
              value={formatPercent(data?.averageConfidence)}
              subtitle="How confident the model feels"
              icon="shield-checkmark-outline"
              accent={colors.purple}
              accentSoft="#ede9fe"
              width={metricCardWidth}
            />
            <MetricCard
              title="AVG ERROR (L)"
              value={
                typeof data?.averagePredictionError === "number" &&
                !Number.isNaN(data.averagePredictionError)
                  ? data.averagePredictionError.toFixed(1)
                  : "N/A"
              }
              subtitle="Average prediction gap in liters"
              icon="alert-circle-outline"
              accent={colors.rose}
              accentSoft="#ffe4e6"
              width={metricCardWidth}
            />
          </View>

          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: isWide ? "row" : "column",
                justifyContent: "space-between",
                alignItems: isWide ? "center" : "flex-start",
              }}
            >
              <Text
                style={{
                  color: "#475569",
                  fontWeight: "700",
                  fontSize: 14,
                  marginBottom: isWide ? 0 : 10,
                }}
              >
                System Status
              </Text>

              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: statusMeta.bg,
                  borderWidth: 1,
                  borderColor: statusMeta.border,
                }}
              >
                <Text
                  style={{
                    color: statusMeta.text,
                    fontWeight: "800",
                    fontSize: 13,
                    textTransform: "capitalize",
                  }}
                >
                  {data?.improvementStatus || "Unknown"}
                </Text>
              </View>
            </View>

            <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 10 }}>
              Last Updated: {formatDate(data?.lastUpdated)}
            </Text>
          </View>
        </View>

        {typeof data?.averageConfidence === "number" && !Number.isNaN(data.averageConfidence) ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 18,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "800",
                color: colors.text,
                marginBottom: 14,
              }}
            >
              🎯 System Confidence Level
            </Text>

            <View style={{ alignItems: "center" }}>
              <ProgressChart
                data={{
                  labels: ["Confidence"],
                  data: [Math.max(0, Math.min(1, data.averageConfidence))],
                }}
                width={progressWidth}
                height={190}
                strokeWidth={16}
                radius={62}
                chartConfig={{
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                  labelColor: () => "#475569",
                  strokeWidth: 2,
                  barPercentage: 0.5,
                  decimalPlaces: 0,
                }}
                hideLegend={false}
              />
            </View>

            <View
              style={{
                backgroundColor: colors.indigoSoft,
                borderRadius: 16,
                padding: 14,
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  color: "#3730a3",
                  fontSize: 13,
                  fontWeight: "600",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {data.averageConfidence > 0.8
                  ? "🌟 Excellent - Model is highly confident in predictions"
                  : data.averageConfidence > 0.6
                  ? "✅ Good - Model is moderately confident"
                  : "⚠️ Building Confidence - Need more training data"}
              </Text>
            </View>
          </View>
        ) : null}

        <SectionTitle title="🏆 Top Performing Boats" />

        {data?.topPerformingBoats && data.topPerformingBoats.length > 0 ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 18,
              marginBottom: 16,
            }}
          >
            {data.topPerformingBoats.map((boat, index) => {
              const maturity = getMaturityColors(boat.maturityLevel);
              const trend = getTrendMeta(boat.improvementTrend);

              return (
                <View
                  key={`${boat.boatId}-${index}`}
                  style={{
                    marginBottom: index === data.topPerformingBoats.length - 1 ? 0 : 16,
                    paddingBottom:
                      index === data.topPerformingBoats.length - 1 ? 0 : 16,
                    borderBottomWidth:
                      index === data.topPerformingBoats.length - 1 ? 0 : 1,
                    borderBottomColor: "#f1f5f9",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor:
                              index === 0
                                ? "#facc15"
                                : index === 1
                                ? "#cbd5e1"
                                : "#fdba74",
                            marginRight: 10,
                          }}
                        >
                          <Text style={{ color: "#ffffff", fontWeight: "800" }}>
                            #{index + 1}
                          </Text>
                        </View>

                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: "800",
                            fontSize: 15,
                            flex: 1,
                          }}
                        >
                          Boat ID: {String(boat.boatId).slice(0, 8)}...
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: maturity.bg,
                      }}
                    >
                      <Text
                        style={{
                          color: maturity.text,
                          fontSize: 12,
                          fontWeight: "800",
                          textTransform: "capitalize",
                        }}
                      >
                        {boat.maturityLevel || "Learning"}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor: "#f8fafc",
                      borderRadius: 18,
                      padding: 14,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: colors.subtext, fontSize: 14 }}>Total Trips</Text>
                      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
                        {boat.totalTrips ?? 0}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: colors.subtext, fontSize: 14 }}>Confidence</Text>
                      <Text style={{ color: colors.indigo, fontWeight: "800", fontSize: 14 }}>
                        {formatPercent(boat.confidence)}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: colors.subtext, fontSize: 14 }}>Avg Error</Text>
                      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
                        {formatLiters(boat.avgPredictionError)}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: colors.subtext, fontSize: 14 }}>Trend</Text>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name={trend.icon} size={16} color={trend.color} />
                        <Text
                          style={{
                            color: trend.color,
                            fontWeight: "700",
                            fontSize: 14,
                            marginLeft: 6,
                            textTransform: "capitalize",
                          }}
                        >
                          {trend.text}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}

            <View
              style={{
                backgroundColor: colors.greenSoft,
                borderRadius: 16,
                padding: 14,
                marginTop: 14,
              }}
            >
              <Text
                style={{
                  color: "#166534",
                  fontSize: 13,
                  fontWeight: "600",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                ✨ These boats have the most accurate predictions based on learning data
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: colors.subtext, textAlign: "center", lineHeight: 20 }}>
              No top performing boats yet. Log actual trips to build learning data.
            </Text>
          </View>
        )}

        {data?.needsAttentionBoats && data.needsAttentionBoats.length > 0 ? (
          <>
            <SectionTitle title="⚠️ Boats Needing Attention" />

            <View
              style={{
                backgroundColor: colors.amberSoft,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "#fde68a",
                padding: 18,
                marginBottom: 16,
              }}
            >
              {data.needsAttentionBoats.map((boat, index) => (
                <View
                  key={`${boat.boatId}-${index}`}
                  style={{
                    marginBottom:
                      index === data.needsAttentionBoats.length - 1 ? 0 : 12,
                    paddingBottom:
                      index === data.needsAttentionBoats.length - 1 ? 0 : 12,
                    borderBottomWidth:
                      index === data.needsAttentionBoats.length - 1 ? 0 : 1,
                    borderBottomColor: "#fdecc8",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "800",
                        fontSize: 14,
                        flex: 1,
                        paddingRight: 8,
                      }}
                    >
                      Boat ID: {String(boat.boatId).slice(0, 8)}...
                    </Text>
                    <Ionicons name="warning" size={20} color={colors.amber} />
                  </View>

                  <View
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 16,
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: "#92400e", fontSize: 13, lineHeight: 20 }}>
                      • Trips: {boat.totalTrips ?? 0} • Error:{" "}
                      {formatLiters(boat.avgPredictionError)}
                    </Text>
                    <Text
                      style={{
                        color: "#a16207",
                        fontSize: 12,
                        marginTop: 6,
                        lineHeight: 18,
                      }}
                    >
                      Reason:{" "}
                      {boat.improvementTrend === "declining"
                        ? "Accuracy declining - needs recalibration"
                        : "Insufficient training data"}
                    </Text>
                  </View>
                </View>
              ))}

              <View
                style={{
                  backgroundColor: "#fde68a",
                  borderRadius: 16,
                  padding: 14,
                  marginTop: 12,
                }}
              >
                <Text
                  style={{
                    color: "#78350f",
                    fontSize: 13,
                    fontWeight: "600",
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  💡 Log more actual trips for these boats to improve prediction accuracy
                </Text>
              </View>
            </View>
          </>
        ) : null}

        <View
          style={{
            backgroundColor: colors.purpleSoft,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "#ddd6fe",
            padding: 18,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                backgroundColor: "#ede9fe",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name="bulb-outline" size={20} color={colors.purple} />
            </View>

            <Text style={{ fontSize: 17, fontWeight: "800", color: "#581c87", flex: 1 }}>
              Adaptive Learning Insights
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 18,
              padding: 16,
            }}
          >
            <Text style={{ color: "#334155", fontSize: 14, lineHeight: 22, marginBottom: 10 }}>
              ✅ <Text style={{ fontWeight: "700" }}>Boat-Specific Adaptation:</Text> Each
              boat&apos;s unique characteristics are learned over time.
            </Text>
            <Text style={{ color: "#334155", fontSize: 14, lineHeight: 22, marginBottom: 10 }}>
              ✅ <Text style={{ fontWeight: "700" }}>Continuous Improvement:</Text> Model
              accuracy increases with every logged trip.
            </Text>
            <Text style={{ color: "#334155", fontSize: 14, lineHeight: 22, marginBottom: 10 }}>
              ✅ <Text style={{ fontWeight: "700" }}>Historical Context:</Text> Predictions
              leverage past performance for better accuracy.
            </Text>
            <Text style={{ color: "#334155", fontSize: 14, lineHeight: 22 }}>
              ✅ <Text style={{ fontWeight: "700" }}>Economic Intelligence:</Text> System
              learns realistic cost patterns beyond just fuel.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "#e9d5ff",
              borderRadius: 16,
              padding: 14,
              marginTop: 12,
            }}
          >
            <Text
              style={{
                color: "#581c87",
                fontSize: 13,
                fontWeight: "800",
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              🔬 Research Novelty: Adaptive, boat-specific trip cost intelligence
              with external cost modeling
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LearningSummaryScreen;