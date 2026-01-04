import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import useAuthStore from "@/stores/authStore";

interface DashboardStats {
  totalTrips: number;
  avgCost: number;
  totalDistance: number;
  savings: number;
}

export default function FishermanDashboard() {
  const { currentUser } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalTrips: 0,
    avgCost: 0,
    totalDistance: 0,
    savings: 0,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // TODO: Fetch actual data from backend
      // For now, using mock data
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStats({
        totalTrips: 24,
        avgCost: 125000,
        totalDistance: 3450,
        savings: 45000,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const quickActions = [
    {
      title: "Predict Trip Cost",
      icon: "calculator",
      color: "#3b82f6",
      route: "/(root)/(fisherman)/trip-cost-prediction",
      description: "Calculate trip expenses",
    },
    {
      title: "Log New Trip",
      icon: "add-circle",
      color: "#10b981",
      route: "/(root)/(fisherman)/my-trips",
      description: "Record fishing trip",
    },
    {
      title: "View History",
      icon: "time",
      color: "#f59e0b",
      route: "/(root)/(fisherman)/my-trips",
      description: "Past trips & costs",
    },
    {
      title: "Profile",
      icon: "person",
      color: "#8b5cf6",
      route: "/(root)/(fisherman)/profile",
      description: "Account settings",
    },
  ];

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
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
        {/* Welcome Section */}
        <LinearGradient
          colors={["#3b82f6", "#2563eb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeCard}
        >
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.welcomeName}>
            {currentUser?.firstName || "Fisherman"}!
          </Text>
          <Text style={styles.welcomeSubtext}>
            Track and optimize your fishing trip costs
          </Text>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardBlue]}>
              <Ionicons name="boat" size={32} color="#3b82f6" />
              <Text style={styles.statValue}>{stats.totalTrips}</Text>
              <Text style={styles.statLabel}>Total Trips</Text>
            </View>

            <View style={[styles.statCard, styles.statCardGreen]}>
              <Ionicons name="cash" size={32} color="#10b981" />
              <Text style={styles.statValue}>
                LKR {(stats.avgCost / 1000).toFixed(0)}K
              </Text>
              <Text style={styles.statLabel}>Avg Cost/Trip</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardOrange]}>
              <Ionicons name="navigate" size={32} color="#f59e0b" />
              <Text style={styles.statValue}>{stats.totalDistance} km</Text>
              <Text style={styles.statLabel}>Total Distance</Text>
            </View>

            <View style={[styles.statCard, styles.statCardPurple]}>
              <Ionicons name="trending-down" size={32} color="#8b5cf6" />
              <Text style={styles.statValue}>
                LKR {(stats.savings / 1000).toFixed(0)}K
              </Text>
              <Text style={styles.statLabel}>Cost Savings</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: `${action.color}15` },
                  ]}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={28}
                    color={action.color}
                  />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>
                  {action.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Trip Cost Predictor Highlight */}
        <TouchableOpacity
          style={styles.highlightCard}
          onPress={() =>
            router.push("/(root)/(fisherman)/trip-cost-prediction")
          }
        >
          <LinearGradient
            colors={["#3b82f6", "#2563eb"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.highlightGradient}
          >
            <View style={styles.highlightContent}>
              <Ionicons name="calculator" size={40} color="#ffffff" />
              <View style={styles.highlightTextContainer}>
                <Text style={styles.highlightTitle}>
                  AI-Powered Cost Prediction
                </Text>
                <Text style={styles.highlightSubtitle}>
                  Predict your trip costs with 99% accuracy using our ML model
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ffffff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={styles.activityIconContainer}>
                <Ionicons name="boat" size={20} color="#3b82f6" />
              </View>
              <View style={styles.activityTextContainer}>
                <Text style={styles.activityTitle}>Trip to Galle Port</Text>
                <Text style={styles.activitySubtitle}>
                  2 days ago • LKR 245,000
                </Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.activityIconContainer}>
                <Ionicons name="calculator" size={20} color="#10b981" />
              </View>
              <View style={styles.activityTextContainer}>
                <Text style={styles.activityTitle}>Cost Prediction</Text>
                <Text style={styles.activitySubtitle}>
                  5 days ago • LKR 180,000
                </Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={styles.activityIconContainer}>
                <Ionicons name="boat" size={20} color="#3b82f6" />
              </View>
              <View style={styles.activityTextContainer}>
                <Text style={styles.activityTitle}>Trip to Colombo</Text>
                <Text style={styles.activitySubtitle}>
                  1 week ago • LKR 125,000
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6b7280",
  },
  scrollContent: {
    padding: 16,
  },
  welcomeCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: "#dbeafe",
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: "#dbeafe",
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statCardBlue: {
    backgroundColor: "#eff6ff",
  },
  statCardGreen: {
    backgroundColor: "#f0fdf4",
  },
  statCardOrange: {
    backgroundColor: "#fffbeb",
  },
  statCardPurple: {
    backgroundColor: "#faf5ff",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: "48%",
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
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
  },
  highlightCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  highlightGradient: {
    padding: 20,
  },
  highlightContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  highlightTextContainer: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  highlightSubtitle: {
    fontSize: 12,
    color: "#dbeafe",
  },
  activityCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
});
