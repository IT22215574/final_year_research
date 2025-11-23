import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useAuthStore from "@/stores/authStore";
import { icons } from "@/constants";

const Home = () => {
  const { currentUser, signOut } = useAuthStore();
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/onBoard1");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      {/* Custom Status Bar */}
      <StatusBar
        barStyle="light-content"
        backgroundColor="#3b82f6"
        translucent={false}
      />

      {/* System Status Bar Area (for battery, signal, etc.) */}
      <View style={styles.systemStatusBar} />

      {/* Blue Header Area with Rounded Bottom */}
      <View style={styles.header}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.userName}>
            {currentUser?.firstName + " " + currentUser?.lastName || "Randy Wigham"}
          </Text>
        </View>

        {/* Search Bar on Blue Background */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ....."
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Access Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickAccessContainer}>
            <TouchableOpacity style={styles.quickAccessItem}>
              <View style={styles.quickAccessCard}>
                <View style={styles.quickAccessIconContainer}>
                  <Image
                    source={icons.home_book}
                    style={styles.quickAccessIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.quickAccessText}>Exams</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAccessItem}>
              <View style={styles.quickAccessCard}>
                <View style={styles.quickAccessIconContainer}>
                  <Image
                    source={icons.home_publication}
                    style={styles.quickAccessIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.quickAccessText}>Publications</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Schedules Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Schedules</Text>

          <View style={styles.scheduleCard}>
            <Text style={styles.courseTitle}>INTRODUCTION TO MICROBIOLOGY</Text>
            <Text style={styles.scheduleTitle}>Microbiology Introduction</Text>

            <View style={styles.scheduleDetails}>
              <View style={styles.scheduleTime}>
                <Ionicons name="calendar-outline" size={16} color="#64748b" />
                <Text style={styles.scheduleText}>12th June 2025</Text>
              </View>
              <View style={styles.scheduleTime}>
                <Ionicons name="time-outline" size={16} color="#64748b" />
                <Text style={styles.scheduleText}>3:00 pm - 5:00 pm</Text>
              </View>
            </View>

            <View style={styles.instructorContainer}>
              <Ionicons name="person-outline" size={16} color="#64748b" />
              <Text style={styles.instructorText}>Dr. Sarah Johnson</Text>
            </View>

            <TouchableOpacity style={styles.joinButton}>
              <Text style={styles.joinButtonText}>Join Seminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc", // Light background for entire screen
  },
  systemStatusBar: {
    height: StatusBar.currentHeight,
    backgroundColor: "#3b82f6", // Blue color for system status bar area
  },
  header: {
    backgroundColor: "#3b82f6", // Blue background
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  welcomeContainer: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: "#fff", // White text on blue background
    fontWeight: "500",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff", // White text on blue background
    marginTop: 4,
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1e293b",
  },
  signOutButton: {
    position: "absolute",
    top: 16,
    right: 20,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)", // Semi-transparent white
  },
  content: {
    flex: 1,
    backgroundColor: "#f8fafc", // Light background for content
  },
  scrollContent: {
    paddingBottom: 100, // Add padding to account for bottom navigation
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },
  quickAccessContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  quickAccessItem: {
    flex: 1,
  },
  quickAccessCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickAccessIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#005CFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickAccessIcon: {
    width: 30,
    height: 30,
    tintColor: "#fff",
  },
  quickAccessText: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "600",
    textAlign: "center",
  },
  scheduleCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 4,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },
  scheduleDetails: {
    marginBottom: 12,
  },
  scheduleTime: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  scheduleText: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 8,
  },
  instructorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  instructorText: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 8,
  },
  joinButton: {
    backgroundColor: "#005CFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default Home;