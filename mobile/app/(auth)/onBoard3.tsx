// app/onBoard3.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  TouchableOpacity,
  ImageSourcePropType,
  PanResponder,
  Dimensions,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { icons, images } from "@/constants";
import MaskedView from "@react-native-masked-view/masked-view";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

const { width: screenWidth } = Dimensions.get("window");

interface Position {
  top: number;
  left: number;
}

const OnBoard3: React.FC = () => {
  const router = useRouter();

  // Animation values for decorative elements
  const triangleAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const vectorAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const eclipseAnim = useRef<Animated.Value>(new Animated.Value(0)).current;

  // Separate swipe animation values for different directions
  const swipeLeftAnim = useRef(new Animated.Value(0)).current; // For next screen (disabled)
  const swipeRightAnim = useRef(new Animated.Value(0)).current; // For back screen
  const contentAnim = useRef(new Animated.Value(0)).current;

  // Track if animations are running
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);
  const isNavigating = useRef(false); // Prevent multiple navigations

  // Pick only the icons you want
  const selectedIcons: ImageSourcePropType[] = [
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

  // Create animated values for each icon
  const animatedValues = selectedIcons.map(() => new Animated.Value(0));

  const startAnimations = () => {
    // Reset animation values to visible state
    triangleAnim.setValue(0);
    vectorAnim.setValue(0);
    eclipseAnim.setValue(0);
    swipeLeftAnim.setValue(0);
    swipeRightAnim.setValue(0);
    contentAnim.setValue(0);

    // Clear any existing animations
    animationRefs.current.forEach((animation) => animation.stop());
    animationRefs.current = [];

    // Start floating animations for all icons
    const iconAnimations = animatedValues.map((animValue, index) => {
      const delay = index * 150 + Math.random() * 400;

      const animation = Animated.loop(
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
      );

      animationRefs.current.push(animation);
      return animation;
    });

    // Start decorative elements animation
    const decorativeAnim = Animated.parallel([
      Animated.spring(triangleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(vectorAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.spring(eclipseAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 200,
        useNativeDriver: true,
      }),
    ]);

    animationRefs.current.push(decorativeAnim);

    iconAnimations.forEach((animation) => animation.start());
    decorativeAnim.start();
  };

  const stopAnimations = () => {
    animationRefs.current.forEach((animation) => animation.stop());
    animationRefs.current = [];
  };

  useEffect(() => {
    startAnimations();

    return () => {
      stopAnimations();
    };
  }, []);

  // Restart animations when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Reset navigation flag and animation values
      isNavigating.current = false;
      swipeLeftAnim.setValue(0);
      swipeRightAnim.setValue(0);
      contentAnim.setValue(0);
      startAnimations();

      return () => {
        stopAnimations();
      };
    }, [])
  );

  // PanResponder for swipe detection
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (isNavigating.current) return;

        // Only allow swipe right (back) - disable swipe left
        const progress = Math.max(
          0,
          Math.min(1, Math.abs(gestureState.dx) / 200)
        );

        if (gestureState.dx > 0) {
          // Swiping right - back animation
          swipeRightAnim.setValue(progress);
          contentAnim.setValue(progress);
          swipeLeftAnim.setValue(0); // Reset left swipe
        }
        // Ignore swipe left (no next screen)
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isNavigating.current) return;

        if (Math.abs(gestureState.dx) > 100 && gestureState.dx > 0) {
          // Swipe right confirmed - go to previous screen
          handleSwipeBack();
        } else {
          // Reset animations
          Animated.parallel([
            Animated.spring(swipeLeftAnim, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(swipeRightAnim, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(contentAnim, {
              toValue: 0,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Rotation animations only for triangle on swipe right (back)
  const triangleRotation = swipeRightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  // Vector and Eclipse - NO rotation, only movement toward screen

  // Animation transforms for decorative elements
  // Triangle - rotates on swipe right (back)
  const triangleTransform = {
    transform: [
      {
        translateX: triangleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-200, 0],
        }),
      },
      {
        translateY: triangleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-100, 0],
        }),
      },
      {
        rotate: triangleRotation, // Only rotates on swipe right
      },
    ],
    opacity: triangleAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 0.7],
    }),
  };

  // Vector - moves toward screen on swipe right (back) - NO rotation
  const vectorTransform = {
    transform: [
      {
        translateX: vectorAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [200, 0],
        }),
      },
      {
        translateY: vectorAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-100, 0],
        }),
      },
      // Movement toward screen only on swipe right (back) - NO rotation
      {
        translateX: swipeRightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -50], // Move left toward center during swipe right
        }),
      },
      {
        translateY: swipeRightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 40], // Move down toward center during swipe right
        }),
      },
    ],
    opacity: vectorAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 0.7],
    }),
  };

  // Eclipse - moves toward screen on swipe right (back) - NO rotation
  const eclipseTransform = {
    transform: [
      {
        translateX: eclipseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-150, 0],
        }),
      },
      {
        translateY: eclipseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [150, 0],
        }),
      },
      // Movement toward screen only on swipe right (back) - NO rotation
      {
        translateX: swipeRightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 60], // Move right toward center during swipe right
        }),
      },
      {
        translateY: swipeRightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -50], // Move up toward center during swipe right
        }),
      },
    ],
    opacity: eclipseAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 0.7],
    }),
  };

  // Fixed Content animation - always start visible
  const contentTransform = {
    transform: [
      {
        translateX: contentAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, screenWidth], // Move right for back navigation
        }),
      },
    ],
    opacity: contentAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
  };

  const handleGetStarted = () => {
    if (isNavigating.current) {
      return;
    }

    isNavigating.current = true;
    stopAnimations();

    // Navigate to Signup screen
    router.push("/sign-in");

    setTimeout(() => {
      isNavigating.current = false;
    }, 1000);
  };

  const handleSwipeBack = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    // Complete the swipe back animation (right - back)
    Animated.parallel([
      Animated.timing(swipeRightAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset animation values immediately after animation completes
      swipeLeftAnim.setValue(0);
      swipeRightAnim.setValue(0);
      contentAnim.setValue(0);
      // Navigate to previous screen (OnBoard2) after animation completes
      router.push("/onBoard2");
    });
  };

  const handleBackPress = () => {
    if (isNavigating.current) {
      return;
    }

    isNavigating.current = true;
    stopAnimations();

    // Navigate back to OnBoard2
    router.push("/onBoard2");

    setTimeout(() => {
      isNavigating.current = false;
    }, 1000);
  };

  const handleNextPress = (): void => {
    handleGetStarted();
  };

  const getPredefinedPositions = (): Position[] => {
    const positions: Position[] = [
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

  const renderDistributedIcons = (): JSX.Element[] => {
    const predefinedPositions = getPredefinedPositions();

    return selectedIcons.map((icon: ImageSourcePropType, index: number) => {
      let position: Position;

      if (index < predefinedPositions.length) {
        position = predefinedPositions[index];
      } else {
        position = {
          top: 30 + Math.random() * 140,
          left: 15 + Math.random() * 70,
        };
      }

      const randomOpacity: number = 0.8 + Math.random() * 0.2;
      // CHANGED: Made icon sizes smaller to match OnBoard1 and OnBoard2 - reduced from 32-48 to 20-32
      const randomSize: number = 20 + Math.random() * 12; // Now ranges from 20 to 32
      const randomRotation: number = Math.random() * 20 - 10;

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
          }}
          resizeMode="contain"
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* Main content with PanResponder */}
      <View style={styles.mainContent} {...panResponder.panHandlers}>
        {/* Gradient Top Section */}
        <LinearGradient
          colors={["#4B3AFF", "#5C6CFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topSection}
        >
          {/* Icons Layer */}
          <View style={styles.iconsLayer}>{renderDistributedIcons()}</View>

          {/* Title */}
          <Text style={styles.header}>
            <Text className="text-blue-400">S</Text><Text>MART{" "}</Text>
            <Text className="text-blue-400">F</Text><Text>ISHER{" "}</Text>
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

        {/* Bottom Content Section with Image */}
        <View style={styles.bottomSection}>
          {/* Animated Triangle - rotates on swipe right */}
          <Animated.View style={[styles.triangleContainer, triangleTransform]}>
            <Image
              source={images.Traingle2}
              style={styles.triangle}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Animated Vector - moves toward screen on swipe right (NO rotation) */}
          <Animated.View style={[styles.vectorContainer, vectorTransform]}>
            <Image
              source={images.Eclips2} // Using Eclips2 image as per your setup
              style={styles.vector}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Animated Eclipse - moves toward screen on swipe right (NO rotation) */}
          <Animated.View style={[styles.eclipseContainer, eclipseTransform]}>
            <Image
              source={images.Vector2} // Using Vector2 image as per your setup
              style={styles.eclipse}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Light blue-gray colored filled circle around the onboard image */}
          <View style={styles.circleContainer}>
            <Svg width={240} height={240} style={styles.ashCircle}>
              <Circle cx="120" cy="120" r="100" fill="#ECEBF1" opacity="0.3" />
            </Svg>
          </View>

          {/* Animated Content */}
          <Animated.View style={[styles.contentWrapper, contentTransform]}>
            {/* Main OnBoard3 image */}
            <Image
              source={images.Onboard03}
              style={styles.bottomImage}
              resizeMode="contain"
            />

            {/* Text below the image */}
            <View style={styles.textContainer}>
              {/* Gradient Text for "Stay on Track" */}
              <MaskedView
                style={styles.maskedView}
                maskElement={
                  <View style={styles.maskElement}>
                    <Text style={styles.gradientTitleMask}>
                      Market Intelligence
                    </Text>
                  </View>
                }
              >
                <LinearGradient
                  colors={["#3B81FD", "#7930FE"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientFill}
                />
              </MaskedView>
              <Text style={styles.description}>
                Sell at the Right Time{"\n"}
                Smart market analysis tells you when and where to sell for
                maximum profit margins
              </Text>
              {/* Dots Indicator */}
              <View style={styles.dotsContainer}>
                <View style={[styles.dot, styles.inactiveDot]} />
                <View style={[styles.dot, styles.inactiveDot]} />
                <View style={[styles.dot, styles.activeDot]} />
              </View>
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Back Button OUTSIDE the PanResponder */}
      <TouchableOpacity
        style={styles.backButtonContainer}
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Get Started Button OUTSIDE the PanResponder */}
      <TouchableOpacity
        style={styles.nextButtonContainer}
        onPress={handleNextPress}
        activeOpacity={0.7}
      >
        {/* Quarter Circle Background - Flat side on right */}
        <Svg width={100} height={100} style={styles.quarterCircleSvg}>
          {/* Quarter circle - bottom-right quadrant with flat side on right */}
          <Path
            d="M0,100 A100,100 0 0,1 100,0 L100,100 Z"
            fill="#9BA3AB"
            opacity="0.3"
          />
        </Svg>

        {/* Get Started Text */}
        <Text style={styles.nextText}>Get Start</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mainContent: {
    flex: 1,
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
    marginBottom: 6,
    zIndex: 5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    fontFamily: "PoppinsBold",
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
  bottomSection: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 10,
    alignItems: "center",
    backgroundColor: "#fff",
    position: "relative",
  },
  contentWrapper: {
    alignItems: "center",
    width: "100%",
  },
  // Back Button Styles - Bottom Left Corner
  backButtonContainer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    zIndex: 20, // Increased zIndex
  },
  backText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#9BA3AB",
    fontFamily: "PoppinsBold",
  },
  // Next Button Styles - Bottom Right Corner with Quarter Circle
  nextButtonContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 100,
    height: 100,
    zIndex: 20, // Increased zIndex
    alignItems: "center",
    justifyContent: "center",
  },
  quarterCircleSvg: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  nextText: {
    position: "absolute",
    bottom: 25,
    right: 12,
    fontSize: 16,
    fontWeight: "bold",
    color: "#353434",
    fontFamily: "PoppinsBold",
  },
  triangleContainer: {
    position: "absolute",
    top: -10,
    left: 40,
    zIndex: 1,
  },
  triangle: {
    width: 60,
    height: 60,
  },
  vectorContainer: {
    position: "absolute",
    top: 3,
    right: -7,
    zIndex: 1,
  },
  vector: {
    width: 80,
    height: 120,
  },
  eclipseContainer: {
    position: "absolute",
    bottom: 150,
    left: -30,
    zIndex: 1,
  },
  eclipse: {
    width: 100,
    height: 100,
  },
  circleContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
  },
  ashCircle: {},
  bottomImage: {
    width: "100%",
    height: 230,
    marginBottom: 30,
    marginTop: 5,
    zIndex: 1,
  },
  textContainer: {
    alignItems: "center",
    marginTop: -10,
  },
  maskedView: {
    height: 40,
    marginBottom: 8,
  },
  maskElement: {
    backgroundColor: "transparent",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gradientTitleMask: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    fontFamily: "PoppinsBold",
    backgroundColor: "transparent",
  },
  gradientFill: {
    flex: 1,
    width: 200,
    height: 40,
  },
  description: {
    fontSize: 16,
    color: "#9BA3AB",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Poppins",
    marginBottom: 20,
  },
  // Dots Indicator Styles
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#4B3AFF",
  },
  inactiveDot: {
    backgroundColor: "#D1D5DB",
  },
});

export default OnBoard3;
