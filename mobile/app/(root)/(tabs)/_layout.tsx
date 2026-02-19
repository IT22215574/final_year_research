import { Tabs, router } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { icons } from "@/constants";
import useAuthStore from "@/stores/authStore";
import useNotificationStore from "@/stores/notificationStore";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import Sidebar from "@/components/Sidebar";
import Overlay from "@/components/Overlay";

export default function TabsLayout() {
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const { currentUser } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id) {
        fetchUnreadCount();
      }
    }, [currentUser?.id, fetchUnreadCount])
  );

  const handleTabPress = (tabName: string, route: string) => {
    setActiveTab(tabName);
    router.push(route as any);
  };

  const toggleSidebar = () => setSidebarVisible((prev) => !prev);

  const handleProfileNavigation = () => {
    handleTabPress("profile", "/(tabs)/profile");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#0057FF" translucent={false} />

      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown: true,
          headerShadowVisible: false,
          headerTitle: "",
          headerTintColor: "white",
          headerStyle: {
            backgroundColor: "#0057FF",
          },
          headerLeft: () => (
            <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
              <Image source={icons.burgermenu} style={styles.menuIcon} resizeMode="contain" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 20, marginTop: 4 }}
              onPress={() => handleTabPress("Notifications", "/(tabs)/Notifications")}
            >
              <Image
                source={icons.notification}
                style={styles.notificationIcon}
                resizeMode="contain"
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ),
          tabBarShowLabel: false,
          tabBarStyle: {
            display: "none",
          },
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="Market" />
        <Tabs.Screen name="Quality" />
        <Tabs.Screen name="Notifications" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="predictions" options={{ href: null }} />
      </Tabs>

      <Sidebar isVisible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <Overlay isVisible={sidebarVisible} onClose={() => setSidebarVisible(false)} />

      <View style={styles.customTabBar} className="rounded-t-3xl shadow-lg">
        <View style={styles.navItemsContainer}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress("home", "/(tabs)/home")}
          >
            <View style={[styles.iconContainer, activeTab === "home" && styles.iconContainerActive]}>
              <Image
                source={icons.nav_home}
                style={[styles.navIcon, activeTab === "home" && styles.navIconActive]}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.navText, activeTab === "home" && styles.navTextActive]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress("Market", "/(tabs)/Market")}
          >
            <View style={[styles.iconContainer, activeTab === "Market" && styles.iconContainerActive]}>
              <Image
                source={icons.HouseSale}
                style={[styles.navIcon, activeTab === "Market" && styles.navIconActive]}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.navText, activeTab === "Market" && styles.navTextActive]}>Market</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress("Quality", "/(tabs)/Quality")}
          >
            <View style={[styles.iconContainer, activeTab === "Quality" && styles.iconContainerActive]}>
              <Image
                source={icons.home_Quality}
                style={[styles.navIcon, activeTab === "Quality" && styles.navIconActive]}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.navText, activeTab === "Quality" && styles.navTextActive]}>Quality</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => handleTabPress("Notifications", "/(tabs)/Notifications")}
          >
            <View
              style={[
                styles.iconContainer,
                activeTab === "Notifications" && styles.iconContainerActive,
              ]}
            >
              <Image
                source={icons.notification}
                style={[styles.navIcon, activeTab === "Notifications" && styles.navIconActive]}
                resizeMode="contain"
              />
            </View>
            <Text
              style={[
                styles.navText,
                activeTab === "Notifications" && styles.navTextActive,
              ]}
            >
              Alerts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={handleProfileNavigation}>
            <View style={[styles.iconContainer, activeTab === "profile" && styles.iconContainerActive]}>
              <Image
                source={icons.nav_user}
                style={[styles.navIcon, activeTab === "profile" && styles.navIconActive]}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.navText, activeTab === "profile" && styles.navTextActive]}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

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
