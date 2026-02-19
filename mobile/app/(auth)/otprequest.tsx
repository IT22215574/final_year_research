// app/(auth)/otprequest.tsx
import React, { useState, useEffect, useRef } from "react";
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
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Image
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { images } from "@/constants";

const API = process.env.EXPO_PUBLIC_API_KEY;

const OTPRequest = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { emailOrPhone, isEmail, userId } = params;
  
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(60); // Start with 60 seconds since OTP was already sent
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Start countdown timer if timeLeft > 0
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // REMOVED: Auto-send OTP when screen loads (was causing double OTP)

  const sendOtp = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/auth/send-password-reset-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailOrPhone: emailOrPhone,
          isEmail: isEmail,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to send OTP");
      }

      Alert.alert("Success", result.message);
      setTimeLeft(60); // 60 seconds countdown
      setCanResend(false);
      setOtp(["", "", "", ""]); // Clear OTP inputs
    } catch (error: any) {
      console.error("Send OTP error:", error);
      setError(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setResendLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/auth/send-password-reset-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailOrPhone: emailOrPhone,
          isEmail: isEmail
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to resend OTP");
      }

      Alert.alert("Success", "OTP resent successfully");
      setTimeLeft(60);
      setCanResend(false);
      setOtp(["", "", "", ""]);
      // Focus first input
      inputRefs.current[0]?.focus();

    } catch (error: any) {
      console.error("Resend OTP error:", error);
      setError(error.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if OTP is complete
    if (newOtp.every(digit => digit !== "") && index === 3) {
      verifyOtp(newOtp.join(""));
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async (enteredOtp: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/auth/verify-password-reset-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailOrPhone: emailOrPhone,
          isEmail: isEmail,
          otp: enteredOtp
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to verify OTP");
      }

      // OTP verified successfully
      Alert.alert("Success", "OTP verified successfully!");
      
      // Navigate to reset password screen with the reset token
      router.push({
        pathname: "/(auth)/resetpassword",
        params: { 
          emailOrPhone: emailOrPhone,
          isEmail: isEmail,
          resetToken: result.resetToken,
          userId: result.userId
        }
      });

    } catch (error: any) {
      console.error("Verify OTP error:", error);
      setError(error.message || "Invalid OTP. Please try again.");
      // Clear OTP on error
      setOtp(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const maskedEmailOrPhone = isEmail === "true" 
    ? emailOrPhone 
    : (emailOrPhone as string).replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');

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
          source={images.Forgot2} 
          style={styles.illustration} 
          resizeMode="contain" 
        />

        {/* Title */}
        <Text style={styles.title}>Enter Verification Code</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          We{"'"}ve sent a 4-digit verification code to{"\n"}
          <Text style={styles.emailPhoneText}>{maskedEmailOrPhone}</Text>
        </Text>

        {/* OTP Inputs */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled,
                error && styles.otpInputError
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!loading}
            />
          ))}
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {/* Timer Display - Centered */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            <Text style={styles.timerCount}>{formatTime(timeLeft)}</Text>
          </Text>
        </View>

        {/* Resend OTP - Inline with the text */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>
            Didn{"'"}t receive the code?{" "}
          </Text>
          <TouchableOpacity 
            onPress={handleResendOtp} 
            disabled={!canResend || resendLoading}
          >
            {resendLoading ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Text style={[
                styles.resendButtonText,
                (!canResend || resendLoading) && styles.resendButtonDisabled
              ]}>
                Resend Code
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Verify Button */}
        <TouchableOpacity 
          style={[
            styles.verifyBtn, 
            (loading || otp.some(digit => digit === "")) && styles.disabledButton
          ]} 
          activeOpacity={0.8}
          disabled={loading || otp.some(digit => digit === "")}
          onPress={() => verifyOtp(otp.join(""))}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyText}>Verify Code</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default OTPRequest;

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
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 24,
    fontFamily: "Poppins-SemiBold",
    color: "#000",
    backgroundColor: "#fff",
  },
  otpInputFilled: {
    borderColor: "#3b82f6",
    backgroundColor: "#f0f7ff",
  },
  otpInputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Poppins-Regular",
  },
  timerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  timerText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6b7280",
    marginLeft: 8,
  },
  timerCount: {
    fontFamily: "Poppins-SemiBold",
    color: "#666",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    flexWrap: "wrap",
  },
  resendText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#666",
    textAlign: "center",
  },
  resendButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#3b82f6",
    textAlign: "center",
  },
  resendButtonDisabled: {
    color: "#9ca3af",
  },
  verifyBtn: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -10,
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