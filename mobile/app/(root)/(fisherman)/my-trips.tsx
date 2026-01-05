import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = process.env.EXPO_PUBLIC_API_KEY;

interface ExternalCost {
  type: string;
  amount: number;
  description?: string;
}

interface Trip {
  _id: string;
  boatType: string;
  engineHp: number;
  tripDays: number;
  distanceKm: number;
  portName: string;
  fishingZone?: string;
  baseCost: number;
  fuelCostEstimate: number;
  iceCostEstimate: number;
  externalCosts: ExternalCost[];
  externalCostsTotal: number;
  totalTripCost: number;
  currency: string;
  breakdown: {
    baseCostPercentage: number;
    externalCostsPercentage: number;
  };
  status: string;
  notes?: string;
  createdAt: string;
  startDate?: string;
  endDate?: string;
}

interface TripStats {
  totalTrips: number;
  totalCost: number;
  avgCostPerTrip: number;
  totalDistance: number;
  statusBreakdown: Array<{ status: string; count: number }>;
}

export default function MyTrips() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState<TripStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    try {
      const userJson = await AsyncStorage.getItem("user");
      const user = userJson ? JSON.parse(userJson) : null;
      const id = user?.id;
      setUserId(id);
      if (id) {
        await loadTrips(id);
        await loadStats(id);
      }
    } catch (error) {
      console.error("Error loading user ID:", error);
    }
  };

  const loadTrips = async (uid: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/v1/trips/user/${uid}/recent`, {
        params: { limit: 20 },
      });
      if (response.data.status === "success") {
        setTrips(response.data.data);
      }
    } catch (error) {
      console.error("Error loading trips:", error);
      Alert.alert("Error", "Failed to load trips. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (uid: string) => {
    try {
      const response = await axios.get(`${API}/api/v1/trips/user/${uid}/stats`);
      if (response.data.status === "success") {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    if (userId) {
      setRefreshing(true);
      await loadTrips(userId);
      await loadStats(userId);
      setRefreshing(false);
    }
  }, [userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10b981";
      case "ongoing":
        return "#3b82f6";
      case "planned":
        return "#f59e0b";
      case "cancelled":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";
      case "ongoing":
        return "boat";
      case "planned":
        return "calendar";
      case "cancelled":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading your trips...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={["#3b82f6", "#2563eb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <Ionicons name="boat" size={40} color="#ffffff" />
          <Text style={styles.headerTitle}>My Fishing Trips</Text>
          <Text style={styles.headerSubtitle}>
            Track and manage all your fishing trips
          </Text>
        </LinearGradient>

        {/* Stats Summary */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalTrips}</Text>
              <Text style={styles.statLabel}>Total Trips</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {stats.totalDistance.toFixed(0)} km
              </Text>
              <Text style={styles.statLabel}>Total Distance</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {(stats.totalCost / 1000).toFixed(0)}K
              </Text>
              <Text style={styles.statLabel}>Total Cost</Text>
            </View>
          </View>
        )}

        {/* Trip List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>

          {trips.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="boat-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No trips yet</Text>
              <Text style={styles.emptySubtext}>
                Your trip predictions will appear here
              </Text>
            </View>
          ) : (
            trips.map((trip) => (
              <TouchableOpacity key={trip._id} style={styles.tripCard}>
                {/* Trip Header */}
                <View style={styles.tripHeader}>
                  <View style={styles.tripIconContainer}>
                    <Ionicons name="boat" size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripDestination}>
                      {trip.portName}
                      {trip.fishingZone ? ` → ${trip.fishingZone}` : ""}
                    </Text>
                    <Text style={styles.tripDate}>
                      {formatDate(trip.createdAt)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(trip.status)}15` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(trip.status) },
                      ]}
                    >
                      {trip.status}
                    </Text>
                  </View>
                </View>

                {/* Trip Details */}
                <View style={styles.tripDetails}>
                  <View style={styles.tripDetailItem}>
                    <Ionicons name="time" size={16} color="#6b7280" />
                    <Text style={styles.tripDetailText}>
                      {trip.tripDays} day{trip.tripDays > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <View style={styles.tripDetailItem}>
                    <Ionicons name="navigate" size={16} color="#6b7280" />
                    <Text style={styles.tripDetailText}>
                      {trip.distanceKm.toFixed(0)} km
                    </Text>
                  </View>
                  <View style={styles.tripDetailItem}>
                    <Ionicons name="boat-outline" size={16} color="#6b7280" />
                    <Text style={styles.tripDetailText}>{trip.boatType}</Text>
                  </View>
                </View>

                {/* Cost Breakdown */}
                <View style={styles.costSection}>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Base Cost</Text>
                    <Text style={styles.costValue}>
                      {formatCurrency(trip.baseCost)}
                    </Text>
                  </View>
                  <View style={styles.costSubRow}>
                    <Text style={styles.costSubLabel}>• Fuel</Text>
                    <Text style={styles.costSubValue}>
                      {formatCurrency(trip.fuelCostEstimate)}
                    </Text>
                  </View>
                  <View style={styles.costSubRow}>
                    <Text style={styles.costSubLabel}>• Ice</Text>
                    <Text style={styles.costSubValue}>
                      {formatCurrency(trip.iceCostEstimate)}
                    </Text>
                  </View>

                  {trip.externalCosts.length > 0 && (
                    <>
                      <View style={[styles.costRow, { marginTop: 8 }]}>
                        <Text style={styles.costLabel}>External Costs</Text>
                        <Text style={styles.costValue}>
                          {formatCurrency(trip.externalCostsTotal)}
                        </Text>
                      </View>
                      {trip.externalCosts.slice(0, 2).map((cost, index) => (
                        <View key={index} style={styles.costSubRow}>
                          <Text style={styles.costSubLabel}>• {cost.type}</Text>
                          <Text style={styles.costSubValue}>
                            {formatCurrency(cost.amount)}
                          </Text>
                        </View>
                      ))}
                      {trip.externalCosts.length > 2 && (
                        <Text style={styles.moreCostsText}>
                          +{trip.externalCosts.length - 2} more costs
                        </Text>
                      )}
                    </>
                  )}

                  <View style={styles.divider} />

                  <View style={styles.tripFooter}>
                    <Text style={styles.tripCost}>
                      {formatCurrency(trip.totalTripCost)}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </View>
                </View>

                {trip.notes && (
                  <View style={styles.notesSection}>
                    <Ionicons name="document-text" size={14} color="#64748b" />
                    <Text style={styles.notesText}>{trip.notes}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Navigate to Prediction */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/(root)/(fisherman)/trip-cost-prediction")}
        >
          <LinearGradient
            colors={["#3b82f6", "#2563eb"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addButtonGradient}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
            <Text style={styles.addButtonText}>Plan New Trip</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#dbeafe",
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#64748b",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 8,
  },
  tripCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tripIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripDestination: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  tripDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  tripDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tripDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tripDetailText: {
    fontSize: 13,
    color: "#6b7280",
  },
  costSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  costLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  costValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  costSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 12,
    marginTop: 4,
  },
  costSubLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  costSubValue: {
    fontSize: 13,
    color: "#64748b",
  },
  moreCostsText: {
    fontSize: 12,
    color: "#94a3b8",
    marginLeft: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 8,
  },
  tripFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tripCost: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3b82f6",
  },
  notesSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: "#64748b",
    marginLeft: 8,
    fontStyle: "italic",
  },
  addButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});
