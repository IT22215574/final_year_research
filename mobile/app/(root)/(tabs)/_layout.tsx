import { Tabs, router } from "expo-router";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { icons, HEADER_GRADIENT } from "@/constants";
import useAuthStore from "@/stores/authStore";
import useNotificationStore from "@/stores/notificationStore";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Overlay from "@/components/Overlay";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

const IS_WEB = Platform.OS === "web";

const TabsLayout = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const { currentUser } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();
  const { width } = useWindowDimensions();
  const isDesktop = IS_WEB && width >= 768;
  // Fetch unread count on focus and component mount
  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id) {
        console.log("🎯 TabsLayout focused, fetching unread count...");
        fetchUnreadCount();
      }
    }, [currentUser?.id, fetchUnreadCount]),
  );

  // Initial fetch
  useEffect(() => {
    if (currentUser?.id) {
      fetchUnreadCount();
    }
  }, [currentUser?.id, fetchUnreadCount]);

  const handleSubmitAd = () => {
    const state = useAuthStore.getState();
    if (state.isSignedIn) {
      router.push("/#");
    } else {
      router.push("/#");
    }
  };

  const handleProfileNavigation = () => {
    const state = useAuthStore.getState();
    if (state.isSignedIn) {
      setActiveTab("profile");
      router.push("/profile");
    } else {
      router.push("/sign-in");
    }
  };

  const handleTabPress = (tabName: string, route: string) => {
    setActiveTab(tabName);
    router.push(route);
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <SafeAreaProvider style={styles.safe}>
      <StatusBar style="light" backgroundColor={HEADER_GRADIENT[0]} translucent={false} />
      
      <View style={isDesktop ? styles.desktopWrapper : styles.container}>
        {/* Desktop: Persistent sidebar on the left - condition based on your auth logic */}
        {isDesktop && currentUser && (
          <Sidebar isVisible={true} onClose={() => {}} />
        )}

        <View style={{ flex: 1 }}>
          <Tabs
            initialRouteName="home"
            screenOptions={{
              headerShown: true,
              headerBackground: () => (
                <LinearGradient
                  colors={HEADER_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              ),
              headerStyle: {
                backgroundColor: "transparent",
                elevation: 0,
              },
              headerShadowVisible: false,
              headerTintColor: "white",
              headerTitleStyle: {
                fontWeight: "bold",
                color: "white",
                fontFamily: "Inter-Bold",
              },
              headerLeft: () =>
                !isDesktop ? (
                  <View>
                    <TouchableOpacity
                      style={{ marginLeft: 15 }}
                      onPress={toggleSidebar}
                    >
                      <Image
                        source={icons.burgermenu}
                        style={styles.menuIcon}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>
                ) : null,
              headerRight: () => (
                <TouchableOpacity
                  style={{ marginRight: 20, marginTop: 4 }}
                  onPress={() => router.push("/Notifications")}
                >
                  <Image
                    source={icons.notification}
                    style={styles.notificationIcon}
                    resizeMode="contain"
                  />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Text>
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
            <Tabs.Screen
              name="home"
              options={{
                title: "",
              }}
            />

            <Tabs.Screen
              name="Market"
              options={{
                title: "",
              }}
            />
            <Tabs.Screen
              name="Quality"
              options={{
                title: "",
              }}
            />
            <Tabs.Screen
              name="Notifications"
              options={{
                title: "",
              }}
            />
            <Tabs.Screen
              name="profile"
              options={{
                title: "Profile",
              }}
            />
            <Tabs.Screen
              name="Update_profile"
              options={{
                title: "Edit Profile",
              }}
            />
          </Tabs>

          {/* Mobile overlay sidebar (only on mobile) */}
          {!isDesktop && (
            <>
              <Sidebar isVisible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
              <Overlay isVisible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
            </>
          )}

          {/* Custom Bottom Navigation */}
          <View style={styles.customTabBar} className="rounded-t-3xl shadow-lg">
            <View style={styles.navItemsContainer}>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => handleTabPress("home", "/home")}
              >
                <View
                  style={[
                    styles.iconContainer,
                    activeTab === "home" && styles.iconContainerActive,
                  ]}
                >
                  <Image
                    source={icons.nav_home}
                    style={[
                      styles.navIcon,
                      activeTab === "home" && styles.navIconActive,
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={[
                    styles.navText,
                    activeTab === "home" && styles.navTextActive,
                  ]}
                >
                  Home
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => handleTabPress("Market", "/Market")}
              >
                <View
                  style={[
                    styles.iconContainer,
                    activeTab === "Market" && styles.iconContainerActive,
                  ]}
                >
                  <Image
                    source={icons.HouseSale}
                    style={[
                      styles.navIcon,
                      activeTab === "Market" && styles.navIconActive,
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={[
                    styles.navText,
                    activeTab === "Market" && styles.navTextActive,
                  ]}
                >
                  Market
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => handleTabPress("Quality", "/Quality")}
              >
                <View
                  style={[
                    styles.iconContainer,
                    activeTab === "Quality" && styles.iconContainerActive,
                  ]}
                >
                  <Image
                    source={icons.Digital}
                    style={[
                      styles.navIcon,
                      activeTab === "Quality" && styles.navIconActive,
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={[
                    styles.navText,
                    activeTab === "Quality" && styles.navTextActive,
                  ]}
                >
                  Quality
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={handleProfileNavigation}
              >
                <View
                  style={[
                    styles.iconContainer,
                    activeTab === "profile" && styles.iconContainerActive,
                  ]}
                >
                  <Image
                    source={icons.nav_user}
                    style={[
                      styles.navIcon,
                      activeTab === "profile" && styles.navIconActive,
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={[
                    styles.navText,
                    activeTab === "profile" && styles.navTextActive,
                  ]}
                >
                  Profile
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: "#f8fafc" 
  },
  container: { 
    flex: 1 
  },
  desktopWrapper: {
    flex: 1,
    flexDirection: "row",
  },
  customTabBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    height: 90,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "white",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItemsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 2,
  },
  navItem: {
    alignItems: "center",
    marginHorizontal: 8,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: "#005CFF",
  },
  navIcon: {
    width: 25,
    height: 25,
    tintColor: "#64748b",
  },
  navIconActive: {
    tintColor: "white",
  },
  navText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "500",
  },
  navTextActive: {
    color: "#005CFF",
    fontWeight: "bold",
  },
  menuIcon: {
    width: 32,
    height: 32,
    tintColor: "white",
  },
  notificationIcon: {
    width: 32,
    height: 32,
    tintColor: "white",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Inter-SemiBold",
  },
});

export default TabsLayout;