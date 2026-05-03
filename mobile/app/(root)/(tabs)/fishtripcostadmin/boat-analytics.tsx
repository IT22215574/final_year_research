import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getBoatTypeTrainingAnalytics } from "@/services/trainingCandidateService";
import useAuthStore from "@/stores/authStore";

type BoatTypeAnalyticsRow = {
  boatType: string;
  displayName: string;
  isConfigured: boolean;
  totalCandidates: number;
  approvedCandidates: number;
  trainedCandidates: number;
  pendingCandidates: number;
  rejectedCandidates: number;
  trainingJobs: number;
  successfulJobs: number;
  failedJobs: number;
  recordsProcessed: number;
  backlog: number;
  coveragePercent: number;
  jobSuccessRate: number;
  lastTrainingAt: string | null;
};

type BoatTypeAnalyticsPayload = {
  summary: {
    totalBoatTypes: number;
    approvedCandidates: number;
    trainedCandidates: number;
    pendingCandidates: number;
    rejectedCandidates: number;
    trainingJobs: number;
    successfulJobs: number;
    failedJobs: number;
    recordsProcessed: number;
    coveragePercent: number;
    jobSuccessRate: number;
    lastTrainingAt: string | null;
  };
  boatTypes: BoatTypeAnalyticsRow[];
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
  amber: "#d97706",
  amberSoft: "#fffbeb",
  rose: "#e11d48",
  roseSoft: "#fff1f2",
  slate: "#334155",
};

const ALL_BOAT_TYPES = "__ALL_BOAT_TYPES__";

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatPercent = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "0%";
  return `${value.toFixed(1)}%`;
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
      marginBottom: 12,
    }}
  >
    <View
      style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: accentSoft,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.subtext }}>
        {title}
      </Text>
    </View>
    <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>
      {value}
    </Text>
    <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 6 }}>
      {subtitle}
    </Text>
  </View>
);

const BoatTypeRow = ({ item }: { item: BoatTypeAnalyticsRow }) => {
  const progress = Math.max(0, Math.min(item.coveragePercent, 100));
  const jobSuccess = Math.max(0, Math.min(item.jobSuccessRate, 100));
  const statusLabel =
    item.approvedCandidates === 0
      ? "No approved data"
      : item.backlog > 0
        ? "Needs training"
        : "Up to date";
  const statusColor =
    item.approvedCandidates === 0
      ? colors.amber
      : item.backlog > 0
        ? colors.rose
        : colors.green;
  const statusBg =
    item.approvedCandidates === 0
      ? colors.amberSoft
      : item.backlog > 0
        ? colors.roseSoft
        : colors.greenSoft;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>
            {item.displayName}
          </Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 3 }}>
            Key: {item.boatType}{" "}
            {item.isConfigured ? "• configured" : "• legacy"}
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: statusBg,
          }}
        >
          <Text style={{ color: statusColor, fontSize: 12, fontWeight: "800" }}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 14 }}>
        {[
          ["Approved", item.approvedCandidates],
          ["Trained", item.trainedCandidates],
          ["Pending", item.pendingCandidates],
          ["Rejected", item.rejectedCandidates],
          ["Jobs", item.trainingJobs],
          ["Records", item.recordsProcessed],
        ].map(([label, value]) => (
          <View
            key={String(label)}
            style={{ width: "50%", marginBottom: 8, paddingRight: 8 }}
          >
            <Text style={{ fontSize: 11, color: colors.subtext }}>{label}</Text>
            <Text
              style={{ fontSize: 15, fontWeight: "800", color: colors.text }}
            >
              {String(value)}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, color: colors.subtext }}>Coverage</Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>
            {formatPercent(progress)}
          </Text>
        </View>
        <View
          style={{
            height: 8,
            borderRadius: 999,
            backgroundColor: "#e5e7eb",
            overflow: "hidden",
            marginTop: 6,
          }}
        >
          <View
            style={{
              width: `${progress}%`,
              height: 8,
              borderRadius: 999,
              backgroundColor: colors.blue,
            }}
          />
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, color: colors.subtext }}>
            Job success
          </Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>
            {formatPercent(jobSuccess)}
          </Text>
        </View>
        <View
          style={{
            height: 8,
            borderRadius: 999,
            backgroundColor: "#e5e7eb",
            overflow: "hidden",
            marginTop: 6,
          }}
        >
          <View
            style={{
              width: `${jobSuccess}%`,
              height: 8,
              borderRadius: 999,
              backgroundColor: colors.green,
            }}
          />
        </View>
      </View>

      <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 12 }}>
        Backlog: {item.backlog} • Last training:{" "}
        {formatDate(item.lastTrainingAt)}
      </Text>
    </View>
  );
};

export default function BoatTypeAnalyticsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<BoatTypeAnalyticsPayload | null>(null);
  const [selectedBoatType, setSelectedBoatType] = useState(ALL_BOAT_TYPES);

  const horizontalPadding = 16;
  const contentWidth = width - horizontalPadding * 2;
  const isWide = width >= 700;
  const metricWidth = isWide ? (contentWidth - 12) / 2 : contentWidth;
  const normalizedRole = String(currentUser?.role || "")
    .toLowerCase()
    .trim();
  const isFisherAdmin =
    normalizedRole === "fisher admin" ||
    normalizedRole === "fish admin" ||
    Boolean(currentUser?.isAdmin && normalizedRole.includes("admin"));

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const payload = await getBoatTypeTrainingAnalytics();
      setData(payload);
    } catch (err: any) {
      setError(err?.message || "Failed to load boat type analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isFisherAdmin) {
      setLoading(false);
      return;
    }

    loadData();
  }, [isFisherAdmin]);

  const summary = useMemo(() => data?.summary, [data]);
  const rows = data?.boatTypes || [];
  const isAllSelected = selectedBoatType === ALL_BOAT_TYPES;
  const selectedRow =
    rows.find((item) => item.boatType === selectedBoatType) || rows[0] || null;
  const displayedRows = isAllSelected ? rows : selectedRow ? [selectedRow] : [];
  const filterOptions = [
    { boatType: ALL_BOAT_TYPES, displayName: "All boat types" },
    ...rows,
  ];

  useEffect(() => {
    if (!rows.length) {
      setSelectedBoatType(ALL_BOAT_TYPES);
      return;
    }

    if (
      selectedBoatType !== ALL_BOAT_TYPES &&
      !rows.some((item) => item.boatType === selectedBoatType)
    ) {
      setSelectedBoatType(ALL_BOAT_TYPES);
    }
  }, [rows, selectedBoatType]);

  if (!isFisherAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 18,
            }}
          >
            <Text
              style={{
                color: colors.text,
                textAlign: "center",
                fontWeight: "800",
                marginBottom: 8,
              }}
            >
              Fisher Admin Access Only
            </Text>
            <Text
              style={{
                color: colors.subtext,
                textAlign: "center",
                marginBottom: 14,
              }}
            >
              This training analytics page is available only for Fisher Admin.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(root)/(tabs)/fishtripcostadmin")}
              style={{
                backgroundColor: colors.text,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={{ marginTop: 12, color: colors.subtext }}>
            Loading boat type analytics...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}
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
                marginBottom: 14,
              }}
            >
              {error}
            </Text>
            <TouchableOpacity
              onPress={loadData}
              style={{
                backgroundColor: colors.text,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
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
            Boat Type Training Analytics
          </Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 4 }}>
            Approved, trained, backlog, and job success by boat type
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
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
        {rows.length > 0 && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 12,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: colors.subtext,
                fontWeight: "700",
                marginBottom: 8,
              }}
            >
              Filter by Boat Type
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 8 }}
            >
              {filterOptions.map((option) => {
                const active =
                  (option.boatType === ALL_BOAT_TYPES && isAllSelected) ||
                  option.boatType === selectedRow?.boatType;

                return (
                  <TouchableOpacity
                    key={option.boatType}
                    onPress={() => setSelectedBoatType(option.boatType)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? colors.blue : colors.border,
                      backgroundColor: active ? colors.blueSoft : colors.card,
                      marginRight: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: active ? "800" : "600",
                        color: active ? colors.blue : colors.text,
                      }}
                    >
                      {option.displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
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
              <Ionicons name="bar-chart" size={22} color={colors.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 20, fontWeight: "800", color: "#1e3a8a" }}
              >
                Training Coverage
              </Text>
              <Text style={{ fontSize: 12, color: "#3b82f6", marginTop: 2 }}>
                Counts from approved candidates and boat-type training jobs
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
              title="BOAT TYPES"
              value={String(summary?.totalBoatTypes ?? 0)}
              subtitle="Configured plus legacy boat types"
              icon="boat-outline"
              accent={colors.blue}
              accentSoft="#dbeafe"
              width={metricWidth}
            />
            <MetricCard
              title="APPROVED"
              value={String(summary?.approvedCandidates ?? 0)}
              subtitle="Approved datasets waiting or already used"
              icon="checkmark-circle-outline"
              accent={colors.green}
              accentSoft="#dcfce7"
              width={metricWidth}
            />
            <MetricCard
              title="TRAINED"
              value={String(summary?.trainedCandidates ?? 0)}
              subtitle="Approved rows already marked trained"
              icon="school-outline"
              accent={colors.blue}
              accentSoft="#dbeafe"
              width={metricWidth}
            />
            <MetricCard
              title="COVERAGE"
              value={formatPercent(summary?.coveragePercent)}
              subtitle="Trained divided by approved"
              icon="speedometer-outline"
              accent={colors.amber}
              accentSoft="#fef3c7"
              width={metricWidth}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <MetricCard
              title="TRAINING JOBS"
              value={String(summary?.trainingJobs ?? 0)}
              subtitle="Boat-type training runs"
              icon="repeat-outline"
              accent={colors.slate}
              accentSoft="#e2e8f0"
              width={metricWidth}
            />
            <MetricCard
              title="JOB SUCCESS"
              value={formatPercent(summary?.jobSuccessRate)}
              subtitle="Successful training job rate"
              icon="shield-checkmark-outline"
              accent={colors.green}
              accentSoft="#dcfce7"
              width={metricWidth}
            />
          </View>

          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 6 }}>
            Last training: {formatDate(summary?.lastTrainingAt)}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: colors.text,
            marginBottom: 10,
          }}
        >
          Boat Type Breakdown
        </Text>

        {rows.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 18,
            }}
          >
            <Text style={{ color: colors.subtext, textAlign: "center" }}>
              No boat type training data found yet.
            </Text>
          </View>
        ) : (
          displayedRows.map((item) => (
            <BoatTypeRow key={item.boatType} item={item} />
          ))
        )}

        {!isAllSelected && selectedRow && !selectedRow.isConfigured && (
          <View
            style={{
              marginTop: 8,
              backgroundColor: "#fff7ed",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#fed7aa",
              padding: 14,
            }}
          >
            <Text
              style={{ color: "#9a3412", fontWeight: "800", marginBottom: 4 }}
            >
              Legacy boat type selected
            </Text>
            <Text style={{ color: "#9a3412", fontSize: 12 }}>
              This boat type comes from older records and is not in current
              configured boat type codes.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
