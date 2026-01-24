// app/(auth)/forgetpassword.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { images } from "@/constants";

const API = process.env.EXPO_PUBLIC_API_KEY;

const ForgetPassword = () => {
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isValidInput, setIsValidInput] = useState(true);

  // Check if input is empty to disable button
  const isInputEmpty = emailOrPhone.trim() === "";

  // Validate input format
  const validateInput = (input: string) => {
    const trimmedInput = input.trim();
    
    // Check if it's an email
    if (trimmedInput.includes('@')) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      return emailRegex.test(trimmedInput);
    } 
    // Check if it's a phone number (Sri Lankan format)
    else {
      const phoneRegex = /^(07[0-9]|94[0-9]|\+94[0-9])[0-9]{7,9}$/;
      const cleanPhone = trimmedInput.replace(/\D/g, '');
      return phoneRegex.test(cleanPhone);
    }
  };

  const handleVerify = async () => {
    // Prevent multiple submissions
    if (loading) return;
    
    // Clear previous errors
    setError("");
    
    // Validate input format
    if (!validateInput(emailOrPhone)) {
      setError("Please enter a valid email or phone number");
      setIsValidInput(false);
      return;
    }

    setIsValidInput(true);
    setLoading(true);


    try {
      // First check if account exists (THIS DOESN'T SEND OTP)
      const checkResponse = await fetch(`${API}/api/auth/check-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailOrPhone: emailOrPhone.trim(),
        }),
      });

      const checkResult = await checkResponse.json();

      if (!checkResponse.ok) {
        throw new Error(checkResult.message || "Failed to verify account");
      }

      if (checkResult.success && checkResult.exists) {
        // Account exists, now send OTP (THIS SENDS OTP)
        const otpResponse = await fetch(
          `${API}/api/auth/send-password-reset-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              emailOrPhone: emailOrPhone.trim(),
              isEmail: checkResult.isEmail,
            }),
          }
        );

        const otpResult = await otpResponse.json();

        if (!otpResponse.ok) {
          throw new Error(otpResult.message || "Failed to send OTP");
        }

        // Navigate to OTP screen with all necessary data
        router.push({
          pathname: "/(auth)/otprequest",
          params: {
            emailOrPhone: emailOrPhone.trim(),
            isEmail: checkResult.isEmail.toString(),
            userId: checkResult.userId,
          },
        });
      } else {
        // Account doesn't exist
        setError(checkResult.message || "No account found");
        setIsValidInput(false);
      }
    } catch (error: any) {
      console.error("❌ Verify error:", error);
      setError(error.message || "Failed to verify account. Please try again.");
      setIsValidInput(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (text: string) => {
    setEmailOrPhone(text);
    // Clear error when user starts typing
    if (error) {
      setError("");
      setIsValidInput(true);
    }
  };

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
        <Image source={images.Forgot1} style={styles.illustration} resizeMode="contain" />

        {/* Title */}
        <Text style={styles.title}>Forgot Password?</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Please Enter The Email Address or Phone Number Linked With Your Account
        </Text>

        {/* Input field */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Email / Phone Number <Text style={styles.required}>*</Text>
          </Text>
          <View style={[
            styles.inputWrapper,
            !isValidInput && styles.errorInput
          ]}>
            <Ionicons 
              name="mail-outline" 
              size={20} 
              color={!isValidInput ? "#ef4444" : "#9BA3AB"} 
              style={styles.icon} 
            />
            <TextInput
              placeholder="Enter Your Email / Phone Number"
              placeholderTextColor="#9BA3AF"
              style={styles.input}
              value={emailOrPhone}
              onChangeText={handleInputChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>

        {/* Button - Disabled until input is provided */}
        <TouchableOpacity 
          style={[
            styles.verifyBtn, 
            (isInputEmpty || loading) && styles.disabledButton
          ]} 
          activeOpacity={0.8}
          disabled={isInputEmpty || loading}
          onPress={handleVerify}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyText}>Verify</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgetPassword;

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
  },
  backBtn: {
    position: "absolute",
    top: 10,
    left: 20,
    zIndex: 10,
  },
  illustration: {
    width: "100%",
    height: 220,
    alignSelf: "center",
    marginTop: 1,
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
  inputContainer: {
    marginBottom: 25,
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
  errorInput: {
    borderColor: "#ef4444",
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
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Poppins-Regular",
  },
  verifyBtn: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
    opacity: 0.6,
  },
  verifyText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#fff",
  },
});