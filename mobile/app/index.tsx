import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Navigate directly to home without authentication
    setTimeout(() => {
      router.replace("/(root)/(tabs)/home");
    }, 100);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0B3D91" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
});
