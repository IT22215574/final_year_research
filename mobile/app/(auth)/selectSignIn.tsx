import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { icons } from "@/constants"; // Adjust path if needed
import { useRouter } from "expo-router";

const SelectSignIn = () => {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);
  const [studentExpanded, setStudentExpanded] = React.useState(false);

  // Animation values for icons
  const animatedValues = useRef(
    Array(15)
      .fill(0)
      .map(() => new Animated.Value(0))
  ).current;

  const handleSelect = (role: string) => {
    setSelectedRole(role);
    if (role === "Student") {
      setStudentExpanded(!studentExpanded);
    } else {
      setStudentExpanded(false);
    }
  };

  // Check if a valid role is selected (Teacher, Internal, or External)
  const isRoleSelected = selectedRole && selectedRole !== "Student";

  // Start icon animations
  useEffect(() => {
    const startIconAnimations = () => {
      animatedValues.forEach((animValue, index) => {
        const delay = index * 150 + Math.random() * 400;

        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.sequence([
                Animated.timing(animValue, {
                  toValue: 1,
                  duration: 2500 + Math.random() * 1500,
                  useNativeDriver: true,
                }),
                Animated.timing(animValue, {
                  toValue: 0,
                  duration: 2500 + Math.random() * 1500,
                  useNativeDriver: true,
                }),
              ]),
            ]),
          ])
        ).start();
      });
    };

    startIconAnimations();

    return () => {
      animatedValues.forEach((animValue) => animValue.stopAnimation());
    };
  }, []);

  // Pick only the icons you want (same as onBoard3)
  const selectedIcons = [
    icons.Icon1,
    icons.Icon2,
    icons.Icon3,
    icons.Icon4,
    icons.Icon5,
    icons.Icon6,
    icons.Icon1,
    icons.Icon3,
    icons.Icon2,
    icons.Icon4,
    icons.Icon3,
    icons.Icon5,
    icons.Icon1,
    icons.Icon6,
    icons.Icon2,
  ];

  const getPredefinedPositions = () => {
    const positions = [
      // Top row
      { top: 25, left: 10 },
      { top: 25, left: 50 },
      { top: 25, left: 90 },
      // Upper middle row
      { top: 60, left: 20 },
      { top: 60, left: 80 },
      // Middle row
      { top: 95, left: 5 },
      { top: 95, left: 35 },
      { top: 95, left: 65 },
      { top: 95, left: 95 },
      // Lower middle row
      { top: 130, left: 15 },
      { top: 130, left: 50 },
      { top: 130, left: 85 },
      // Bottom row
      { top: 165, left: 25 },
      { top: 165, left: 75 },
      // Very bottom row
      { top: 200, left: 5 },
      { top: 200, left: 40 },
      { top: 200, left: 60 },
      { top: 200, left: 95 },
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
          left: 15 + Math.random() * 70,
        };
      }

      const randomOpacity = 0.8 + Math.random() * 0.2;
      // CHANGED: Made icon sizes smaller to match previous screens - reduced from 32-48 to 20-32
      const randomSize = 20 + Math.random() * 12; // Now ranges from 20 to 32
      const randomRotation = Math.random() * 20 - 10;

      // Animation transforms
      const translateY = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [0, -8],
      });

      const scale = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.05],
      });

      const rotate = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [`${randomRotation}deg`, `${randomRotation + 5}deg`],
      });

      const opacity = animatedValues[index].interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [randomOpacity, randomOpacity * 1.3, randomOpacity],
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
            elevation: 4,
          }}
          resizeMode="contain"
        />
      );
    });
  };

  // Dropdown Arrow Component
  const DropdownArrow = ({ expanded }: { expanded: boolean }) => (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <Path
        d={expanded ? "M7 15l5-5 5 5" : "M7 10l5 5 5-5"}
        stroke="#333"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );

  const handleContinue = () => {
    if (!isRoleSelected) return;

    // Navigate to sign-in screen with the selected role as a parameter
    router.push({
      pathname: "/sign-in",
      params: { role: selectedRole },
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Gradient with Icons and Waves - EXACTLY like onBoard3 */}
      <LinearGradient
        colors={["#4B3AFF", "#5C6CFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topSection}
      >
        {/* Icons Layer */}
        <View style={styles.iconsLayer}>{renderDistributedIcons()}</View>

        {/* Title - Only Smart fisher lanaka in top section */}
        <Text style={styles.header}>
          <Text className="text-blue-400">S</Text>
          <Text>MART </Text>
          <Text className="text-blue-400">F</Text>
          <Text>ISHER </Text>
        </Text>
        <Text className="text-3xl font-PoppinsBold text-blue-300 mt-0">
          LANKA{" "}
        </Text>
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

      {/* Role Selection */}
      <ScrollView contentContainerStyle={styles.rolesContainer}>
        {/* Centered Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.loginAsText}>Login As</Text>
          <Text style={styles.subHeader}>Choose your role to continue</Text>
        </View>

        {/* Fisher man */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === "Fisher man" && styles.selectedCard,
          ]}
          onPress={() => handleSelect("Fisher man")}
        >
          <View style={styles.roleContent}>
            <View style={styles.roleLeft}>
              <Image source={icons.FisherIcon} style={styles.icon} />
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>Fisher Man</Text>
                <Text style={styles.roleDesc}>
                  Manage your fishing activities
                </Text>
              </View>
            </View>
            <View style={styles.roleRight}>
              <View
                style={[
                  styles.radioButton,
                  selectedRole === "Fisher man" && styles.radioButtonSelected,
                ]}
              >
                {selectedRole === "Fisher man" && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Student */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === "customer" && styles.selectedCard,
          ]}
          onPress={() => setSelectedRole("customer")}
        >
          <View style={styles.roleContent}>
            <View style={styles.roleLeft}>
              <Image source={icons.BuyerIcon} style={styles.icon} />
              <View style={styles.roleTextContainer}>
                <Text style={styles.roleTitle}>Customer</Text>
                <Text style={styles.roleDesc}>Explore as a customer</Text>
              </View>
            </View>

            <View style={styles.roleRight}>
              <View
                style={[
                  styles.radioButton,
                  selectedRole === "customer" && styles.radioButtonSelected,
                ]}
              >
                {selectedRole === "customer" && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          !isRoleSelected && styles.continueButtonDisabled,
        ]}
        disabled={!isRoleSelected}
        onPress={handleContinue}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SelectSignIn;

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
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    zIndex: 5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    fontFamily: "Poppins-Bold",
  },
  rolesContainer: {
    flexGrow: 1,
  },
  titleSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  loginAsText: {
    fontSize: 24,
    color: "#3C3C3D",
    fontFamily: "Poppins-Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subHeader: {
    fontSize: 16,
    color: "#666",
    fontFamily: "Poppins-Regular",
    textAlign: "center",
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
  roleCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: "#2575fc",
    backgroundColor: "#f0f4ff",
  },
  roleContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  roleRight: {
    alignItems: "center",
  },
  roleTextContainer: {
    marginLeft: 12,
  },
  roleTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    color: "#333",
    marginBottom: 2,
  },
  roleDesc: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: "#777",
  },
  icon: {
    width: 50,
    height: 50,
    resizeMode: "contain",
  },
  dropdownArrow: {
    padding: 5,
  },
  dropdownContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  dropdownItem: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#f0f4ff",
    marginTop: 8,
    marginLeft: 20, // Indent to show it's a subset
    height: 80, // Increased height
  },
  dropdownItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  dropdownTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  dropdownTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  dropdownDesc: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#666",
  },
  // Radio Button Styles (only for Teacher)
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#2575fc",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    borderColor: "#2575fc",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2575fc",
  },
  continueButton: {
    backgroundColor: "#2575fc",
    paddingVertical: 15,
    margin: 20,
    borderRadius: 15,
    alignItems: "center",
  },
  continueButtonDisabled: {
    backgroundColor: "#9E9E9E",
    opacity: 0.5,
  },
  continueText: {
    fontFamily: "Poppins-Bold",
    fontSize: 18,
    color: "#fff",
  },
});
