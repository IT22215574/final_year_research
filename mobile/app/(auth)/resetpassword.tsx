// app/(auth)/resetpassword.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { images } from "@/constants";

const API = process.env.EXPO_PUBLIC_API_KEY;

const ResetPassword = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { emailOrPhone, isEmail, resetToken, userId } = params;
  
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [secureText, setSecureText] = useState({
    newPassword: true,
    confirmPassword: true
  });
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    // Verify reset token when screen loads
    verifyResetToken();
  }, []);

  const verifyResetToken = async () => {
    try {
      const response = await fetch(`${API}/api/auth/verify-reset-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resetToken: resetToken
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Invalid or expired reset link");
      }

      setTokenValid(true);

    } catch (error: any) {
      console.error("Verify token error:", error);
      Alert.alert(
        "Error", 
        error.message || "This reset link is invalid or has expired.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/forgetpassword")
          }
        ]
      );
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const validateForm = () => {
    if (!formData.newPassword || !formData.confirmPassword) {
      setError("Please fill in all fields");
      return false;
    }

    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };


const handleResetPassword = async () => {
  if (!validateForm()) return;

  setLoading(true);
  setError("");

  try {
    const response = await fetch(`${API}/api/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resetToken: resetToken,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to reset password");
    }

    // Password reset successful - Navigate to success screen
    router.replace({
      pathname: "/(auth)/success",
      params: { 
        emailOrPhone: emailOrPhone,
        isEmail: isEmail
      }
    });

  } catch (error: any) {
    console.error("Reset password error:", error);
    setError(error.message || "Failed to reset password. Please try again.");
  } finally {
    setLoading(false);
  }
};

  const toggleSecureText = (field: 'newPassword' | 'confirmPassword') => {
    setSecureText(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const maskedEmailOrPhone = isEmail === "true" 
    ? emailOrPhone 
    : (emailOrPhone as string).replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');

  if (!tokenValid) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Verifying reset link...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        {/* Illustration */}
        <Image 
          source={images.Forgot3} 
          style={styles.illustration} 
          resizeMode="contain" 
        />

        {/* Title */}
        <Text style={styles.title}>Create New Password</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Create New Password{"\n"}
          <Text style={styles.emailPhoneText}>{maskedEmailOrPhone}</Text>
        </Text>

        {/* New Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            New Password <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color="#9BA3AB" 
              style={styles.icon} 
            />
            <TextInput
              placeholder="Enter new password"
              placeholderTextColor="#9BA3AF"
              style={styles.input}
              value={formData.newPassword}
              onChangeText={(text) => handleChange("newPassword", text)}
              secureTextEntry={secureText.newPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => toggleSecureText('newPassword')}>
              <Ionicons
                name={secureText.newPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#9BA3AB"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Confirm Password <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color="#9BA3AB" 
              style={styles.icon} 
            />
            <TextInput
              placeholder="Confirm new password"
              placeholderTextColor="#9BA3AF"
              style={styles.input}
              value={formData.confirmPassword}
              onChangeText={(text) => handleChange("confirmPassword", text)}
              secureTextEntry={secureText.confirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => toggleSecureText('confirmPassword')}>
              <Ionicons
                name={secureText.confirmPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#9BA3AB"
              />
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {/* Reset Button */}
        <TouchableOpacity 
          style={[
            styles.resetBtn, 
            loading && styles.disabledButton
          ]} 
          activeOpacity={0.8}
          disabled={loading}
          onPress={handleResetPassword}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.resetText}>Update Password</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ResetPassword;

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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#666",
  },
  backBtn: {
    position: "absolute",
    top: 10,
    left: 20,
    zIndex: 10,
  },
  illustration: {
    width: "100%",
    height: 200,
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  emailPhoneText: {
    fontFamily: "Poppins-SemiBold",
    color: "#3b82f6",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: "#000",
    marginBottom: 8,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
  },
  required: {
    color: "#ef4444",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 15,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#000",
    paddingVertical: 0,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
  resetBtn: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
    opacity: 0.6,
  },
  resetText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#fff",
  },
});