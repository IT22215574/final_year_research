import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

const Quality = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const [capturedImages, setCapturedImages] = useState({
    side1: null,
    side2: null
  });
  const [gradingResult, setGradingResult] = useState(null);
  const [isGrading, setIsGrading] = useState(false);
  const [step, setStep] = useState(1);
  const [activeSide, setActiveSide] = useState('side1');
  const [modelFeatures, setModelFeatures] = useState(null);
  const cameraRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Your model's actual outputs
  const MODEL_OUTPUTS = {
    species: ['Tuna', 'Mackerel'],
    grades: ['A', 'B', 'C'],
    confidenceThreshold: 0.7,
    
    // Feature names that your model extracts
    features: {
      color: [
        'Hue Mean', 'Hue Std', 'Saturation Mean', 'Saturation Std', 
        'Value Mean', 'Value Std', 'L* Mean', 'L* Std', 'a* Mean', 'a* Std',
        'b* Mean', 'b* Std', 'R Hist 1', 'R Hist 2', 'R Hist 3', 'R Hist 4',
        'G Hist 1', 'G Hist 2', 'G Hist 3', 'G Hist 4',
        'B Hist 1', 'B Hist 2', 'B Hist 3', 'B Hist 4'
      ],
      quality: ['Blood %', 'Brightness', 'Contrast', 'Edge Density', 'Entropy'],
      difference: [
        'Color Diff 1', 'Color Diff 2', 'Color Diff 3', 'Color Diff 4',
        'Color Diff 5', 'Color Diff 6', 'Color Diff 7', 'Color Diff 8',
        'Color Diff 9', 'Color Diff 10'
      ]
    }
  };

  const getGradeColor = (gradeText) => {
    const letter = String(gradeText || '').trim().split(' ')[1] || String(gradeText || '').trim();
    if (letter === 'A') return ['#10B981', '#34D399']; // Green
    if (letter === 'B') return ['#F59E0B', '#FBBF24']; // Yellow/Orange
    if (letter === 'C') return ['#EF4444', '#F87171']; // Red
    return ['#0066CC', '#00A3FF']; // Default blue
  };

  const getSpeciesColor = (species) => {
    if (species === 'Tuna') return ['#3B82F6', '#60A5FA']; // Blue
    if (species === 'Mackerel' || species === 'Makerel') return ['#8B5CF6', '#A78BFA']; // Purple
    return ['#6B7280', '#9CA3AF']; // Gray
  };

  const getQualityDescription = (grade) => {
    const descriptions = {
      'A': 'Premium Quality - Excellent for export markets',
      'B': 'Good Quality - Suitable for local markets',
      'C': 'Standard Quality - Best consumed quickly'
    };
    return descriptions[grade] || 'Quality assessment completed';
  };

  const getFeatureExplanation = (featureType) => {
    const explanations = {
      'Blood %': 'Percentage of red pixels indicating bleeding',
      'Brightness': 'Overall image brightness level',
      'Contrast': 'Difference between light and dark areas',
      'Edge Density': 'Number of edges (texture complexity)',
      'Entropy': 'Randomness in texture pattern',
      'Hue Mean': 'Average color hue value',
      'Saturation Std': 'Variation in color intensity'
    };
    return explanations[featureType] || 'Quality assessment feature';
  };

  const handleCameraPermission = async () => {
    try {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result?.granted) {
          Alert.alert('Permission Required', 'Please allow camera access to capture images.');
          return;
        }
      }
      setShowCamera(true);
    } catch {
      Alert.alert('Permission Error', 'Unable to request camera permission.');
    }
  };

  const takePicture = async (side) => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
          exif: true
        });
        
        setCapturedImages(prev => ({
          ...prev,
          [side]: photo.uri
        }));
        
        Alert.alert(
          'Success!',
          `Side ${side === 'side1' ? '1' : '2'} captured successfully!`,
          [{ text: 'OK' }]
        );
      } catch (error) {
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  const pickImage = async (side) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your gallery');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCapturedImages(prev => ({
        ...prev,
        [side]: result.assets[0].uri
      }));
    }
  };

  // Simulate your model's feature extraction
  const extractSimulatedFeatures = () => {
    const features = {
      left: {
        color: MODEL_OUTPUTS.features.color.map(() => Math.random() * 100),
        quality: [
          Math.random() * 10, // Blood %
          Math.random() * 255, // Brightness
          Math.random() * 2,   // Contrast
          Math.random() * 0.5, // Edge Density
          Math.random() * 3    // Entropy
        ]
      },
      right: {
        color: MODEL_OUTPUTS.features.color.map(() => Math.random() * 100),
        quality: [
          Math.random() * 10,
          Math.random() * 255,
          Math.random() * 2,
          Math.random() * 0.5,
          Math.random() * 3
        ]
      },
      difference: MODEL_OUTPUTS.features.difference.map(() => Math.random() * 50)
    };
    return features;
  };

  // Simulate your model's prediction
  const simulateModelPrediction = (features) => {
    // Your actual model logic would go here
    // This is a simulation based on your model outputs
    
    const speciesProbabilities = [
      Math.random(), // Tuna probability
      Math.random()  // Mackerel probability
    ];
    
    const gradeProbabilities = [
      Math.random() * 0.3, // Grade A probability
      Math.random() * 0.4 + 0.3, // Grade B probability (higher baseline)
      Math.random() * 0.3  // Grade C probability
    ];
    
    // Normalize probabilities
    const speciesSum = speciesProbabilities.reduce((a, b) => a + b, 0);
    const gradeSum = gradeProbabilities.reduce((a, b) => a + b, 0);
    
    const normalizedSpecies = speciesProbabilities.map(p => p / speciesSum);
    const normalizedGrades = gradeProbabilities.map(p => p / gradeSum);
    
    const speciesIndex = normalizedSpecies.indexOf(Math.max(...normalizedSpecies));
    const gradeIndex = normalizedGrades.indexOf(Math.max(...normalizedGrades));
    
    return {
      species: {
        label: MODEL_OUTPUTS.species[speciesIndex],
        class: speciesIndex,
        confidence: normalizedSpecies[speciesIndex],
        allProbabilities: normalizedSpecies
      },
      grade: {
        label: `Grade ${MODEL_OUTPUTS.grades[gradeIndex]}`,
        class: gradeIndex,
        confidence: normalizedGrades[gradeIndex],
        allProbabilities: normalizedGrades
      }
    };
  };

  const handleGradeFish = async () => {
    if (!capturedImages.side1 || !capturedImages.side2) {
      Alert.alert('Incomplete', 'Please capture both sides of the fish to continue');
      return;
    }

    setIsGrading(true);

    try {
      // Simulate processing delay (like your model inference)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 1: Extract features (like your model does)
      const extractedFeatures = extractSimulatedFeatures();
      setModelFeatures(extractedFeatures);

      // Step 2: Make prediction (like your model)
      const prediction = simulateModelPrediction(extractedFeatures);

      // Step 3: Prepare results for display
      const result = {
        species: prediction.species,
        grade: prediction.grade,
        confidence: Math.round(prediction.grade.confidence * 100),
        
        // Feature metrics for display
        featureMetrics: {
          brightness: Math.round(extractedFeatures.left.quality[1]),
          contrast: extractedFeatures.left.quality[2].toFixed(2),
          edgeDensity: (extractedFeatures.left.quality[3] * 100).toFixed(1),
          entropy: extractedFeatures.left.quality[4].toFixed(2),
          asymmetry: (extractedFeatures.difference[0] * 2).toFixed(1)
        },
        
        // Quality details based on your model's features
        qualityDetails: {
          colorConsistency: Math.round(100 - extractedFeatures.difference[1]),
          textureScore: Math.round(extractedFeatures.left.quality[3] * 200),
          freshness: Math.round(100 - (extractedFeatures.left.quality[0] * 10)),
          appearance: Math.round((extractedFeatures.left.quality[1] / 255) * 100)
        },
        
        // Recommendations based on grade
        recommendations: prediction.grade.label === 'Grade A' ? [
          'Premium export quality - Highest market value',
          'Perfect color and texture consistency',
          'Store at 0-2°C for maximum shelf life',
          'Ideal for sushi/sashimi preparation'
        ] : prediction.grade.label === 'Grade B' ? [
          'Good market quality - Local distribution',
          'Minor variations in color/texture',
          'Consume within 48 hours',
          'Suitable for grilling/baking'
        ] : [
          'Standard quality - Quick sale recommended',
          'Monitor for quality changes',
          'Best for cooked preparations',
          'Check storage temperature regularly'
        ],
        
        // Model information
        modelInfo: {
          totalFeatures: 68,
          architecture: 'Hybrid CNN + Feature Fusion',
          processed: new Date().toLocaleTimeString()
        }
      };

      setGradingResult(result);
      setStep(2);
      
    } catch (error) {
      Alert.alert('Analysis Failed', 'Unable to grade fish at this time');
      console.error('Grading error:', error);
    } finally {
      setIsGrading(false);
    }
  };

  const handleBackToSelection = () => {
    setCapturedImages({ side1: null, side2: null });
    setGradingResult(null);
    setModelFeatures(null);
    setStep(1);
  };

  const handleViewFeatures = () => {
    Alert.alert(
      'Model Features Extracted',
      `Total Features: ${modelFeatures ? '68' : 'Not extracted yet'}\n` +
      `Feature Types: Color (24) + Quality (5) + Difference (10) × 2 sides\n` +
      `Model Architecture: Dual CNN + Manual Features`,
      [{ text: 'OK' }]
    );
  };

  const handleExplainGrade = (grade) => {
    const explanations = {
      'A': 'Premium Grade: Excellent color, texture, symmetry. Minimal defects. Ideal for premium markets.',
      'B': 'Market Grade: Good quality with minor variations. Suitable for general markets.',
      'C': 'Standard Grade: Acceptable quality. Best for quick sale and cooked preparations.'
    };
    Alert.alert(`Grade ${grade} Explanation`, explanations[grade] || 'Standard fish quality grade');
  };

  // Camera Screen
  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={cameraFacing}
          mode="picture"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.9)', 'transparent']}
            style={styles.cameraHeader}
          >
            <TouchableOpacity
              style={styles.closeCamera}
              onPress={() => setShowCamera(false)}
            >
              <View style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>
              {activeSide === 'side1' ? 'Left Side' : 'Right Side'}
            </Text>
            <View style={{ width: 44 }} />
          </LinearGradient>

          <View style={styles.captureGuide}>
            <View style={styles.guideFrame}>
              <Text style={styles.guideText}>
                Align fish within frame
              </Text>
              <View style={styles.frameCorners}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>
          </View>

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.cameraControls}
          >
            <View style={styles.sideInfo}>
              <Text style={styles.sideInfoText}>
                {activeSide === 'side1' ? 'Capture left side first' : 'Capture right side for comparison'}
              </Text>
            </View>

            <View style={styles.captureButtonsRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => pickImage(activeSide)}
              >
                <MaterialIcons name="photo-library" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.captureMainButton}
                onPress={() => takePicture(activeSide)}
              >
                <LinearGradient
                  colors={['#0066CC', '#00A3FF']}
                  style={styles.cameraCaptureButtonInner}
                >
                  <View style={styles.captureButtonOuter}>
                    <MaterialIcons name="camera-alt" size={28} color="#0066CC" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setCameraFacing(prev => (prev === 'back' ? 'front' : 'back'))}
              >
                <MaterialIcons name="flip-camera-ios" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.sideSelector}>
              <TouchableOpacity
                style={[styles.sideButton, activeSide === 'side1' && styles.activeSideButton]}
                onPress={() => setActiveSide('side1')}
              >
                <Text style={[styles.sideButtonText, activeSide === 'side1' && styles.activeSideButtonText]}>
                  Left
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sideButton, activeSide === 'side2' && styles.activeSideButton]}
                onPress={() => setActiveSide('side2')}
              >
                <Text style={[styles.sideButtonText, activeSide === 'side2' && styles.activeSideButtonText]}>
                  Right
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066CC" />
      
      {/* Header */}
      <Animated.View style={[
        styles.header,
        {
          transform: [{
            translateY: scrollY.interpolate({
              inputRange: [0, 50],
              outputRange: [0, -50],
              extrapolate: 'clamp'
            })
          }]
        }
      ]}>
        <LinearGradient
          colors={['#0066CC', '#0088FF']}
          style={styles.headerGradient}
        >
          

          <View style={styles.stepIndicator}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                step >= 1 && styles.stepCircleActive
              ]}>
                {step > 1 ? (
                  <MaterialIcons name="check" size={16} color="white" />
                ) : (
                  <Text style={styles.stepNumber}>1</Text>
                )}
              </View>
              <Text style={styles.stepLabel}>Capture</Text>
            </View>
            
            <View style={styles.stepConnector}>
              <View style={styles.connectorLine} />
            </View>
            
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                step === 2 && styles.stepCircleActive
              ]}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <Text style={styles.stepLabel}>Analysis</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {/* Step 1: Capture Images */}
          {step === 1 && (
            <>
              <View style={styles.welcomeCard}>
                <Text style={styles.welcomeTitle}>Fish Quality Grading</Text>
                <Text style={styles.welcomeText}>
                  Capture both sides of the fish for AI analysis using modern technology
                </Text>
                <View style={styles.modelInfoBadge}>
                  <MaterialIcons name="model-training" size={14} color="#0066CC" />
                </View>
              </View>

              <View style={styles.captureCards}>
                {['side1', 'side2'].map((side, index) => (
                  <View key={side} style={styles.card}>
                    <LinearGradient
                      colors={['#FFFFFF', '#F8FAFC']}
                      style={styles.cardGradient}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleContainer}>
                          <View style={styles.cardIcon}>
                            <MaterialIcons 
                              name={index === 0 ? "flip" : "flip"} 
                              size={20} 
                              color="#0066CC" 
                              style={{ transform: [{ rotate: index === 0 ? '0deg' : '180deg' }] }}
                            />
                          </View>
                          <View>
                            <Text style={styles.cardTitle}>
                              {index === 0 ? 'Left Side' : 'Right Side'}
                            </Text>
                            <Text style={styles.cardSubtitle}>
                              {index === 0 ? 'Primary analysis' : 'Comparison view'}
                            </Text>
                          </View>
                        </View>
                        {capturedImages[side] && (
                          <View style={styles.statusBadge}>
                            <MaterialIcons name="check-circle" size={14} color="#10B981" />
                            <Text style={styles.statusText}>Ready</Text>
                          </View>
                        )}
                      </View>
                      
                      {capturedImages[side] ? (
                        <View style={styles.imageContainer}>
                          <Image 
                            source={{ uri: capturedImages[side] }} 
                            style={styles.imagePreview} 
                          />
                          <TouchableOpacity 
                            style={styles.imageActionButton}
                            onPress={() => setCapturedImages(prev => ({...prev, [side]: null}))}
                          >
                            <MaterialIcons name="refresh" size={18} color="white" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.captureButton}
                          onPress={() => {
                            setActiveSide(side);
                            handleCameraPermission();
                          }}
                        >
                          <LinearGradient
                            colors={['#F0F9FF', '#E0F2FE']}
                            style={styles.captureCardButtonInner}
                          >
                            <View style={styles.captureIconContainer}>
                              <MaterialIcons name="add-a-photo" size={36} color="#0066CC" />
                            </View>
                            <Text style={styles.captureButtonText}>
                              {index === 0 ? 'Capture Left Side' : 'Capture Right Side'}
                            </Text>
                            <Text style={styles.captureSubtext}>
                              {index === 0 ? 'For primary feature extraction' : 'For bilateral comparison'}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                      
                      <TouchableOpacity 
                        style={styles.galleryButton}
                        onPress={() => pickImage(side)}
                      >
                        <MaterialIcons name="photo-library" size={18} color="#0066CC" />
                        <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                ))}
              </View>

              <View style={styles.techInfoCard}>
                <View style={styles.techInfoHeader}>
                  <MaterialIcons name="precision-manufacturing" size={22} color="#0066CC" />
                  <Text style={styles.techInfoTitle}>Model Technology</Text>
                </View>
                <View style={styles.techInfoGrid}>
                  <View style={styles.techInfoItem}>
                    <View style={styles.techInfoIcon}>
                      <MaterialIcons name="view-in-ar" size={14} color="#FFFFFF" />
                    </View>
                    <Text style={styles.techInfoLabel}>Dual CNN</Text>
                    <Text style={styles.techInfoValue}>2 Views</Text>
                  </View>
                  <View style={styles.techInfoItem}>
                    <View style={styles.techInfoIcon}>
                      <MaterialIcons name="analytics" size={14} color="#FFFFFF" />
                    </View>
                    <Text style={styles.techInfoLabel}> Features</Text>
                    <Text style={styles.techInfoValue}>Extracted</Text>
                  </View>
                  <View style={styles.techInfoItem}>
                    <View style={styles.techInfoIcon}>
                      <MaterialIcons name="compare" size={14} color="#FFFFFF" />
                    </View>
                    <Text style={styles.techInfoLabel}>Asymmetry</Text>
                    <Text style={styles.techInfoValue}>Analysis</Text>
                  </View>
                  <View style={styles.techInfoItem}>
                    <View style={styles.techInfoIcon}>
                      <MaterialIcons name="blur-linear" size={14} color="#FFFFFF" />
                    </View>
                    <Text style={styles.techInfoLabel}>Hybrid</Text>
                    <Text style={styles.techInfoValue}>Model</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={[
                  styles.primaryButton,
                  (!capturedImages.side1 || !capturedImages.side2) && styles.primaryButtonDisabled
                ]}
                onPress={handleGradeFish}
                disabled={!capturedImages.side1 || !capturedImages.side2 || isGrading}
              >
                <LinearGradient
                  colors={['#0066CC', '#00A3FF']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isGrading ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
                      <Text style={styles.primaryButtonText}>Analyzing Features...</Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="auto-awesome" size={22} color="#fff" />
                      <Text style={styles.primaryButtonText}>Predict Grade</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2: Results */}
          {step === 2 && gradingResult && (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>AI Analysis Complete</Text>
                <Text style={styles.resultsSubtitle}>Hybrid model assessment results</Text>
              </View>

              <View style={styles.resultCard}>
                <LinearGradient
                  colors={['#FFFFFF', '#F8FAFC']}
                  style={styles.resultCardGradient}
                >
                  {/* Species and Grade Header */}
                  <View style={styles.resultHeader}>
                    <View style={styles.resultTitleContainer}>
                      <LinearGradient
                        colors={getSpeciesColor(gradingResult.species.label)}
                        style={styles.speciesBadge}
                      >
                        <MaterialIcons name="pets" size={14} color="white" />
                        <Text style={styles.speciesText}>{gradingResult.species.label}</Text>
                      </LinearGradient>
                      <View style={styles.resultTimeContainer}>
                        <MaterialIcons name="schedule" size={12} color="#94A3B8" />
                        <Text style={styles.resultTime}>Analyzed: {gradingResult.modelInfo?.processed}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleExplainGrade(gradingResult.grade.label.split(' ')[1])}>
                      <LinearGradient
                        colors={getGradeColor(gradingResult.grade.label)}
                        style={styles.confidenceBadge}
                      >
                        <MaterialIcons name="verified" size={14} color="white" />
                        <Text style={styles.confidenceText}>{gradingResult.confidence}% Confident</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Grade Display */}
                  <View style={styles.gradeSection}>
                    <View style={styles.gradeCircleContainer}>
                      <TouchableOpacity onPress={() => handleExplainGrade(gradingResult.grade.label.split(' ')[1])}>
                        <LinearGradient
                          colors={getGradeColor(gradingResult.grade.label)}
                          style={styles.gradeCircle}
                        >
                          <Text style={styles.gradeLetter}>{gradingResult.grade.label.split(' ')[1]}</Text>
                          <Text style={styles.gradeLabel}>Grade</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.gradeInfo}>
                      <Text style={[
                        styles.gradeTitle,
                        { color: getGradeColor(gradingResult.grade.label)[0] }
                      ]}>
                        {gradingResult.grade.label}
                      </Text>
                      <Text style={styles.gradeDescription}>
                        {getQualityDescription(gradingResult.grade.label.split(' ')[1])}
                      </Text>
                      
                      {/* Species Probability */}
                      <View style={styles.probabilityRow}>
                        <Text style={styles.probabilityLabel}>Species Confidence:</Text>
                        <View style={styles.probabilityBar}>
                          <LinearGradient
                            colors={getSpeciesColor(gradingResult.species.label)}
                            style={[styles.probabilityFill, { width: `${gradingResult.species.confidence * 100}%` }]}
                          />
                        </View>
                        <Text style={styles.probabilityValue}>
                          {Math.round(gradingResult.species.confidence * 100)}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Feature Metrics */}
                  <View style={styles.metricsSection}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.metricsTitle}>Feature Analysis</Text>
                      <TouchableOpacity onPress={handleViewFeatures}>
                        <Text style={styles.viewFeaturesText}>View 68 Features</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.metricsGrid}>
                      {Object.entries(gradingResult.featureMetrics || {}).map(([key, value]) => (
                        <View key={key} style={styles.metricItem}>
                          <View style={styles.metricHeader}>
                            <Text style={styles.metricLabel}>
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </Text>
                            <Text style={styles.metricValue}>{value}</Text>
                          </View>
                          <Text style={styles.metricExplanation}>
                            {getFeatureExplanation(key)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Quality Scores */}
                  <View style={styles.qualityScoresSection}>
                    <Text style={styles.sectionTitle}>Quality Scores</Text>
                    <View style={styles.scoresGrid}>
                      {Object.entries(gradingResult.qualityDetails || {}).map(([key, value]) => (
                        <View key={key} style={styles.scoreItem}>
                          <LinearGradient
                            colors={value > 85 ? ['#10B981', '#34D399'] : 
                                   value > 70 ? ['#F59E0B', '#FBBF24'] : 
                                   ['#EF4444', '#F87171']}
                            style={styles.scoreCircle}
                          >
                            <Text style={styles.scoreValue}>{value}</Text>
                          </LinearGradient>
                          <Text style={styles.scoreLabel}>
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Model Information
                  <View style={styles.modelInfoSection}>
                    <View style={styles.modelInfoHeader}>
                      <MaterialIcons name="model-training" size={18} color="#0066CC" />
                      <Text style={styles.modelInfoTitle}>Model Information</Text>
                    </View>
                    <View style={styles.modelInfoGrid}>
                      <View style={styles.modelInfoItem}>
                        <Text style={styles.modelInfoLabel}>Architecture</Text>
                        <Text style={styles.modelInfoValue}>Hybrid CNN + Features</Text>
                      </View>
                      <View style={styles.modelInfoItem}>
                        <Text style={styles.modelInfoLabel}>Features Extracted</Text>
                        <Text style={styles.modelInfoValue}>68</Text>
                      </View>
                      <View style={styles.modelInfoItem}>
                        <Text style={styles.modelInfoLabel}>Analysis Type</Text>
                        <Text style={styles.modelInfoValue}>Bilateral</Text>
                      </View>
                    </View>
                  </View> */}

                  {/* Recommendations */}
                  <View style={styles.recommendationsCard}>
                    <View style={styles.recommendationsHeader}>
                      <MaterialIcons name="recommend" size={20} color="#0066CC" />
                      <Text style={styles.recommendationsTitle}>Recommendations</Text>
                    </View>
                    <View style={styles.recommendationsList}>
                      {gradingResult.recommendations.map((rec, index) => (
                        <View key={index} style={styles.recommendationItem}>
                          <View style={styles.recommendationIcon}>
                            <MaterialIcons 
                              name={index === 0 ? "star" : index === 1 ? "local-shipping" : "thermostat"} 
                              size={16} 
                              color="#0066CC" 
                            />
                          </View>
                          <Text style={styles.recommendationText}>{rec}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.secondaryActionButton}
                  onPress={handleViewFeatures}
                >
                  <MaterialIcons name="analytics" size={20} color="#0066CC" />
                  <Text style={styles.secondaryActionButtonText}>View Features</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={handleBackToSelection}
                >
                  <LinearGradient
                    colors={['#0066CC', '#00A3FF']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons name="add-circle-outline" size={22} color="#fff" />
                    <Text style={styles.primaryButtonText}>New Analysis</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 8,
  },
  headerGradient: {
    paddingTop: STATUS_BAR_HEIGHT + 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepConnector: {
    width: 60,
    marginHorizontal: 4,
  },
  connectorLine: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 15,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#FFFFFF',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
  },
  stepLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    marginTop: 85,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    padding: 20,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 12,
  },
  modelInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modelInfoText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '600',
    marginLeft: 6,
  },
  captureCards: {
    gap: 16,
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    color: '#065F46',
    marginLeft: 4,
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageActionButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  captureCardButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  captureIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  captureButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
    marginBottom: 4,
  },
  captureSubtext: {
    fontSize: 12,
    color: '#94A3B8',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  galleryButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
    marginLeft: 8,
  },
  techInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  techInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  techInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    marginLeft: 8,
  },
  techInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  techInfoItem: {
    alignItems: 'center',
  },
  techInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  techInfoLabel: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  techInfoValue: {
    fontSize: 11,
    color: '#64748B',
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 10,
    margin: 2,padding: 2,          
  },
  resultsHeader: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  resultsSubtitle: {
    fontSize: 15,
    color: '#64748B',
  },
  resultCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 20,
  },
  resultCardGradient: {
    padding: 24,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  resultTitleContainer: {
    flex: 1,
  },
  speciesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  speciesText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  resultTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultTime: {
    fontSize: 13,
    color: '#94A3B8',
    marginLeft: 4,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  confidenceText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  gradeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  gradeCircleContainer: {
    marginRight: 24,
  },
  gradeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  gradeLetter: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  gradeLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '600',
  },
  gradeInfo: {
    flex: 1,
  },
  gradeTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  gradeDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  probabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  probabilityLabel: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 12,
    minWidth: 120,
  },
  probabilityBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  probabilityFill: {
    height: '100%',
    borderRadius: 3,
  },
  probabilityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 12,
    minWidth: 40,
  },
  metricsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  viewFeaturesText: {
    fontSize: 13,
    color: '#0066CC',
    fontWeight: '500',
  },
  metricsGrid: {
    gap: 16,
  },
  metricItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0066CC',
  },
  metricExplanation: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  qualityScoresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 20,
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  scoreItem: {
    width: (width - 80) / 3,
    alignItems: 'center',
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 14,
  },
  modelInfoSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  modelInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modelInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    marginLeft: 8,
  },
  modelInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modelInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  modelInfoLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  modelInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  recommendationsCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369A1',
    marginLeft: 8,
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recommendationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  recommendationText: {
    fontSize: 14,
    color: '#0369A1',
    flex: 1,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#0066CC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  secondaryActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0066CC',
    marginLeft: 8,
  },
  // Camera Styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: STATUS_BAR_HEIGHT + 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  closeCamera: {
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  captureGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: 300,
    height: 300,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 20,
  },
  frameCorners: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00A3FF',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  cameraControls: {
    paddingVertical: 40,
    paddingHorizontal: 30,
  },
  sideInfo: {
    marginBottom: 30,
  },
  sideInfoText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
  captureButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 30,
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureMainButton: {
    width: 88,
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureButtonInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  captureButtonOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 28,
    padding: 6,
  },
  sideButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 22,
    alignItems: 'center',
  },
  activeSideButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  sideButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeSideButtonText: {
    color: '#0066CC',
  },
});

export default Quality;