import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function MyTrips() {
  const trips = [
    {
      id: 1,
      destination: "Galle Port",
      date: "2026-01-02",
      days: 2,
      distance: 180,
      cost: 245000,
      boat: "MTRB",
      status: "completed",
    },
    {
      id: 2,
      destination: "Colombo",
      date: "2025-12-28",
      days: 1,
      distance: 80,
      cost: 125000,
      boat: "OFRP",
      status: "completed",
    },
    {
      id: 3,
      destination: "Trincomalee",
      date: "2025-12-20",
      days: 5,
      distance: 450,
      cost: 580000,
      boat: "MTRB",
      status: "completed",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10b981";
      case "ongoing":
        return "#3b82f6";
      case "planned":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{trips.length}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {trips.reduce((sum, trip) => sum + trip.distance, 0)} km
            </Text>
            <Text style={styles.statLabel}>Total Distance</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {(trips.reduce((sum, trip) => sum + trip.cost, 0) / 1000).toFixed(
                0
              )}
              K
            </Text>
            <Text style={styles.statLabel}>Total Cost</Text>
          </View>
        </View>

        {/* Trip List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
          {trips.map((trip) => (
            <TouchableOpacity key={trip.id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View style={styles.tripIconContainer}>
                  <Ionicons name="boat" size={24} color="#3b82f6" />
                </View>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripDestination}>{trip.destination}</Text>
                  <Text style={styles.tripDate}>{trip.date}</Text>
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

              <View style={styles.tripDetails}>
                <View style={styles.tripDetailItem}>
                  <Ionicons name="time" size={16} color="#6b7280" />
                  <Text style={styles.tripDetailText}>{trip.days} days</Text>
                </View>
                <View style={styles.tripDetailItem}>
                  <Ionicons name="navigate" size={16} color="#6b7280" />
                  <Text style={styles.tripDetailText}>{trip.distance} km</Text>
                </View>
                <View style={styles.tripDetailItem}>
                  <Ionicons name="boat-outline" size={16} color="#6b7280" />
                  <Text style={styles.tripDetailText}>{trip.boat}</Text>
                </View>
              </View>

              <View style={styles.tripFooter}>
                <Text style={styles.tripCost}>
                  LKR {trip.cost.toLocaleString()}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Add New Trip Button */}
        <TouchableOpacity style={styles.addButton}>
          <LinearGradient
            colors={["#3b82f6", "#2563eb"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addButtonGradient}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
            <Text style={styles.addButtonText}>Log New Trip</Text>
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
