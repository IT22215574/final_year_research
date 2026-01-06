import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Link, useRouter } from "expo-router";
import useAuthStore from "@/stores/authStore";
import { icons } from "@/constants";

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isVisible, onClose }) => {
  const router = useRouter();
  const { currentUser, isSignedIn } = useAuthStore();

  if (!isVisible) return null;

  const handleNavigation = (path: string) => {
    onClose();
    router.push(path as any);
  };

  const menuItems = [
  
    { name: "Exams", path: "/(root)/(tabs)/exams", icon: icons.nav_exam },
    { name: "Exams", path: "/(root)/(tabs)/exams", icon: icons.nav_exam },

    {
      name: "Class Links",
      path: "/class-links",
      icon: icons.sidebar_classlink,
    },
    { name: "Admin Chat", path: "/admin-chat", icon: icons.sidebar_admin },
  ];

  // Default avatar if user doesn't have one
  const defaultAvatar = icons.nav_user;

  return (
    <View style={styles.sidebar}>
      {/* User Info Section */}
      <View style={styles.userSection}>
        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <Image
            source={
              isSignedIn && currentUser?.profileAvatar
                ? { uri: currentUser.profileAvatar }
                : defaultAvatar
            }
            style={styles.avatar}
          />
        </View>

        <Text style={styles.userName}>
          {isSignedIn && currentUser ? currentUser.firstName : "Sophia Rose"}
        </Text>
        <Text style={styles.userEmail}>
          {isSignedIn && currentUser ? currentUser.email : "adswws2@xcs"}
        </Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menuItems}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => handleNavigation(item.path)}
          >
            <Image source={item.icon} style={styles.menuIcon} />
            <Text style={styles.menuText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
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
    padding: 20,
    zIndex: 1000,
  },
  userSection: {
    marginBottom: 30,
    paddingBottom: 20,
    marginTop: 100, // Reduced marginTop to accommodate avatar
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "black",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "#9ca3af",
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
    width: 20,
    height: 20,
    marginRight: 12,
    tintColor: "#4b5563",
  },
  menuText: {
    color: "black",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default Sidebar;
