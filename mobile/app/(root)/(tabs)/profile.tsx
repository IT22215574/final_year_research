// Profile.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  RefreshControl,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useAuthStore from "@/stores/authStore";
import { apiFetch } from "@/utils/api";
import * as SecureStore from "expo-secure-store";

const { width } = Dimensions.get("window");

const Profile = () => {
  const { currentUser, signOut, userupdate } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch fresh user data from API
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const accessToken = await SecureStore.getItemAsync("access_token");
      if (!accessToken) {
        Alert.alert(
          "Authentication Required",
          "Please sign in again to access your profile.",
          [
            {
              text: "Sign In",
              onPress: () => router.replace("/(auth)/sign-in"),
            },
          ]
        );
        return;
      }

      const response = await apiFetch("/api/v1/users/profile", {
        method: "GET",
      });

      if (response.status === 401) {
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please sign in again.",
          [
            {
              text: "Sign In",
              onPress: () => router.replace("/(auth)/sign-in"),
            },
          ]
        );
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }

      const apiResponse = await response.json();
      if (apiResponse.success && apiResponse.data) {
        userupdate(apiResponse.data);
      } else {
        console.error("❌ Invalid API response structure:", apiResponse);
      }
    } catch (error: any) {
      console.error("❌ Profile fetch error:", error);
      if (
        error.message.includes("401") ||
        error.message.includes("Authentication")
      ) {
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please sign in again.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/sign-in") }]
        );
      } else {
        Alert.alert("Error", "Failed to load profile data. Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("access_token");
          await SecureStore.deleteItemAsync("refresh_token");
          await signOut();
          router.replace("/(auth)/selectSignIn");
        },
      },
    ]);
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime())
        ? "Invalid date"
        : date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
    } catch {
      return "Invalid date";
    }
  };

  // Get user data with proper field mapping
  const getUserData = () => {
    if (!currentUser) return null;

    return {
      firstName: currentUser.firstName || "Not set",
      lastName: currentUser.lastName || "Not set",
      email: currentUser.email || "Not set",
      phone: currentUser.phone || "Not set",
      role: currentUser.role || "Not set",
      dateOfBirth: currentUser.dateOfBirth || null,
      joinDate: currentUser.createdAt || currentUser.joinDate || new Date(),
      district: currentUser.district?.name || "Not set",
      zone: currentUser.zone ? currentUser.zone : "Not set",
      // Additional fish industry specific fields
      specialization: currentUser.specialization || "Fishery Professional",
      experience: currentUser.experience || "0",
      licenseNumber: currentUser.licenseNumber || "N/A",
      vesselName: currentUser.vesselName || "N/A",
    };
  };

  const userData = getUserData();

  // Fish industry role icons mapping
  const getRoleIcon = (role: string) => {
    const roleLower = role?.toLowerCase() || "";
    if (roleLower.includes("captain") || roleLower.includes("master")) {
      return "boat";
    } else if (roleLower.includes("fisher")) {
      return "fish";
    } else if (roleLower.includes("processor")) {
      return "cut";
    } else if (roleLower.includes("inspector")) {
      return "clipboard";
    } else if (roleLower.includes("manager")) {
      return "business";
    } else if (roleLower.includes("technician")) {
      return "build";
    }
    return "person";
  };

  const getRoleColor = (role: string) => {
    const roleLower = role?.toLowerCase() || "";
    if (roleLower.includes("captain") || roleLower.includes("master")) {
      return "#3B82F6"; // Blue
    } else if (roleLower.includes("fisher")) {
      return "#10B981"; // Green
    } else if (roleLower.includes("processor")) {
      return "#F59E0B"; // Amber
    } else if (roleLower.includes("inspector")) {
      return "#8B5CF6"; // Violet
    } else if (roleLower.includes("manager")) {
      return "#EF4444"; // Red
    } else if (roleLower.includes("technician")) {
      return "#06B6D4"; // Cyan
    }
    return "#64748B"; // Slate
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container} edges={["right", "left"]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#0B3D91"
          translucent={false}
        />
        <View style={styles.systemStatusBar} />
        <LinearGradient
          colors={["#0B3D91", "#1E90FF", "#00BFFF"]}
          style={styles.gradientBg}
        >
          <Image
            source={require("@/assets/images/SmartFisherLogo.png")}
            style={styles.bgPattern}
            resizeMode="repeat"
          />
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="fish-outline" size={60} color="#FFF" />
            </View>
            <Text style={styles.errorTitle}>No Profile Found</Text>
            <Text style={styles.errorText}>
              Unable to load your fishery profile
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchUserProfile}
            >
              <Ionicons name="refresh" size={20} color="#FFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.replace("/home")}
            >
              <Text style={styles.homeButtonText}>Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["right", "left"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0B3D91"
        translucent={false}
      />

      <View style={styles.systemStatusBar} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0B3D91"]}
            tintColor="#0B3D91"
          />
        }
      >
        {/* Ocean Gradient Header */}
        <LinearGradient
          colors={["#0B3D91", "#1E90FF", "#00BFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Image
            source={require("@/assets/images/passsucess.png")}
            style={styles.wavePattern}
            resizeMode="cover"
          />
          
          {/* Profile Header Content */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={["#FFF", "#E0F7FF"]}
                style={styles.avatarGradient}
              >
                {currentUser.avatar ? (
                  <Image
                    source={{ uri: currentUser.avatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons
                    name={getRoleIcon(userData?.role || "")}
                    size={40}
                    color="#0B3D91"
                  />
                )}
              </LinearGradient>
              <View style={styles.onlineIndicator} />
            </View>
            
            <Text style={styles.userName}>
              {userData?.firstName} {userData?.lastName}
            </Text>
            
            <View style={styles.roleBadge}>
              <Ionicons
                name={getRoleIcon(userData?.role || "")}
                size={14}
                color="#FFF"
              />
              <Text style={styles.roleText}>
                {userData?.role?.replace("_", " ").toUpperCase()}
              </Text>
            </View>
            
            <Text style={styles.specialization}>
              {userData?.specialization}
            </Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userData?.experience}</Text>
                <Text style={styles.statLabel}>Years</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userData?.licenseNumber !== "N/A" ? "Licensed" : "Unlicensed"}</Text>
                <Text style={styles.statLabel}>Status</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {userData?.joinDate ? new Date(userData.joinDate).getFullYear() : "N/A"}
                </Text>
                <Text style={styles.statLabel}>Member Since</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/update_profile")}
          >
            <LinearGradient
              colors={["#10B981", "#34D399"]}
              style={styles.actionIconContainer}
            >
              <Ionicons name="create-outline" size={24} color="#FFF" />
            </LinearGradient>
            <Text style={styles.actionTitle}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/documents")}
          >
            <LinearGradient
              colors={["#3B82F6", "#60A5FA"]}
              style={styles.actionIconContainer}
            >
              <Ionicons name="document-text" size={24} color="#FFF" />
            </LinearGradient>
            <Text style={styles.actionTitle}>Documents</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/certifications")}
          >
            <LinearGradient
              colors={["#F59E0B", "#FBBF24"]}
              style={styles.actionIconContainer}
            >
              <Ionicons name="ribbon" size={24} color="#FFF" />
            </LinearGradient>
            <Text style={styles.actionTitle}>Certifications</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <View style={styles.detailsGrid}>
            {/* Personal Info Card */}
            <LinearGradient
              colors={["#FFF", "#F0F9FF"]}
              style={styles.detailCard}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="person-circle" size={20} color="#0B3D91" />
                <Text style={styles.cardTitle}>Personal Details</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="mail-outline" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{userData?.email}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="call-outline" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Contact</Text>
                <Text style={styles.detailValue}>{userData?.phone}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Date of Birth</Text>
                <Text style={styles.detailValue}>
                  {userData?.dateOfBirth ? formatDate(userData.dateOfBirth) : "Not set"}
                </Text>
              </View>
            </LinearGradient>

            {/* Fishery Info Card */}
            <LinearGradient
              colors={["#FFF", "#F0FDF4"]}
              style={styles.detailCard}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="boat" size={20} color="#10B981" />
                <Text style={styles.cardTitle}>Fishery Details</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="location" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Zone & District</Text>
                <Text style={styles.detailValue}>
                  {userData?.zone && userData.zone !== "Not set"
                    ? `${userData.zone}, ${userData.district}`
                    : "Not set"}
                </Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="boat-outline" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Vessel</Text>
                <Text style={styles.detailValue}>{userData?.vesselName}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="shield-checkmark" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>License No.</Text>
                <Text style={styles.detailValue}>{userData?.licenseNumber}</Text>
              </View>
            </LinearGradient>

            {/* Experience Card */}
            <LinearGradient
              colors={["#FFF", "#FFFBEB"]}
              style={styles.detailCard}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="trending-up" size={20} color="#F59E0B" />
                <Text style={styles.cardTitle}>Experience</Text>
              </View>
              
              <View style={styles.experienceContainer}>
                <View style={styles.experienceYears}>
                  <Text style={styles.yearsNumber}>{userData?.experience}</Text>
                  <Text style={styles.yearsLabel}>Years in Industry</Text>
                </View>
                <View style={styles.experienceBar}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${Math.min(Number(userData?.experience) * 10, 100)}%`,
                        backgroundColor: getRoleColor(userData?.role || "")
                      }
                    ]} 
                  />
                </View>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="people" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Member Since</Text>
                <Text style={styles.detailValue}>
                  {formatDate(userData?.joinDate)}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => router.push("/change-password")}
          >
            <LinearGradient
              colors={["#0B3D91", "#1E90FF"]}
              style={StyleSheet.absoluteFillObject}
            />
            <Ionicons name="key" size={20} color="#FFF" />
            <Text style={styles.primaryButtonText}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.supportButton]}
            onPress={() => router.push("/support")}
          >
            <Ionicons name="help-circle" size={20} color="#0B3D91" />
            <Text style={styles.supportButtonText}>Support Center</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B3D91",
  },
  systemStatusBar: {
    height: StatusBar.currentHeight,
    backgroundColor: "#0B3D91",
  },
  gradientBg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bgPattern: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.1,
  },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },
  wavePattern: {
    position: "absolute",
    width: "100%",
    height: 100,
    bottom: 0,
    opacity: 0.3,
  },
  profileHeader: {
    padding: 24,
    paddingTop: 40,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  userName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
    gap: 6,
  },
  roleText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  specialization: {
    fontSize: 16,
    color: "#E2E8F0",
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 16,
    width: "90%",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#E2E8F0",
  },
  statDivider: {
    width: 1,
    height: "60%",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignSelf: "center",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginTop: -30,
    marginBottom: 24,
  },
  actionCard: {
    alignItems: "center",
    width: width / 4,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
  },
  detailsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 16,
  },
  detailsGrid: {
    gap: 16,
  },
  detailCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748B",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "right",
    flex: 1,
  },
  experienceContainer: {
    marginBottom: 20,
  },
  experienceYears: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
  },
  yearsNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#F59E0B",
    marginRight: 8,
  },
  yearsLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  experienceBar: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  actionButtonsContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    overflow: "hidden",
  },
  primaryButton: {
    shadowColor: "#0B3D91",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  supportButton: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#0B3D91",
  },
  supportButtonText: {
    color: "#0B3D91",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    alignItems: "center",
    padding: 40,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#E2E8F0",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  homeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  homeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

export default Profile;