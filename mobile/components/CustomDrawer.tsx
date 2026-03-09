import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import useAuthStore from "@/stores/authStore";
import { icons } from "@/constants";

export function CustomDrawerContent(props: any) {
  const { signOut, currentUser } = useAuthStore();

  const handleLogout = async () => {
    await signOut();
    props.navigation.closeDrawer();
  };

  return (
    <DrawerContentScrollView {...props} style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Image
          source={
            currentUser?.profilePicture
              ? { uri: currentUser.profilePicture }
              : icons.nav_user
          }
          style={styles.avatar}
        />
        <Text style={styles.userName}>
          {currentUser?.firstName || "Guest"} {currentUser?.lastName || ""}
        </Text>
        <Text style={styles.userEmail}>
          {currentUser?.email || "guest@example.com"}
        </Text>
      </View>

      {/* Menu Items */}
      <DrawerItemList {...props} />

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Image source={icons.nav_user} style={styles.logoutIcon} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#0057FF",
    marginBottom: 10,
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  userName: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userEmail: {
    color: "white",
    fontSize: 14,
    opacity: 0.9,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  logoutIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    tintColor: "#EF4444",
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
});
