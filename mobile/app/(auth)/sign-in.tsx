import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Animated,
  ImageSourcePropType,
  Alert
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import Ionicons from "@expo/vector-icons/Ionicons";
import CheckBox from "expo-checkbox";
import { useRouter, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { icons } from "@/constants";
import useAuthStore from "@/stores/authStore";
import * as SecureStore from "expo-secure-store"; // Import SecureStore

import { apiFetch } from "@/utils/api";
import { getAuthApiBaseUrls } from "@/src/config/api";

type FormValues = {
  email: string;
  password: string;
};

const SignIn = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    clearErrors,
  } = useForm<FormValues>({
    defaultValues: { email: "", password: "" },
  });
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [apiErrors, setApiErrors] = useState<Record<keyof FormValues, string>>({
    email: "",
    password: "",
  });
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const { signIn } = useAuthStore();

  // Animation values for icons - FIXED: Create refs for animated values
  const animatedValues = useRef(Array(15).fill(0).map(() => new Animated.Value(0))).current;
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);

  // Log role if present (optional)
  useEffect(() => {
    if (params.role) {
      console.log("User role:", params.role);
    }
  }, [params.role]);

  // Animation functions
  const startAnimations = useCallback(() => {
    // Clear any existing animations
    animationRefs.current.forEach(animation => animation.stop());
    animationRefs.current = [];

    // Reset all animated values to start position
    animatedValues.forEach(value => value.setValue(0));

    // Start floating animations for all icons
    const iconAnimations = animatedValues.map((animValue, index) => {
      const delay = index * 150 + Math.random() * 400;
      
      // Create a continuous floating animation
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            // Float up and down
            Animated.timing(animValue, {
              toValue: 1,
              duration: 3000 + Math.random() * 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
        ])
      );
      
      animationRefs.current.push(animation);
      return animation;
    });

    // Start all animations
    iconAnimations.forEach(animation => animation.start());
  }, [animatedValues]);

  const stopAnimations = useCallback(() => {
    animationRefs.current.forEach(animation => animation.stop());
    animationRefs.current = [];
  }, []);

  // Start animations when component mounts
  useEffect(() => {
    startAnimations();

    return () => {
      stopAnimations();
    };
  }, [startAnimations, stopAnimations]);

  // Clear API errors when user starts typing
  const clearApiErrors = (field: keyof FormValues) => {
    setApiErrors(prev => ({
      ...prev,
      [field]: ""
    }));
    clearErrors(field);
  };

  // Handle forgot password navigation
  const handleForgotPassword = () => {
    router.push("/(auth)/forgetpassword");
  };

  const selectedIcons: ImageSourcePropType[] = [
    icons.Icon1, icons.Icon2, icons.Icon3, icons.Icon4, icons.Icon5, icons.Icon6,
    icons.Icon1, icons.Icon3, icons.Icon2, icons.Icon4, icons.Icon3, icons.Icon5,
    icons.Icon1, icons.Icon6, icons.Icon2,
  ];

  const getPredefinedPositions = () => {
    const positions = [
      { top: 25, left: 10 }, { top: 25, left: 50 }, { top: 25, left: 90 },
      { top: 60, left: 20 }, { top: 60, left: 80 },
      { top: 95, left: 5 }, { top: 95, left: 35 }, { top: 95, left: 65 }, { top: 95, left: 95 },
      { top: 130, left: 15 }, { top: 130, left: 50 }, { top: 130, left: 85 },
      { top: 165, left: 25 }, { top: 165, left: 75 },
      { top: 200, left: 5 }, { top: 200, left: 40 }, { top: 200, left: 60 }, { top: 200, left: 95 },
    ];
    return positions;
  };

  const renderDistributedIcons = () => {
    const predefinedPositions = getPredefinedPositions();
    
    return selectedIcons.map((icon, index) => {
      let position;
      
      if (index < predefinedPositions.length) {
        position = predefinedPositions[index];
      } else {
        position = {
          top: 30 + Math.random() * 140,
          left: 15 + Math.random() * 70
        };
      }
      
      const randomOpacity = 0.8 + Math.random() * 0.2;
      const randomSize = 20 + Math.random() * 12;
      const randomRotation = Math.random() * 20 - 10;

      const translateY = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [0, -15],
      });

      const scale = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1],
      });

      const rotate = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [`${randomRotation}deg`, `${randomRotation + 8}deg`],
      });

      const opacity = animatedValues[index].interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [randomOpacity, randomOpacity * 1.4, randomOpacity],
      });

      return (
        <Animated.Image
          key={index}
          source={icon}
          style={{
            position: "absolute",
            top: position.top,
            left: `${position.left}%`,
            width: randomSize,
            height: randomSize,
            opacity: opacity,
            tintColor: "#FFFFFF",
            zIndex: 2,
            transform: [
              { translateY: translateY },
              { scale: scale },
              { rotate: rotate },
            ],
            shadowColor: "#FFFFFF",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
          }}
          resizeMode="contain"
        />
      );
    });
  };

  // FIXED: Updated onSubmit function with proper token handling
  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setApiErrors({ email: "", password: "" });
    
    try {
      console.log("📧 Form data:", data);
      console.log("🌐 API Base URL candidates:", getAuthApiBaseUrls());
      
      // Use direct fetch for sign-in since we don't have token yet
      const response = await apiFetch(`/api/v1/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-type": "mobile",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      console.log("📡 Response Status:", response.status);
      
      const result = await response.json();
      console.log("📱 FULL API Response:", result);

      if (!response.ok) {
        throw new Error(result.message || "Sign in failed");
      }

      // ✅ STORE TOKENS IN SECURE STORE
      if (result.data?.accessToken) {
        await SecureStore.setItemAsync("access_token", result.data.accessToken);
        console.log("✅ Access token stored");
      }
      
      if (result.data?.refreshToken) {
        await SecureStore.setItemAsync("refresh_token", result.data.refreshToken);
        console.log("✅ Refresh token stored");
      }

      // ✅ Transform API response to match authStore User interface
      const userData = {
        id: result.data?._id || result._id,
        _id: result.data?._id || result._id,
        email: result.data?.email || result.email,
        firstName: result.data?.firstName || result.firstName,
        lastName: result.data?.lastName || result.lastName,
        username: result.data?.username || result.username,
        phone: result.data?.phone || result.phone,
        role: result.data?.role || "Fisher man", // Use actual role from API
        isAdmin: result.data?.isAdmin || result.isAdmin || false,
        profilePicture: result.data?.profilePicture || result.profilePicture,
        // Add fishery-specific fields if they exist
        specialization: result.data?.specialization,
        licenseNumber: result.data?.licenseNumber,
        zone: result.data?.zone,
        district: result.data?.district?.name,
      };

      console.log("✅ Transformed user data for authStore:", userData);
      
      // Now call signIn with the transformed data
      await signIn(userData);
      
      Alert.alert("Success", "Signed in successfully!");
      
      // Navigate to home with refresh parameter
      router.replace({
        pathname: "/(root)/(tabs)/home",
        params: { refresh: Date.now() }
      });

    } catch (error: any) {
      console.error("❌ Sign in error:", error);
      
      if (error.message.includes("User not found") || error.message.includes("Invalid credentials")) {
        setApiErrors({
          email: "Invalid email or password",
          password: "Invalid email or password",
        });
      } else if (/network request failed|failed to fetch|network/i.test(String(error?.message || ""))) {
        Alert.alert(
          "Network Error",
          `Cannot reach the backend. Tried: ${getAuthApiBaseUrls().join(", ")}`
        );
      } else {
        Alert.alert("Error", error.message || "Sign in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine input border color
  const getInputBorderColor = (fieldName: keyof FormValues) => {
    if (errors[fieldName] || apiErrors[fieldName]) {
      return "#ef4444";
    }
    return "#d1d5db";
  };

  return (
    <View style={styles.container}>
      {/* Top Gradient with Icons and Waves */}
      <LinearGradient
        colors={["#0B3D91", "#1E90FF", "#00BFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topSection}
      >
        {/* Icons Layer with Animation */}
        <View style={styles.iconsLayer}>{renderDistributedIcons()}</View>

        {/* Title - Fish Industry Themed */}
        <View style={styles.titleContainer}>
          <Ionicons name="fish" size={32} color="#FFF" style={styles.fishIcon} />
          <Text style={styles.header}>
            <Text style={styles.highlight}>S</Text>MART{" "}
            <Text style={styles.highlight}>F</Text>ISHER{" "}
          </Text>
        </View>
        <Text style={styles.subtitle}>LANKA</Text>

        {/* Light Blue Wave - BELOW the white wave */}
        <View style={styles.lightBlueWaveContainer}>
          <Svg
            height="92"
            width="90%"
            viewBox="0 0 1440 320"
            style={styles.lightBlueWaveSvg}
          >
            <Path
              fill="#4B9BFF"
              d="M0,180L48,170C96,160,192,140,288,130C384,120,480,120,576,135C672,150,768,180,864,190C960,200,1056,190,1152,175C1248,160,1344,130,1392,115L1440,100L1440,320L0,320Z"
            />
          </Svg>
        </View>

        {/* White Wave - ABOVE the blue wave */}
        <Svg
          height="92"
          width="100%"
          viewBox="0 0 1440 320"
          style={styles.whiteWaveWrapper}
        >
          <Path
            fill="#ffffff"
            d="M0,224L48,202.7C96,181,192,139,288,128C384,117,480,139,576,165.3C672,192,768,224,864,234.7C960,245,1056,235,1152,213.3C1248,192,1344,160,1392,144L1440,128L1440,320L0,320Z"
          />
        </Svg>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Heading */}
        <View style={styles.headingContainer}>
          <Text style={styles.welcomeText}>Welcome Back Fisher</Text>
          <Text style={styles.subtitleText}>
            Sign in to access your fishery dashboard
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Email */}
          <Controller
            control={control}
            name="email"
            rules={{
              required: "Email is required",
              pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email" },
            }}
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Email <Text style={styles.required}>*</Text>
                </Text>
                <View style={[
                  styles.inputWrapper,
                  { borderColor: getInputBorderColor("email") }
                ]}>
                  <Ionicons 
                    name="mail-outline" 
                    size={18} 
                    color={errors.email || apiErrors.email ? "#ef4444" : "#0B3D91"} 
                  />
                  <TextInput
                    placeholder="fisher@example.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      clearApiErrors("email");
                    }}
                    style={styles.textInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {(errors.email || apiErrors.email) && (
                  <Text style={styles.errorText}>
                    {errors.email?.message as string || apiErrors.email}
                  </Text>
                )}
              </View>
            )}
          />

          {/* Password */}
          <Controller
            control={control}
            name="password"
            rules={{ required: "Password is required" }}
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Password <Text style={styles.required}>*</Text>
                </Text>
                <View style={[
                  styles.inputWrapper,
                  { borderColor: getInputBorderColor("password") }
                ]}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={18} 
                    color={errors.password || apiErrors.password ? "#ef4444" : "#0B3D91"} 
                  />
                  <TextInput
                    placeholder="Enter your password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={secureText}
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      clearApiErrors("password");
                    }}
                    style={styles.textInput}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                    <Ionicons
                      name={secureText ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={errors.password || apiErrors.password ? "#ef4444" : "#0B3D91"}
                    />
                  </TouchableOpacity>
                </View>
                {(errors.password || apiErrors.password) && (
                  <Text style={styles.errorText}>
                    {errors.password?.message as string || apiErrors.password}
                  </Text>
                )}
              </View>
            )}
          />

          {/* Remember Me + Forgot */}
          <View style={styles.optionsContainer}>
            <View style={styles.rememberMeContainer}>
              <CheckBox
                value={rememberMe}
                onValueChange={setRememberMe}
                color={rememberMe ? "#0B3D91" : undefined}
              />
              <Text style={styles.rememberMeText}>Remember Me</Text>
            </View>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            style={[styles.signInButton, loading && styles.disabledButton]}
            disabled={loading}
          >
            <LinearGradient
              colors={["#0B3D91", "#1E90FF"]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="boat" size={20} color="#FFF" />
                <Text style={styles.signInText}>Sign In</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Sign Up */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>New to Smart Fisher Lanka? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
              <Text style={styles.signUpLink}>Register Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topSection: {
    position: "relative",
    width: "100%",
    height: 230,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  iconsLayer: {
    position: "absolute",
    width: "100%",
    height: "95%",
    zIndex: 7,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    zIndex: 5,
  },
  fishIcon: {
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    fontFamily: "Poppins-Bold",
  },
  highlight: {
    color: "#4B9BFF",
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#E2E8F0",
    zIndex: 5,
    fontFamily: "Poppins-Bold",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  whiteWaveWrapper: {
    position: "absolute",
    bottom: -5,
    left: 0,
    zIndex: 3,
  },
  lightBlueWaveContainer: {
    position: "absolute",
    bottom: -0.1,
    left: "5%",
    right: "-20%",
    alignItems: "center",
    zIndex: 2,
  },
  lightBlueWaveSvg: {},
  scrollContainer: {
    flexGrow: 1,
  },
  headingContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0B3D91",
    fontFamily: "Poppins-Bold",
  },
  subtitleText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 4,
    fontFamily: "Poppins-Regular",
  },
  formContainer: {
    paddingHorizontal: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: "#1E293B",
    marginBottom: 8,
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
  },
  required: {
    color: "#ef4444",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 4,
    color: "#1E293B",
    fontFamily: "Poppins-Regular",
    fontSize: 14,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Poppins-Regular",
  },
  optionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    marginTop: 8,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberMeText: {
    marginLeft: 8,
    color: "#475569",
    fontFamily: "Poppins-Regular",
    fontSize: 14,
  },
  forgotPassword: {
    color: "#0B3D91",
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
  },
  signInButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#0B3D91",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signInText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  signUpText: {
    color: "#64748B",
    fontFamily: "Poppins-Regular",
    fontSize: 14,
  },
  signUpLink: {
    color: "#0B3D91",
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
  },
});

export default SignIn;