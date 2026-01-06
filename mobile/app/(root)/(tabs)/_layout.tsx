import { Tabs, router } from "expo-router";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { icons } from "@/constants";
import useAuthStore from "@/stores/authStore";
import useNotificationStore from "@/stores/notificationStore";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Overlay from "@/components/Overlay";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

const TabsLayout = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const { currentUser } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id) {
        fetchUnreadCount();
      }
    }, [currentUser?.id])
  );

  useEffect(() => {
    if (currentUser?.id) {
      fetchUnreadCount();
    }
  }, [currentUser?.id]);

  const handleProfileNavigation = () => {
    const state = useAuthStore.getState();
    if (state.isSignedIn) {
      setActiveTab("profile");
      router.push("/profile");
    } else {
      router.push("/sign-in");
    }
  };

  const handleTabPress = (tab: string, route: string) => {
    setActiveTab(tab);
    router.push(route);
  };

  const toggleSidebar = () => {
    (navigation as any).openDrawer();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#0057FF" />

      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: "#0057FF" },
          headerShadowVisible: false,
          tabBarStyle: { display: "none" },
          headerLeft: () => (
            <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
              <Image source={icons.burgermenu} style={styles.menuIcon} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 20 }}
              onPress={() => router.push("/(tabs)/Notifications")}
            >
              <Image source={icons.notification} style={styles.notificationIcon} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ),
        }}
      >
        <Tabs.Screen name="home" options={{ title: "" }} />
        <Tabs.Screen name="TeacherHome" options={{ title: "" }} />
        <Tabs.Screen name="Market" options={{ title: "" }} />
        <Tabs.Screen name="Quality" options={{ title: "" }} />
        <Tabs.Screen name="Notifications" options={{ title: "" }} />
        <Tabs.Screen name="SearchMatches" options={{ title: "" }} />
        <Tabs.Screen name="TeacherTransferRequests" options={{ title: "" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        <Tabs.Screen name="update_profile" options={{ title: "Edit Profile" }} />
      </Tabs>

      <Sidebar isVisible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <Overlay isVisible={sidebarVisible} onClose={() => setSidebarVisible(false)} />

      {/* CUSTOM BOTTOM TAB BAR */}
      <View style={styles.customTabBar}>
        <View style={styles.navItemsContainer}>

          {/* HOME */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress("home", "/(tabs)/home")}
          >
            <View style={[styles.iconContainer, activeTab === "home" && styles.iconContainerActive]}>
              <Image source={icons.nav_home} style={[styles.navIcon, activeTab === "home" && styles.navIconActive]} />
            </View>
            <Text style={[styles.navText, activeTab === "home" && styles.navTextActive]}>Home</Text>
          </TouchableOpacity>

          {/* SEARCH */}
          {(currentUser?.role === "Teacher" ||
            currentUser?.role === "INTERNAL_TEACHER" ||
            currentUser?.role === "EXTERNAL_TEACHER") && (
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => handleTabPress("search", "/(tabs)/SearchMatches")}
            >
              <View style={[styles.iconContainer, activeTab === "search" && styles.iconContainerActive]}>
                <Image source={icons.search} style={[styles.navIcon, activeTab === "search" && styles.navIconActive]} />
              </View>
              <Text style={[styles.navText, activeTab === "search" && styles.navTextActive]}>Search</Text>
            </TouchableOpacity>
          )}

          {/* MARKET */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress("Market", "/(tabs)/Market")}
          >
            <View style={[styles.iconContainer, activeTab === "Market" && styles.iconContainerActive]}>
              <Image source={icons.HouseSale} style={[styles.navIcon, activeTab === "Market" && styles.navIconActive]} />
            </View>
            <Text style={[styles.navText, activeTab === "Market" && styles.navTextActive]}>Market</Text>
          </TouchableOpacity>

          {/* QUALITY */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress("Quality", "/(tabs)/Quality")}
          >
            <View style={[styles.iconContainer, activeTab === "Quality" && styles.iconContainerActive]}>
              <Image source={icons.Digital} style={[styles.navIcon, activeTab === "Quality" && styles.navIconActive]} />
            </View>
            <Text style={[styles.navText, activeTab === "Quality" && styles.navTextActive]}>Quality</Text>
          </TouchableOpacity>

          {/* PROFILE */}
          <TouchableOpacity style={styles.navItem} onPress={handleProfileNavigation}>
            <View style={[styles.iconContainer, activeTab === "profile" && styles.iconContainerActive]}>
              <Image source={icons.nav_user} style={[styles.navIcon, activeTab === "profile" && styles.navIconActive]} />
            </View>
            <Text style={[styles.navText, activeTab === "profile" && styles.navTextActive]}>Profile</Text>
          </TouchableOpacity>

        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  menuButton: { marginLeft: 15, padding: 8 },
  menuIcon: { width: 28, height: 28, tintColor: "white" },
  notificationIcon: { width: 26, height: 26, tintColor: "white" },

  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "red",
    borderRadius: 10,
    paddingHorizontal: 5,
  },
  badgeText: { color: "white", fontSize: 11 },

  customTabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: "white",
  },
  navItemsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    flex: 1,
  },
  navItem: { alignItems: "center" },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainerActive: { backgroundColor: "#005CFF" },
  navIcon: { width: 24, height: 24, tintColor: "#64748b" },
  navIconActive: { tintColor: "white" },
  navText: { fontSize: 12, color: "#64748b" },
  navTextActive: { color: "#005CFF", fontWeight: "bold" },
});

export default TabsLayout;
