import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Platform,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter, type Href } from "expo-router";
import useAuthStore from "@/stores/authStore";
import { icons } from "@/constants";

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isVisible, onClose }) => {
  const router = useRouter();
  const { currentUser, isSignedIn, signOut } = useAuthStore();

  if (!isVisible) return null;

  const handleNavigation = (path: Href) => {
    onClose();
    router.push(path);
  };

  const handleLogout = async () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          onClose();
          await SecureStore.deleteItemAsync("access_token");
          await SecureStore.deleteItemAsync("refresh_token");
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  let menuItems: {
    name: string;
    path?: Href;
    icon: any;
    action?: () => void;
    isDanger?: boolean;
  }[] = [
    { name: "Home", path: "/(root)/(tabs)/home", icon: icons.nav_home },
    { name: "Market", path: "/(root)/(tabs)/Market", icon: icons.HouseSale },
    { name: "Quality", path: "/(root)/(tabs)/Quality", icon: icons.Digital },
    {
      name: "Notifications",
      path: "/(root)/(tabs)/Notifications",
      icon: icons.notification,
    },
    { name: "Profile", path: "/(root)/(tabs)/profile", icon: icons.nav_user },
    {
      name: "Trip Cost",
      path: "/(root)/(tabs)/fishtripcost",
      icon: icons.BackArrow,
    },
  ];

  // ADD THIS BLOCK right after the array closes:
  if (currentUser?.role === "fisher admin") {
    menuItems.push(
      // Just ONE button for the sidebar
      {
        name: "Fisher Admin", // <--- This will show in the sidebar!
        path: "/(root)/(tabs)/fishtripcostadmin",
        icon: icons.Digital,
      },
    );
  }

  // Default avatar if user doesn't have one
  const defaultAvatar = icons.nav_user;

  // Helper function to get image source
  const getImageSource = (icon: any) => {
    if (!icon) return null;
    if (typeof icon === "object" && icon.uri) {
      return { uri: icon.uri };
    }
    if (typeof icon === "number") {
      return icon;
    }
    if (typeof icon === "string") {
      return { uri: icon };
    }
    return icon;
  };

  return (
    <View style={styles.sidebar}>
      {/* User Info Section */}
      <View style={styles.userSection}>
        <View style={styles.avatarContainer}>
          <Image
            source={
              isSignedIn && currentUser?.profilePicture
                ? { uri: currentUser.profilePicture }
                : defaultAvatar
            }
            style={styles.avatar}
          />
        </View>

        <Text style={styles.userName}>
          {isSignedIn && currentUser ? currentUser.firstName : "Guest"}
        </Text>
        <Text style={styles.userEmail}>
          {isSignedIn && currentUser ? currentUser.email : ""}
        </Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menuItems}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() =>
              item.action
                ? item.action()
                : item.path && handleNavigation(item.path)
            }
            activeOpacity={0.7}
          >
            <Image source={getImageSource(item.icon)} style={styles.menuIcon} />
            <Text style={styles.menuText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity
          style={styles.logoutItem}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Image
            source={require("../assets/icons/logout.png")}
            style={styles.logoutIcon}
            // Android fix: Force image to not use default tint
            defaultSource={require("../assets/icons/logout.png")}
          />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 280,
    height: "100%",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  userSection: {
    marginBottom: 30,
    paddingBottom: 20,
    marginTop: Platform.OS === "ios" ? 20 : 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
  },
  menuItems: {
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
    tintColor: "#4B5563",
    resizeMode: "contain",
  },
  menuText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "500",
  },
  logoutContainer: {
    marginTop: 20,
    marginBottom: Platform.OS === "ios" ? 10 : 5,
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logoutIcon: {
    width: 22,
    tintColor: "#EF4444",
    height: 22,
    resizeMode: "contain",
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
});

export default Sidebar;
