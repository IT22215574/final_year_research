import { Tabs, router, usePathname } from "expo-router";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  BackHandler,
  Pressable,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { icons, HEADER_GRADIENT } from "@/constants";
import useAuthStore from "@/stores/authStore";
import useNotificationStore from "@/stores/notificationStore";
import { useState, useEffect, useCallback, useMemo } from "react";
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

  const [activeTab, setActiveTab] = useState<TabName>("home");
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
    <SafeAreaProvider style={styles.safe}>
      <StatusBar
        style="light"
        backgroundColor={HEADER_GRADIENT[0]}
        translucent={false}
      />

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
                href: null,
              }}
            />

            <Tabs.Screen
              name="fishtripcost"
              options={{
                title: "Fish Trip Cost",
                headerShown: true,
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
            </View>
          ) : (
            !sidebarVisible && (
              <View
                style={[
                  styles.customTabBar,
                  styles.tabBarMobile,
                  {
                    paddingBottom: Math.max(insets.bottom, verticalScale(8)),
                    height: bottomBarHeight,
                  },
                ]}
              >
                <View style={styles.navItemsContainer}>
                  {navItems.map((item) => (
                    <NavItem
                      key={item.tabName}
                      icon={item.icon}
                      label={item.label}
                      isActive={activeTab === item.tabName}
                      onPress={() => handleTabPress(item.tabName, item.route)}
                      showBadge={item.showBadge}
                      badgeCount={unreadCount}
                      isDesktop={false}
                      iconSize={iconSize}
                      containerSize={containerSize}
                      iconStyle={item.iconStyle}
                    />
                  ))}
                </View>
              </View>
            )
          )}
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
  },
  desktopWrapper: {
    flex: 1,
    flexDirection: "row",
  },
  customTabBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBarMobile: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  tabBarDesktop: {
    position: "relative",
    paddingHorizontal: 48,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingBottom: 0,
  },
  navItemsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    flex: 1,
    width: "100%",
  },
  navItemsDesktop: {
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 16,
  },
  navItemDesktop: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  navItemHovered: {
    backgroundColor: "#EFF6FF",
  },
  iconContainer: {
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: "#005CFF",
  },
  iconContainerHovered: {
    backgroundColor: "#DBEAFE",
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
    textAlign: "center",
    includeFontPadding: false,
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
  tabBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
});

export default TabsLayout;