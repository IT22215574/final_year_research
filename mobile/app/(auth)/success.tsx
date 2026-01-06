// app/(auth)/successscreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image
} from "react-native";
import { useRouter } from "expo-router";
import { images } from "@/constants";

const SuccessScreen = () => {
  const router = useRouter();

  const handleSignIn = () => {
    // Navigate to sign-in screen
    router.replace("/(auth)/sign-in");
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Illustration */}
        <Image 
          source={images.PassSucess} 
          style={styles.illustration} 
          resizeMode="contain" 
        />

        {/* Success Title */}
        <Text style={styles.successTitle}>Successful!</Text>

        {/* Success Message */}
        <Text style={styles.successMessage}>
          Your Password Has Been Changed{"\n"}
          Successfully
        </Text>

        {/* Sign In Button */}
        <TouchableOpacity 
          style={styles.signInBtn} 
          activeOpacity={0.8}
          onPress={handleSignIn}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default SuccessScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  illustration: {
    width: "100%",
    height: 200,
    alignSelf: "center",
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    color: "#3b82f6",
    textAlign: "center",
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 50,
    paddingHorizontal: 20,
  },
  signInBtn: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 300,
  },
  signInText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#fff",
  },
});