import { Tabs, router } from "expo-router";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  Linking,
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
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

const TabsLayout = () => {

  const [activeTab, setActiveTab] = useState("home");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const { currentUser } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  // Fetch unread count on focus and component mount
  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id) {
        console.log("🎯 TabsLayout focused, fetching unread count...");
        fetchUnreadCount();
      }
    }, [currentUser?.id, fetchUnreadCount])
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
    <SafeAreaView style={styles.safeArea}>
      {/* Blue Status Bar */}
      <StatusBar style="light" backgroundColor="#f8fafc" translucent={false} />

      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown: true,
          headerBackground: () => (
            <LinearGradient
            
              colors={['#0066CC', '#00A3FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          ),
          headerStyle: {
            backgroundColor: 'transparent',
            elevation: 0,
          },
          headerShadowVisible: false,
          headerTintColor: "black",
          headerTitleStyle: {
            fontWeight: "bold",
            color: "white",
            fontFamily: "Inter-Bold",
          },
          headerLeft: () => (
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
          ),
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 20, marginTop: 4 }}
              onPress={() => router.push("/(root)/(tabs)/Notifications")}
            >
              <Image
                source={icons.notification}
                style={styles.notificationIcon}
                resizeMode="contain"
              />
              {/* Conditionally render badge */}
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ),
          headerStyle: {
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
            marginBottom: 10,
          },
          tabBarShowLabel: false,
          tabBarStyle: {
            display: "none",
          },
        }}
      >
        {/* ... all your Tabs.Screen components remain the same ... */}
        <Tabs.Screen
          name="home"
          options={{
            title: "",
            headerShown: true,
            headerStyle: {
              backgroundColor: "#0057FF",
            },
          }}
        />

        <Tabs.Screen
          name="Market"
          options={{
            title: "",
            headerShown: true,
            headerStyle: {
              backgroundColor: "#0057FF",
            },
          }}
        />
        <Tabs.Screen
          name="Quality"
          options={{
            title: "",
            headerShown: true,
            headerStyle: {
              backgroundColor: "#0057FF",
            },
          }}
        />
        <Tabs.Screen
          name="Notifications"
          options={{
            title: "",
            headerShown: true,
            headerStyle: {
              backgroundColor: "#0057FF",
            },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            headerShown: true,
            headerStyle: {
              backgroundColor: "#0057FF",
            },
          }}
        />
      </Tabs>

      {/* Sidebar and Overlay */}
      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
      <Overlay
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />

      {/* Custom Bottom Navigation - This remains exactly the same */}
      <View style={styles.customTabBar} className="rounded-t-3xl shadow-lg">
        {/* Navigation Items - This remains exactly the same */}
        <View style={styles.navItemsContainer}>
          {/* ... all your existing navigation items remain the same ... */}
          
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => handleTabPress("home", "/(root)/(tabs)/home")}
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
              onPress={() => handleTabPress("Market", "/(root)/(tabs)/Market")}
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
              onPress={() =>
                handleTabPress("Quality", "/(root)/(tabs)/Quality")
              }
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
    marginTop: -45,
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
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3A3F47",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
    justifyContent: "center",
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3A3F47",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginLeft: 10,
    justifyContent: "center",
  },
  buttonIcon: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  buttonText: {
    color: "#FEE01C",
    fontWeight: "500",
    fontSize: 14,
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
  submitButton: {
    backgroundColor: "#FEE01C",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonText: {
    color: "black",
    fontSize: 24,
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
    borderColor: "#FFFFFF", // Changed to white for better visibility on blue header
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold", // Made bold for better visibility
    fontFamily: "Inter-SemiBold",
  },
});

export default TabsLayout;
