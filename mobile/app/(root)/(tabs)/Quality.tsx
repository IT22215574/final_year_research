// screens/Quality.tsx  — Hub screen

import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { HEADER_GRADIENT } from "@/constants";
import { useGradingRecordStore } from "@/stores/gradingRecordStore";

export default function Quality() {
  const router = useRouter();
  const { history, loadHistory } = useGradingRecordStore();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <SafeAreaView style={s.container} edges={["bottom", "left", "right"]}>
      {/* Header */}
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.header}
      >
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Species Detection card */}
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.85}
          onPress={() => router.push("/(root)/(tabs)/SpeciesDetection" as any)}
        >
          <LinearGradient colors={["#0057FF", "#00C6FF"]} style={s.cardIcon}>
            <MaterialIcons name="search" size={34} color="#fff" />
          </LinearGradient>
          <View style={s.cardText}>
            <Text style={s.cardTitle}>Species Detection</Text>
            <Text style={s.cardDesc}>
              Upload or capture a photo of a fish and identify its species with
              stage-by-stage confidence scores.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={26} color="#94a3b8" />
        </TouchableOpacity>

        {/* Quality Grading card */}
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.85}
          onPress={() => router.push("/(root)/(tabs)/QualityGrading" as any)}
        >
          <LinearGradient colors={["#27ae60", "#2ecc71"]} style={s.cardIcon}>
            <MaterialIcons name="grade" size={34} color="#fff" />
          </LinearGradient>
          <View style={s.cardText}>
            <Text style={s.cardTitle}>Quality Grading</Text>
            <Text style={s.cardDesc}>
              Grade the freshness of Tuna or Mackerel (A / B / C). Other
              species are not supported yet.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={26} color="#94a3b8" />
        </TouchableOpacity>

        {/* Grading History card */}
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.85}
          onPress={() => router.push("/(root)/(tabs)/GradingHistory" as any)}
        >
          <LinearGradient colors={["#6c5ce7", "#a29bfe"]} style={s.cardIcon}>
            <MaterialIcons name="history" size={34} color="#fff" />
          </LinearGradient>
          <View style={s.cardText}>
            <Text style={s.cardTitle}>Grading History</Text>
            <Text style={s.cardDesc}>
              View, manage and revisit all your saved grading results.
            </Text>
          </View>
          <View style={s.badgeRow}>
            {history.length > 0 && (
              <View style={s.countBadge}>
                <Text style={s.countText}>{history.length}</Text>
              </View>
            )}
            <MaterialIcons name="chevron-right" size={26} color="#94a3b8" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },
  header: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff", textAlign: "center" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 4 },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    gap: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardIcon: {
    width: 68,
    height: 68,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  cardDesc: { fontSize: 12, color: "#64748b", lineHeight: 19 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  countBadge: {
    backgroundColor: "#6c5ce7",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 26,
    alignItems: "center",
  },
  countText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
