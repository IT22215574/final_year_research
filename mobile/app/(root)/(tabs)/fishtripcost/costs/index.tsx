import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  getCostPreferences,
  updateCostPreference,
  deleteCostPreference,
  type CostPreference,
} from "@/services/costPreferenceService";
import FishTripNavBar from "../components/FishTripNavBar";

export default function CostPreferencesScreen() {
  const [preferences, setPreferences] = useState<CostPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await getCostPreferences();
      setPreferences(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load cost preferences");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, []),
  );

  const handleToggleActive = async (pref: CostPreference) => {
    try {
      setToggleLoading(pref._id);
      await updateCostPreference(pref._id, { isActive: !pref.isActive });

      setPreferences((prev) =>
        prev.map((item) =>
          item._id === pref._id
            ? {
                ...item,
                isActive: !pref.isActive,
                autoApply: !pref.isActive ? item.autoApply : item.autoApply,
              }
            : item,
        ),
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to toggle preference");
      await loadPreferences();
    } finally {
      setToggleLoading(null);
    }
  };

  const handleToggleAutoApply = async (pref: CostPreference) => {
    if (!pref.isActive) return;

    try {
      setToggleLoading(pref._id);
      await updateCostPreference(pref._id, { autoApply: !pref.autoApply });

      setPreferences((prev) =>
        prev.map((item) =>
          item._id === pref._id
            ? {
                ...item,
                autoApply: !pref.autoApply,
              }
            : item,
        ),
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to toggle auto-apply");
      await loadPreferences();
    } finally {
      setToggleLoading(null);
    }
  };

  const handleDelete = (pref: CostPreference) => {
    Alert.alert("Delete Cost Preference", `Delete ${pref.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(pref._id);
            await deleteCostPreference(pref._id);

            setPreferences((prev) =>
              prev.filter((item) => item._id !== pref._id),
            );

            Alert.alert("Success", "Cost preference deleted");
          } catch (error: any) {
            Alert.alert("Error", error?.message || "Failed to delete");
            await loadPreferences();
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const grouped = useMemo(() => {
    return preferences.reduce(
      (acc, pref) => {
        const cat = pref.category || "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(pref);
        return acc;
      },
      {} as Record<string, CostPreference[]>,
    );
  }, [preferences]);

  const activeTotal = useMemo(
    () =>
      preferences
        .filter((p) => p.isActive)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [preferences],
  );

  const autoApplyTotal = useMemo(
    () =>
      preferences
        .filter((p) => p.isActive && p.autoApply)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [preferences],
  );

  const activeCount = useMemo(
    () => preferences.filter((p) => p.isActive).length,
    [preferences],
  );

  const autoApplyCount = useMemo(
    () => preferences.filter((p) => p.isActive && p.autoApply).length,
    [preferences],
  );

  const getCategoryIcon = (
    category?: string,
  ): keyof typeof Ionicons.glyphMap => {
    const map: Record<string, keyof typeof Ionicons.glyphMap> = {
      Ice: "snow-outline",
      Bait: "fish-outline",
      Permit: "document-text-outline",
      Transport: "car-outline",
      Communication: "call-outline",
      Maintenance: "construct-outline",
      Insurance: "shield-checkmark-outline",
      "Harbor Fee": "boat-outline",
      Other: "wallet-outline",
    };

    return map[category || "Other"] || "wallet-outline";
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ color: "#64748b", marginTop: 12, fontSize: 14 }}>
            Loading cost preferences...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <FishTripNavBar />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 14,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: "800",
                  color: "#0f172a",
                }}
              >
                External Cost Intelligence
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#475569",
                  marginTop: 4,
                  lineHeight: 20,
                }}
              >
                Reusable cost preferences for realistic trip planning
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                router.push("/(root)/(tabs)/costs/add-cost" as any)
              }
              activeOpacity={0.85}
              style={{
                backgroundColor: "#2563eb",
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                minWidth: 52,
                minHeight: 52,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: Platform.OS === "ios" ? 0.12 : 0,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Ionicons name="add" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: "row" }}>
            <View
              style={{
                flex: 1,
                marginRight: 8,
                backgroundColor: "#ffffff",
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: Platform.OS === "ios" ? 0.06 : 0,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: "#ecfdf5",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Ionicons name="wallet" size={18} color="#10B981" />
                </View>
                <Text
                  style={{ fontSize: 12, color: "#475569", fontWeight: "600" }}
                >
                  Active Total
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "800",
                  color: "#0f172a",
                }}
              >
                Rs {activeTotal.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                {activeCount} active costs
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                marginLeft: 8,
                backgroundColor: "#ffffff",
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: Platform.OS === "ios" ? 0.06 : 0,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: "#eef2ff",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Ionicons name="flash" size={18} color="#6366F1" />
                </View>
                <Text
                  style={{ fontSize: 12, color: "#475569", fontWeight: "600" }}
                >
                  Auto-Apply
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "800",
                  color: "#4f46e5",
                }}
              >
                Rs {autoApplyTotal.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                {autoApplyCount} auto costs
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: "#eff6ff",
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: "#bfdbfe",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <Ionicons name="information-circle" size={20} color="#2563eb" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#1e3a8a",
                  }}
                >
                  External Cost Intelligence
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#1d4ed8",
                    marginTop: 4,
                    lineHeight: 18,
                  }}
                >
                  These reusable preferences automatically enhance trip
                  predictions with realistic costs beyond fuel: harbor fees,
                  ice, bait, permits, and more.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {preferences.length === 0 ? (
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 40,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 999,
                backgroundColor: "#ffffff",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                marginBottom: 16,
              }}
            >
              <Ionicons name="cash-outline" size={42} color="#94a3b8" />
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#334155",
                marginTop: 4,
              }}
            >
              No cost preferences yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#64748b",
                textAlign: "center",
                marginTop: 8,
                marginBottom: 18,
                lineHeight: 20,
                paddingHorizontal: 12,
              }}
            >
              Add external costs to make trip predictions more realistic
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.push("/(root)/(tabs)/fishtripcost/costs/add-cost" as any)
              }
              activeOpacity={0.85}
              style={{
                backgroundColor: "#2563eb",
                borderRadius: 14,
                paddingHorizontal: 22,
                paddingVertical: 14,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}
              >
                Add First Cost
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {Object.entries(grouped).map(([category, prefs]) => (
              <View key={category} style={{ marginBottom: 18 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      backgroundColor: "#e2e8f0",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    <Ionicons
                      name={getCategoryIcon(category)}
                      size={16}
                      color="#334155"
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {category}
                  </Text>
                </View>

                {prefs.map((pref) => {
                  const isBusy =
                    toggleLoading === pref._id || deletingId === pref._id;

                  return (
                    <View
                      key={pref._id}
                      style={{
                        borderRadius: 18,
                        padding: 16,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: pref.isActive ? "#e2e8f0" : "#f1f5f9",
                        backgroundColor: pref.isActive ? "#ffffff" : "#f8fafc",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity:
                          Platform.OS === "ios" && pref.isActive ? 0.05 : 0,
                        shadowRadius: 8,
                        elevation: pref.isActive ? 1 : 0,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          marginBottom: 14,
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "700",
                              color: pref.isActive ? "#0f172a" : "#94a3b8",
                            }}
                          >
                            {pref.name}
                          </Text>

                          {pref.description ? (
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#64748b",
                                marginTop: 6,
                                lineHeight: 18,
                              }}
                            >
                              {pref.description}
                            </Text>
                          ) : null}
                        </View>

                        <Text
                          style={{
                            fontSize: 19,
                            fontWeight: "800",
                            color: pref.isActive ? "#2563eb" : "#94a3b8",
                          }}
                        >
                          Rs {Number(pref.amount || 0).toLocaleString()}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => handleToggleActive(pref)}
                          disabled={isBusy}
                          activeOpacity={0.8}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            minHeight: 40,
                            paddingVertical: 4,
                            paddingRight: 10,
                            opacity: isBusy ? 0.7 : 1,
                          }}
                        >
                          <View
                            style={{
                              width: 50,
                              height: 28,
                              borderRadius: 999,
                              backgroundColor: pref.isActive
                                ? "#22c55e"
                                : "#cbd5e1",
                              justifyContent: "center",
                              paddingHorizontal: 3,
                            }}
                          >
                            <View
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 999,
                                backgroundColor: "#ffffff",
                                alignSelf: pref.isActive
                                  ? "flex-end"
                                  : "flex-start",
                              }}
                            />
                          </View>

                          <Text
                            style={{
                              fontSize: 12,
                              color: "#475569",
                              marginLeft: 8,
                              fontWeight: "600",
                            }}
                          >
                            Active
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleToggleAutoApply(pref)}
                          disabled={isBusy || !pref.isActive}
                          activeOpacity={0.8}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            minHeight: 40,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                            backgroundColor:
                              pref.autoApply && pref.isActive
                                ? "#eef2ff"
                                : "transparent",
                            opacity: isBusy || !pref.isActive ? 0.6 : 1,
                          }}
                        >
                          <Ionicons
                            name={pref.autoApply ? "flash" : "flash-outline"}
                            size={16}
                            color={
                              pref.autoApply && pref.isActive
                                ? "#6366F1"
                                : "#94A3B8"
                            }
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              marginLeft: 6,
                              fontWeight:
                                pref.autoApply && pref.isActive ? "700" : "600",
                              color:
                                pref.autoApply && pref.isActive
                                  ? "#4f46e5"
                                  : "#94a3b8",
                            }}
                          >
                            Auto-Apply
                          </Text>
                        </TouchableOpacity>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginLeft: "auto",
                          }}
                        >
                          <TouchableOpacity
                            onPress={() =>
                              router.push(
                                `/(root)/(tabs)/fishtripcost/costs/edit/${pref._id}` as any,
                              )
                            }
                            disabled={isBusy}
                            activeOpacity={0.8}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              backgroundColor: "#f8fafc",
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 8,
                              opacity: isBusy ? 0.7 : 1,
                            }}
                          >
                            <Ionicons
                              name="create-outline"
                              size={18}
                              color="#64748B"
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleDelete(pref)}
                            disabled={isBusy}
                            activeOpacity={0.8}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              backgroundColor: "#fef2f2",
                              borderWidth: 1,
                              borderColor: "#fecaca",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: isBusy ? 0.7 : 1,
                            }}
                          >
                            {deletingId === pref._id ? (
                              <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color="#EF4444"
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
