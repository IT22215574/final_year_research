// app/(auth)/OnboardingContainer.tsx
import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingContainerProps {
  children: React.ReactNode[];
  currentIndex: number;
}

const OnboardingContainer: React.FC<OnboardingContainerProps> = ({ 
  children, 
  currentIndex 
}) => {
  const router = useRouter();
  const [currentScreenIndex, setCurrentScreenIndex] = useState(currentIndex);
  
  // Animation values for swipe
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const screenAnim = useRef(new Animated.Value(currentIndex)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate swipe progress (-1 to 1)
        const progress = gestureState.dx / screenWidth;
        swipeAnim.setValue(progress);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > screenWidth * 0.2) {
          // Swipe confirmed
          if (gestureState.dx < 0 && currentScreenIndex < children.length - 1) {
            // Swipe left - go to next screen
            goToScreen(currentScreenIndex + 1);
          } else if (gestureState.dx > 0 && currentScreenIndex > 0) {
            // Swipe right - go to previous screen
            goToScreen(currentScreenIndex - 1);
          } else {
            resetSwipe();
          }
        } else {
          resetSwipe();
        }
      },
    })
  ).current;

  const goToScreen = (newIndex: number) => {
    setCurrentScreenIndex(newIndex);
    Animated.parallel([
      Animated.timing(swipeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(screenAnim, {
        toValue: newIndex,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to the appropriate screen
    if (newIndex === 1) {
      router.push('/onBoard2');
    } else if (newIndex === 2) {
      router.push('/onBoard3');
    } else if (newIndex === 0) {
      router.push('/onBoard1');
    }
  };

  const resetSwipe = () => {
    Animated.spring(swipeAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  // Get swipe progress for animations (0 to 1)
  const swipeProgress = swipeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [1, 0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.screenWrapper,
          {
            transform: [
              {
                translateX: swipeAnim.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-50, 0, 50],
                  extrapolate: 'clamp',
                }),
              },
            ],
            opacity: swipeAnim.interpolate({
              inputRange: [-0.5, 0, 0.5],
              outputRange: [0.7, 1, 0.7],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        {React.Children.map(children[currentScreenIndex], (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              swipeProgress,
              onNext: () => goToScreen(currentScreenIndex + 1),
              onPrevious: () => goToScreen(currentScreenIndex - 1),
            } as any);
          }
          return child;
        })}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenWrapper: {
    flex: 1,
  },
});

export default OnboardingContainer;