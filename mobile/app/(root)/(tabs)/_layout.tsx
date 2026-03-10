import { Tabs, router, usePathname } from "expo-router";
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
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

// Types
type TabName =
  | "home"
  | "Market"
  | "Quality"
  | "Notifications"
  | "profile"
  | "Update_profile"
  | "SpeciesDetection"
  | "QualityGrading"
  | "GradingHistory"
  | "GradingDetail";

interface NavItemConfig {
  tabName: TabName;
  route: string;
  icon: any;
  label: string;
  showBadge?: boolean;
  iconStyle?: object;
}

// Responsive Helpers
const IS_WEB = Platform.OS === "web";

const getScaleFns = (width: number, height: number) => {
  const safeWidth = width || 1024;
  const safeHeight = height || 768;

  const isDesktop = IS_WEB && safeWidth >= 768;
  const isTablet = safeWidth >= 768;
  const isSmallScreen = safeWidth <= 375;

  const scale = (size: number) => {
    const factor = safeWidth / 375;
    const max = isDesktop ? 1.4 : 1.8;
    return Math.ceil(size * Math.min(factor, max));
  };

  const moderateScale = (size: number, f = 0.5) => {
    const factor = safeWidth / 375;
    const capped = isDesktop ? Math.min(factor, 1.4) : factor;
    return size + (capped - 1) * size * f;
  };

  const verticalScale = (size: number) => {
    const factor = safeHeight / 667;
    const max = isDesktop ? 1.4 : 1.8;
    return Math.ceil(size * Math.min(factor, max));
  };

  return {
    isDesktop,
    isTablet,
    isSmallScreen,
    scale,
    moderateScale,
    verticalScale,
  };
};

// Nav Item
interface NavItemProps {
  icon: any;
  label: string;
  isActive: boolean;
  onPress: () => void;
  showBadge?: boolean;
  badgeCount?: number;
  isDesktop: boolean;
  iconSize: number;
  containerSize: number;
  iconStyle?: object;
}

const NavItem = ({
  icon,
  label,
  isActive,
  onPress,
  showBadge,
  badgeCount = 0,
  isDesktop,
  iconSize,
  containerSize,
  iconStyle,
}: NavItemProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={IS_WEB ? () => setIsHovered(true) : undefined}
      onHoverOut={IS_WEB ? () => setIsHovered(false) : undefined}
      style={[
        styles.navItem,
        isDesktop && styles.navItemDesktop,
        !isDesktop && { flex: 1 },
        IS_WEB && isHovered && styles.navItemHovered,
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.iconContainer,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
          },
          isActive && styles.iconContainerActive,
          IS_WEB && isHovered && !isActive && styles.iconContainerHovered,
        ]}
      >
        <Image
          source={icon}
          style={[
            { width: iconSize, height: iconSize },
            {
              tintColor: isActive
                ? "#FFFFFF"
                : isHovered && !isActive
                ? "#005CFF"
                : "#64748b",
            },
            iconStyle,
          ]}
          resizeMode="contain"
        />
        {showBadge && badgeCount > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          </View>
        )}
      </View>

      <Text
        style={[
          styles.navText,
          isActive && styles.navTextActive,
          IS_WEB && isHovered && !isActive && { color: "#005CFF" },
          isDesktop && { lineHeight: 12 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

// Main Layout
const TabsLayout = () => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();

  const {
    isDesktop,
    scale,
    moderateScale,
    verticalScale,
  } = useMemo(() => getScaleFns(width, height), [width, height]);

  const [activeTab, setActiveTab] = useState("home");
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const { currentUser, isSignedIn } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  const isGuest = !isSignedIn || !currentUser;

  const navItems: NavItemConfig[] = useMemo(
    () => [
      {
        tabName: "home",
        route: "/(root)/(tabs)/home",
        icon: icons.nav_home,
        label: "Home",
        iconStyle: { marginRight: 3 },
      },
      {
        tabName: "Market",
        route: "/(root)/(tabs)/Market",
        icon: icons.HouseSale,
        label: "Market",
      },
      {
        tabName: "Quality",
        route: "/(root)/(tabs)/Quality",
        icon: icons.Digital,
        label: "Quality",
      },
      {
        tabName: "profile",
        route: "/(root)/(tabs)/profile",
        icon: icons.nav_user,
        label: "Profile",
        showBadge: false,
      },
    ],
    []
  );

  useEffect(() => {
    if (pathname.includes("/Market")) {
      setActiveTab("Market");
    } else if (pathname.includes("/Quality")) {
      setActiveTab("Quality");
    } else if (pathname.includes("/Notifications")) {
      setActiveTab("Notifications");
    } else if (pathname.includes("/profile") || pathname.includes("/Update_profile")) {
      setActiveTab("profile");
    } else {
      setActiveTab("home");
    }
  }, [pathname]);

  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id) {
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

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (activeTab === "home") {
          BackHandler.exitApp();
          return true;
        }

        setActiveTab("home");
        router.replace("/(root)/(tabs)/home");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [activeTab])
  );

  const handleTabPress = (tabName: TabName, route: string) => {
    if (tabName === "profile" && isGuest) {
      router.push("/sign-in");
      return;
    }

    setActiveTab(tabName);
    router.push(route as any);
  };

  const toggleSidebar = () => {
    setSidebarVisible((prev) => !prev);
  };

  const iconSize = scale(24);
  const containerSize = scale(40);
  const headerHeight = verticalScale(55);

  const bottomBarHeight: number = isDesktop
    ? Math.max(90, containerSize + 20 + 14 + verticalScale(8))
    : Platform.select({
        ios: verticalScale(60) + insets.bottom,
        android: verticalScale(65) + insets.bottom,
        default: verticalScale(70) + insets.bottom,
      }) ?? verticalScale(70) + insets.bottom;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Blue Status Bar */}
      <StatusBar style="light" backgroundColor="#f8fafc" translucent={false} />

      <View style={isDesktop ? styles.desktopWrapper : styles.container}>
        {isDesktop && currentUser && (
          <Sidebar isVisible={true} onClose={() => {}} />
        )}

        <View style={{ flex: 1 }}>
          <Tabs
            initialRouteName="home"
            screenOptions={{
              headerShown: true,
              tabBarShowLabel: false,
              tabBarStyle: { display: "none" },
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
                shadowOpacity: 0,
                borderBottomWidth: 0,
                height: headerHeight,
              },
              headerShadowVisible: false,
              headerTintColor: "#FFFFFF",
              headerTitleStyle: {
                fontWeight: "bold",
                color: "#FFFFFF",
                fontFamily: "Inter-Bold",
                fontSize: moderateScale(18),
              },
              headerLeft: () => (
                <View>
                  {!isDesktop && (
                    <TouchableOpacity
                      style={{ marginLeft: moderateScale(15) }}
                      onPress={toggleSidebar}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Image
                        source={icons.burgermenu}
                        style={{
                          width: scale(28),
                          height: scale(28),
                          tintColor: "#FFFFFF",
                        }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  )}
                </View>
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
                headerShown: true,
              }}
            />

            <Tabs.Screen
              name="Market"
              options={{
                title: "",
                headerShown: true,
              }}
            />
            <Tabs.Screen
              name="Quality"
              options={{
                title: "Quality Grade",
                headerShown: true,
                headerTitleAlign: "center",
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
              }}
            />
            <Tabs.Screen
              name="profile"
              options={{
                title: "Profile",
                headerShown: true,
                headerTitleAlign: "center",
                headerStyle: {
                  backgroundColor: "#0057FF",
                },
              }}
            />

            <Tabs.Screen
              name="Update_profile"
              options={{
                title: "Edit Profile",
                headerShown: true,
                headerTitleAlign: "center",
                headerStyle: {
                  backgroundColor: "#0057FF",
                },
                href: null,
              }}
            />

            <Tabs.Screen
              name="SpeciesDetection"
              options={{
                title: "Species Detection",
                headerShown: true,
                headerTitleAlign: "center",
                headerStyle: {
                  backgroundColor: "#0057FF",
                },
                href: null,
              }}
            />

            <Tabs.Screen
              name="QualityGrading"
              options={{
                title: "Quality Grading",
                headerShown: true,
                headerTitleAlign: "center",
                headerStyle: {
                  backgroundColor: "#0057FF",
                },
                href: null,
              }}
            />
            <Tabs.Screen
              name="GradingHistory"
              options={{
                headerShown: true,
                headerStyle: {
                  backgroundColor: "#0057FF",
                },
                href: null,
              }}
            />
            <Tabs.Screen
              name="GradingDetail"
              options={{
                headerShown: true,
                headerStyle: {
                  backgroundColor: "#0057FF",
                },
                href: null,
              }}
            />

            <Tabs.Screen
              name="fishtripcost"
              options={{
                title: "Fish Trip Cost",
                headerShown: true,
                headerStyle: {
                  backgroundColor: "#0057FF",
                },
                href: null,
              }}
            />
          </Tabs>

          {!isDesktop && (
            <>
              <Sidebar
                isVisible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
              />
              <Overlay
                isVisible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
              />
            </>
          )}
        </View>

        {/* Bottom Navigation - Unified for desktop & mobile */}
          {isDesktop ? (
            <View
              style={[
                styles.customTabBar,
                styles.tabBarDesktop,
                { height: bottomBarHeight },
              ]}
            >
              <View style={[styles.navItemsContainer, styles.navItemsDesktop]}>
                {navItems.map((item) => (
                  <NavItem
                    key={item.tabName}
                    icon={item.icon}
                    label={item.label}
                    isActive={activeTab === item.tabName}
                    onPress={() => handleTabPress(item.tabName, item.route)}
                    showBadge={item.showBadge}
                    badgeCount={unreadCount}
                    isDesktop={true}
                    iconSize={iconSize}
                    containerSize={containerSize}
                    iconStyle={item.iconStyle}
                  />
                ))}
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
          

          {(currentUser?.role === "Teacher" ||
            currentUser?.role === "INTERNAL_TEACHER" ||
            currentUser?.role === "EXTERNAL_TEACHER") && (
            <TouchableOpacity
              style={styles.navItem}
              onPress={() =>
                handleTabPress(
                  "TransferRequest",
                  "/(tabs)/TeacherTransferRequests"
                )
              }
            >
              <View
                style={[
                  styles.iconContainer,
                  activeTab === "TransferRequest" && styles.iconContainerActive,
                ]}
              >
                <Image
                  source={icons.proposal}
                  style={[
                    styles.navIcon,
                    activeTab === "TransferRequest" && styles.navIconActive,
                  ]}
                  resizeMode="contain"
                />
              </View>
            )
          )}
      </View>
    </SafeAreaView>
  );
}

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
    minWidth: 0,
    paddingHorizontal: 12,
  },
  navItemHovered: {
    backgroundColor: "#EFF6FF",
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
