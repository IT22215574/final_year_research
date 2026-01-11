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
  ActivityIndicator,
  Animated
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons, FontAwesome6, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

const Quality = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [fishType, setFishType] = useState('');
  const [capturedImages, setCapturedImages] = useState({
    side1: null,
    side2: null
  });
  const [gradingResult, setGradingResult] = useState(null);
  const [isGrading, setIsGrading] = useState(false);
  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState('');
  const [activeSide, setActiveSide] = useState('side1');
  const cameraRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Fish types available for grading
  const fishTypes = [
    { id: 1, name: 'Tuna', icon: '🐟', description: 'Premium quality grade' },
    { id: 2, name: 'Mackerel', icon: '🐠', description: 'Common catch' },
    { id: 3, name: 'Salmon', icon: '🎣', description: 'Freshwater species' },
    { id: 4, name: 'Sea Bass', icon: '🐡', description: 'White meat fish' },
    { id: 5, name: 'Sardines', icon: '🐟', description: 'Small schooling fish' },
    { id: 6, name: 'Cod', icon: '🎣', description: 'Cold water fish' },
  ];

  // Quality standards
  const qualityStandards = {
    'Tuna': {
      'Grade A': {
        color: '#10B981',
        criteria: [
          'Vibrant red/pink color',
          'Firm texture',
          'No discoloration',
          'Fresh sea smell',
          'Clear eyes'
        ],
        price: 'Premium +25%'
      },
      'Grade B': {
        color: '#F59E0B',
        criteria: [
          'Slight discoloration',
          'Minor texture changes',
          'Acceptable smell',
          'Small blemishes'
        ],
        price: 'Standard Price'
      },
      'Grade C': {
        color: '#EF4444',
        criteria: [
          'Significant discoloration',
          'Soft texture',
          'Strong odor',
          'Multiple blemishes'
        ],
        price: 'Discounted -30%'
      }
    },
    'Mackerel': {
      'Grade A': {
        color: '#10B981',
        criteria: [
          'Shiny silver skin',
          'Firm elastic flesh',
          'Clear bright eyes',
          'Red gills',
          'No slime'
        ],
        price: 'Premium +20%'
      }
    }
  };

  // Mock grading results
  const mockGradingResults = {
    'Tuna': {
      grade: 'Grade B',
      confidence: 84,
      details: {
        colorScore: 82,
        textureScore: 85,
        freshnessScore: 86,
        overallScore: 84
      },
      recommendations: [
        'Market ready - Good quality',
        'Sell within 24 hours',
        'Keep at 0-2°C temperature'
      ]
    },
    'Mackerel': {
      grade: 'Grade A',
      confidence: 92,
      details: {
        colorScore: 95,
        textureScore: 90,
        freshnessScore: 91,
        overallScore: 92
      },
      recommendations: [
        'Excellent quality',
        'Export grade fish',
        '48 hour shelf life'
      ]
    }
  };

  // Header background animation
  const headerBackgroundColor = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: ['#0066CC', '#00A3FF'],              

    extrapolate: 'clamp'
  });

  const handleCameraPermission = async () => {
    if (!permission) {
      await requestPermission();
    }
    setShowCamera(true);
  };

  const takePicture = async (side) => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: true
        });
        
        setCapturedImages(prev => ({
          ...prev,
          [side]: photo.uri
        }));
        
        Alert.alert(
          'Success',
          'Image captured successfully!',
          [{ text: 'OK' }]
        );
      } catch (error) {
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  const handleFishSelect = (selectedFish) => {
    setFishType(selectedFish);
    setStep(2);
  };

  const handleBackToSelection = () => {
    setFishType('');
    setCapturedImages({ side1: null, side2: null });
    setGradingResult(null);
    setStep(1);
    setValidationError('');
  };

  const handleGradeFish = () => {
    if (!capturedImages.side1 || !capturedImages.side2) {
      Alert.alert('Incomplete', 'Capture both sides to continue');
      return;
    }

    setIsGrading(true);
    
    setTimeout(() => {
      const result = mockGradingResults[fishType] || mockGradingResults['Tuna'];
      setGradingResult(result);
      setIsGrading(false);
      setStep(3);
    }, 1500);
  };

  const pickImage = async (side) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (!result.canceled) {
      setCapturedImages(prev => ({
        ...prev,
        [side]: result.assets[0].uri
      }));
    }
  };

  const startNewGrading = () => {
    setCapturedImages({ side1: null, side2: null });
    setGradingResult(null);
    setStep(2);
  };

  // Camera Screen
  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          mode="picture"
        >
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              style={styles.closeCamera}
              onPress={() => setShowCamera(false)}
            >
              <MaterialIcons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>Capture {activeSide === 'side1' ? 'Side 1' : 'Side 2'}</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.captureGuide}>
            <View style={styles.guideFrame}>
              <View style={styles.frameCorners}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.guideText}>Align fish within frame</Text>
            </View>
          </View>

          <View style={styles.cameraControls}>
            <View style={styles.sideSelector}>
              <TouchableOpacity
                style={[styles.sideButton, activeSide === 'side1' && styles.activeSideButton]}
                onPress={() => setActiveSide('side1')}
              >
                <Text style={[styles.sideButtonText, activeSide === 'side1' && styles.activeSideButtonText]}>
                  Side 1
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sideButton, activeSide === 'side2' && styles.activeSideButton]}
                onPress={() => setActiveSide('side2')}
              >
                <Text style={[styles.sideButtonText, activeSide === 'side2' && styles.activeSideButtonText]}>
                  Side 2
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.captureButtonsRow}>
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={() => pickImage(activeSide)}
              >
                <MaterialIcons name="photo-library" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.captureMainButton}
                onPress={() => takePicture(activeSide)}
              >
                <View style={styles.captureButtonInner}>
                  <View style={styles.captureButtonOuter} />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.flipButton}
                onPress={() => cameraRef.current?.toggleFacing()}
              >
                <MaterialIcons name="flip-camera-ios" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0057FF" />
      
      {/* Fixed Header */}
      <Animated.View style={[styles.header, { backgroundColor: headerBackgroundColor }]}>
        
        
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((stepNum) => (
            <View key={stepNum} style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                step === stepNum && styles.stepCircleActive,
                step > stepNum && styles.stepCircleComplete
              ]}>
                {step > stepNum ? (
                  <MaterialIcons name="check" size={18} color="#fff" />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    step === stepNum && styles.stepNumberActive
                  ]}>
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text style={styles.stepLabel}>
                {stepNum === 1 ? 'Select' : stepNum === 2 ? 'Capture' : 'Results'}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Step 1: Fish Selection */}
        {step === 1 && (
          <View style={styles.selectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select Fish Type</Text>
              <Text style={styles.sectionDescription}>
                Choose the fish species for quality grading
              </Text>
            </View>

            <View style={styles.fishGrid}>
              {fishTypes.map((fish) => (
                <TouchableOpacity
                  key={fish.id}
                  style={styles.fishCard}
                  onPress={() => handleFishSelect(fish.name)}
                >
                  <View style={styles.fishIconContainer}>
                    <Text style={styles.fishEmoji}>{fish.icon}</Text>
                    {['Tuna', 'Mackerel'].includes(fish.name) && (
                      <View style={styles.aiBadge}>
                        <MaterialIcons name="ai" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.fishName}>{fish.name}</Text>
                  <Text style={styles.fishDescription}>{fish.description}</Text>
                  <View style={styles.availabilityBadge}>
                    {['Tuna', 'Mackerel'].includes(fish.name) ? (
                      <>
                        <MaterialIcons name="check-circle" size={12} color="#10B981" />
                        <Text style={styles.availabilityText}>AI Ready</Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="schedule" size={12} color="#F59E0B" />
                        <Text style={styles.availabilityText}>Coming Soon</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <MaterialIcons name="insights" size={24} color="#0A3D62" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>How It Works</Text>
                <View style={styles.stepList}>
                  <View style={styles.stepListItem}>
                    <View style={styles.stepNumberCircle}>
                      <Text style={styles.stepNumberSmall}>1</Text>
                    </View>
                    <Text style={styles.stepText}>Select fish species</Text>
                  </View>
                  <View style={styles.stepListItem}>
                    <View style={styles.stepNumberCircle}>
                      <Text style={styles.stepNumberSmall}>2</Text>
                    </View>
                    <Text style={styles.stepText}>Capture both sides</Text>
                  </View>
                  <View style={styles.stepListItem}>
                    <View style={styles.stepNumberCircle}>
                      <Text style={styles.stepNumberSmall}>3</Text>
                    </View>
                    <Text style={styles.stepText}>AI analyzes quality</Text>
                  </View>
                  <View style={styles.stepListItem}>
                    <View style={styles.stepNumberCircle}>
                      <Text style={styles.stepNumberSmall}>4</Text>
                    </View>
                    <Text style={styles.stepText}>Get grade & price</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Image Capture */}
        {step === 2 && (
          <View style={styles.captureContainer}>
            <View style={styles.currentSelectionHeader}>
              <TouchableOpacity onPress={handleBackToSelection} style={styles.backButton}>
                <MaterialIcons name="arrow-back-ios" size={22} color="#0A3D62" />
              </TouchableOpacity>
              <View style={styles.selectionInfo}>
                <Text style={styles.selectedFishName}>{fishType}</Text>
                <View style={styles.selectionBadge}>
                  <MaterialIcons name="photo-camera" size={14} color="#fff" />
                  <Text style={styles.selectionBadgeText}>Image Capture</Text>
                </View>
              </View>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.captureCards}>
              {/* Side 1 */}
              <View style={styles.captureCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Side 1</Text>
                  {capturedImages.side1 && (
                    <View style={styles.capturedBadge}>
                      <MaterialIcons name="check-circle" size={16} color="#10B981" />
                    </View>
                  )}
                </View>
                
                {capturedImages.side1 ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image 
                      source={{ uri: capturedImages.side1 }} 
                      style={styles.imagePreview} 
                    />
                    <TouchableOpacity 
                      style={styles.replaceButton}
                      onPress={() => setCapturedImages(prev => ({...prev, side1: null}))}
                    >
                      <MaterialIcons name="replay" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.emptyCaptureArea}
                    onPress={() => {
                      setActiveSide('side1');
                      handleCameraPermission();
                    }}
                  >
                    <View style={styles.captureIconCircle}>
                      <MaterialIcons name="add-a-photo" size={40} color="#4ECDC4" />
                    </View>
                    <Text style={styles.capturePrompt}>Tap to capture</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.galleryOption}
                  onPress={() => pickImage('side1')}
                >
                  <MaterialIcons name="photo-library" size={18} color="#0A3D62" />
                  <Text style={styles.galleryOptionText}>Choose from gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Side 2 */}
              <View style={styles.captureCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Side 2</Text>
                  {capturedImages.side2 && (
                    <View style={styles.capturedBadge}>
                      <MaterialIcons name="check-circle" size={16} color="#10B981" />
                    </View>
                  )}
                </View>
                
                {capturedImages.side2 ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image 
                      source={{ uri: capturedImages.side2 }} 
                      style={styles.imagePreview} 
                    />
                    <TouchableOpacity 
                      style={styles.replaceButton}
                      onPress={() => setCapturedImages(prev => ({...prev, side2: null}))}
                    >
                      <MaterialIcons name="replay" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.emptyCaptureArea}
                    onPress={() => {
                      setActiveSide('side2');
                      handleCameraPermission();
                    }}
                  >
                    <View style={styles.captureIconCircle}>
                      <MaterialIcons name="add-a-photo" size={40} color="#4ECDC4" />
                    </View>
                    <Text style={styles.capturePrompt}>Tap to capture</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.galleryOption}
                  onPress={() => pickImage('side2')}
                >
                  <MaterialIcons name="photo-library" size={18} color="#0A3D62" />
                  <Text style={styles.galleryOptionText}>Choose from gallery</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.tipsSection}>
              <View style={styles.tipsHeader}>
                <MaterialIcons name="tips-and-updates" size={22} color="#F59E0B" />
                <Text style={styles.tipsTitle}>Capture Tips</Text>
              </View>
              <View style={styles.tipsGrid}>
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <MaterialIcons name="wb-sunny" size={18} color="#0A3D62" />
                  </View>
                  <Text style={styles.tipText}>Good lighting</Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <MaterialIcons name="straighten" size={18} color="#0A3D62" />
                  </View>
                  <Text style={styles.tipText}>Full fish view</Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <MaterialIcons name="blur-off" size={18} color="#0A3D62" />
                  </View>
                  <Text style={styles.tipText}>No glare</Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <MaterialIcons name="clean-hands" size={18} color="#0A3D62" />
                  </View>
                  <Text style={styles.tipText}>Clean surface</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionSection}>
              <TouchableOpacity 
                style={styles.backButtonLarge}
                onPress={handleBackToSelection}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.gradeButton,
                  (!capturedImages.side1 || !capturedImages.side2) && styles.gradeButtonDisabled
                ]}
                onPress={handleGradeFish}
                disabled={!capturedImages.side1 || !capturedImages.side2 || isGrading}
              >
                {isGrading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="analytics" size={22} color="#fff" />
                    <Text style={styles.gradeButtonText}>Analyze Quality</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Results */}
        {step === 3 && gradingResult && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <TouchableOpacity onPress={handleBackToSelection} style={styles.backButton}>
                <MaterialIcons name="arrow-back-ios" size={22} color="#0A3D62" />
              </TouchableOpacity>
              <Text style={styles.resultsTitle}>Grading Results</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Main Grade Card */}
            <View style={styles.gradeResultCard}>
              <View style={styles.resultHeader}>
                <View>
                  <Text style={styles.resultFishName}>{fishType}</Text>
                  <Text style={styles.resultTimestamp}>Just now</Text>
                </View>
                <View style={styles.confidencePill}>
                  <MaterialIcons name="auto-awesome" size={16} color="#fff" />
                  <Text style={styles.confidenceText}>{gradingResult.confidence}% AI Confidence</Text>
                </View>
              </View>

              {/* Grade Display */}
              <View style={styles.gradeDisplay}>
                <View style={styles.gradeCircleContainer}>
                  <View style={[
                    styles.gradeCircle,
                    { borderColor: qualityStandards[fishType]?.[gradingResult.grade]?.color || '#4ECDC4' }
                  ]}>
                    <Text style={styles.gradeLetter}>{gradingResult.grade.split(' ')[1]}</Text>
                  </View>
                  <Text style={styles.gradeLabel}>Quality Grade</Text>
                </View>
                
                <View style={styles.gradeDetails}>
                  <Text style={[
                    styles.gradeTitle,
                    { color: qualityStandards[fishType]?.[gradingResult.grade]?.color || '#4ECDC4' }
                  ]}>
                    {gradingResult.grade}
                  </Text>
                  <Text style={styles.gradePrice}>
                    {qualityStandards[fishType]?.[gradingResult.grade]?.price || 'Market Price'}
                  </Text>
                </View>
              </View>

              {/* Quality Scores */}
              <View style={styles.scoresSection}>
                <Text style={styles.scoresTitle}>Quality Metrics</Text>
                <View style={styles.scoresGrid}>
                  {Object.entries(gradingResult.details).map(([key, value]) => (
                    <View key={key} style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>
                        {key.charAt(0).toUpperCase() + key.slice(1).replace('Score', '')}
                      </Text>
                      <Text style={styles.scoreValue}>{value}%</Text>
                      <View style={styles.scoreBar}>
                        <View 
                          style={[
                            styles.scoreFill,
                            { 
                              width: `${value}%`,
                              backgroundColor: value > 85 ? '#10B981' : 
                                            value > 70 ? '#F59E0B' : '#EF4444'
                            }
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Recommendations */}
              <View style={styles.recommendationsSection}>
                <View style={styles.recommendationsHeader}>
                  <MaterialIcons name="recommend" size={22} color="#0A3D62" />
                  <Text style={styles.recommendationsTitle}>Recommendations</Text>
                </View>
                {gradingResult.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <View style={styles.recommendationBullet} />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>

              {/* Criteria */}
              {qualityStandards[fishType]?.[gradingResult.grade] && (
                <View style={styles.criteriaSection}>
                  <Text style={styles.criteriaTitle}>Grade Criteria</Text>
                  {qualityStandards[fishType][gradingResult.grade].criteria.map((criterion, index) => (
                    <View key={index} style={styles.criterionItem}>
                      <MaterialIcons name="check" size={18} color="#10B981" />
                      <Text style={styles.criterionText}>{criterion}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Actions */}
              <View style={styles.resultsActions}>
                <TouchableOpacity 
                  style={styles.shareButton}
                  onPress={() => Alert.alert('Share', 'Results shared successfully!')}
                >
                  <MaterialIcons name="share" size={20} color="#0A3D62" />
                  <Text style={styles.shareButtonText}>Share Report</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.newGradeButton}
                  onPress={startNewGrading}
                >
                  <MaterialIcons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.newGradeButtonText}>Grade Another</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent History */}
            <View style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Recent Gradings</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.historyList}>
                <View style={styles.historyItem}>
                  <View style={styles.historyFishIcon}>
                    <Text style={styles.historyFishEmoji}>🐟</Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyFishName}>Tuna</Text>
                    <Text style={styles.historyTime}>2 hours ago</Text>
                  </View>
                  <View style={[
                    styles.historyGradeBadge,
                    { backgroundColor: '#FEF3C7' }
                  ]}>
                    <Text style={[
                      styles.historyGrade,
                      { color: '#92400E' }
                    ]}>B</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: StatusBar.currentHeight,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4ECDC4',
    marginTop: 2,
    fontWeight: '500',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: '#4ECDC4',
  },
  stepCircleComplete: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  stepNumberActive: {
    color: '#0A3D62',
  },
  stepLabel: {
    fontSize: 12,
    color: '#B0D7FF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  selectionContainer: {
    padding: 20,
    paddingTop: 25,
  },
  sectionHeader: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0A3D62',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
  },
  fishGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  fishCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0A3D62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  fishIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  fishEmoji: {
    fontSize: 32,
  },
  aiBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#4ECDC4',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  fishName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A3D62',
    marginBottom: 4,
  },
  fishDescription: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    color: '#475569',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 15,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A3D62',
    marginBottom: 12,
  },
  stepList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stepListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 10,
  },
  stepNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0A3D62',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumberSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  stepText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  captureContainer: {
    padding: 20,
    paddingTop: 25,
  },
  currentSelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionInfo: {
    flex: 1,
    alignItems: 'center',
  },
  selectedFishName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0A3D62',
    marginBottom: 6,
  },
  selectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectionBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  captureCards: {
    marginBottom: 25,
  },
  captureCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0A3D62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A3D62',
  },
  capturedBadge: {
    backgroundColor: '#D1FAE5',
    padding: 4,
    borderRadius: 10,
  },
  emptyCaptureArea: {
    height: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  captureIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  capturePrompt: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  imagePreviewWrapper: {
    position: 'relative',
    height: 180,
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  replaceButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(10, 61, 98, 0.8)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  galleryOptionText: {
    fontSize: 14,
    color: '#0A3D62',
    fontWeight: '600',
    marginLeft: 6,
  },
  tipsSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 20,
    marginBottom: 25,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 8,
  },
  tipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tipItem: {
    width: (width - 80) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButtonLarge: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  gradeButton: {
    flex: 2,
    paddingVertical: 16,
    backgroundColor: '#0A3D62',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0A3D62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradeButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  gradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight + 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  closeCamera: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  captureGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 150,
  },
  guideFrame: {
    width: 280,
    height: 280,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameCorners: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4ECDC4',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  guideText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 10,
  },
  cameraControls: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  sideSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    padding: 4,
    marginBottom: 30,
  },
  sideButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeSideButton: {
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
  },
  sideButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },
  activeSideButtonText: {
    color: '#4ECDC4',
  },
  captureButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureMainButton: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: '#0A3D62',
  },
  resultsContainer: {
    padding: 20,
    paddingTop: 25,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  resultsTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0A3D62',
  },
  gradeResultCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0A3D62',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  resultFishName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0A3D62',
  },
  resultTimestamp: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confidenceText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    marginLeft: 5,
  },
  gradeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  gradeCircleContainer: {
    alignItems: 'center',
    marginRight: 25,
  },
  gradeCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gradeLetter: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0A3D62',
  },
  gradeLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  gradeDetails: {
    flex: 1,
  },
  gradeTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  gradePrice: {
    fontSize: 18,
    color: '#0A3D62',
    fontWeight: '700',
  },
  scoresSection: {
    marginBottom: 25,
  },
  scoresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A3D62',
    marginBottom: 15,
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  scoreItem: {
    width: (width - 80) / 2,
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0A3D62',
    marginBottom: 8,
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  recommendationsSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 25,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0369A1',
    marginLeft: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0A3D62',
    marginTop: 8,
    marginRight: 10,
  },
  recommendationText: {
    fontSize: 14,
    color: '#0369A1',
    flex: 1,
    lineHeight: 20,
  },
  criteriaSection: {
    marginBottom: 25,
  },
  criteriaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0A3D62',
    marginBottom: 12,
  },
  criterionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  criterionText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
    flex: 1,
  },
  resultsActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shareButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A3D62',
    marginLeft: 8,
  },
  newGradeButton: {
    flex: 2,
    paddingVertical: 16,
    backgroundColor: '#4ECDC4',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  newGradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A3D62',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '600',
  },
  historyList: {},
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyFishIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyFishEmoji: {
    fontSize: 22,
  },
  historyInfo: {
    flex: 1,
  },
  historyFishName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A3D62',
  },
  historyTime: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  historyGradeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyGrade: {
    fontSize: 16,
    fontWeight: '800',
  },
});

export default Quality;