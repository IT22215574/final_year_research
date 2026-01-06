import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons, FontAwesome5, Ionicons, AntDesign } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type CapturedSide = 'side1' | 'side2';
type CapturedImages = Record<CapturedSide, string | null>;

type GradingDetails = {
  colorScore: number;
  textureScore: number;
  freshnessScore: number;
  overallScore: number;
};

type GradingResult = {
  grade: string;
  confidence: number;
  details: GradingDetails;
  recommendations: string[];
};

type QualityStandard = {
  color: string;
  criteria: string[];
  pricePremium: string;
};

type QualityStandardsByFish = Record<string, Record<string, QualityStandard>>;

const Quality = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [fishType, setFishType] = useState('');
  const [capturedImages, setCapturedImages] = useState<CapturedImages>({
    side1: null,
    side2: null
  });
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [step, setStep] = useState(1); // 1: Select fish, 2: Capture images, 3: View results
  const [validationError, setValidationError] = useState('');
  const cameraRef = useRef<CameraView | null>(null);

  // Fish types available for grading
  const fishTypes = [
    { id: 1, name: 'Tuna', localName: 'බලයා' },
    { id: 2, name: 'Mackerel', localName: 'අබදොල' },
    { id: 3, name: 'Salmon', localName: 'සැමන්' },
    { id: 4, name: 'Seer', localName: 'සීර' },
    { id: 5, name: 'Sardines', localName: 'හැල්මසුන්' },
  ];

  // Quality standards for each fish type
  const qualityStandards: QualityStandardsByFish = {
    'Tuna': {
      'Grade A': {
        color: '#10B981',
        criteria: [
          'Vibrant red/pink color',
          'Firm texture',
          'No discoloration',
          'Fresh sea smell',
          'Clear eyes if present'
        ],
        pricePremium: '+15-20%'
      },
      'Grade B': {
        color: '#F59E0B',
        criteria: [
          'Slight discoloration',
          'Minor texture changes',
          'Acceptable smell',
          'Small blemishes acceptable'
        ],
        pricePremium: 'Market Price'
      },
      'Grade C': {
        color: '#EF4444',
        criteria: [
          'Significant discoloration',
          'Soft texture',
          'Strong odor',
          'Multiple blemishes'
        ],
        pricePremium: '-20-30%'
      }
    },
    'Mackerel': {
      'Grade A': {
        color: '#10B981',
        criteria: [
          'Shiny silver skin',
          'Firm and elastic flesh',
          'Clear bright eyes',
          'Red gills',
          'No slime or odor'
        ],
        pricePremium: '+10-15%'
      },
      'Grade B': {
        color: '#F59E0B',
        criteria: [
          'Slight dullness',
          'Minor skin damage',
          'Eyes slightly cloudy',
          'Mild smell'
        ],
        pricePremium: 'Market Price'
      },
      'Grade C': {
        color: '#EF4444',
        criteria: [
          'Dull/discolored skin',
          'Soft/mushy texture',
          'Cloudy/sunken eyes',
          'Strong unpleasant odor'
        ],
        pricePremium: '-25-35%'
      }
    }
  };

  // Mock grading results for demonstration
  const mockGradingResults: Record<string, GradingResult> = {
    'Tuna': {
      grade: 'Grade B',
      confidence: 78,
      details: {
        colorScore: 75,
        textureScore: 80,
        freshnessScore: 79,
        overallScore: 78
      },
      recommendations: [
        'Market ready - Acceptable quality',
        'Sell within 24 hours',
        'Store at 0-2°C'
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
        'Premium quality - Export grade',
        'Can be stored for 48 hours',
        'Ideal for high-end markets'
      ]
    }
  };

  // Request camera permission
  const handleCameraPermission = async () => {
    if (!permission) {
      await requestPermission();
    }
    setShowCamera(true);
  };

  // Capture image
  const takePicture = async (side: CapturedSide) => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
          exif: true
        });
        
        // Simulate image validation
        const isValid = validateFishImage(photo.base64);
        
        if (isValid) {
          setCapturedImages(prev => ({
            ...prev,
            [side]: photo.uri
          }));
          setValidationError('');
          
          // Show success message
          Alert.alert(
            'Success',
            `${side === 'side1' ? 'First' : 'Second'} side captured successfully!`,
            [{ text: 'OK' }]
          );
        } else {
          setValidationError('Invalid fish image detected. Please capture a clear image of the fish.');
          Alert.alert(
            'Validation Failed',
            'The captured image does not appear to be a valid fish image. Please try again.',
            [{ text: 'Retry' }]
          );
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  // Validate if the image is a fish (mock implementation)
  const validateFishImage = (base64Image?: string) => {
    // In real app, this would call your ML model for validation
    // For now, we'll simulate validation
    if (!base64Image) return false;
    return Math.random() > 0.2; // 80% chance of valid image
  };

  // Select fish type
  const handleFishSelect = (selectedFish: string) => {
    setFishType(selectedFish);
    setStep(2);
  };

  // Go back to fish selection
  const handleBackToSelection = () => {
    setFishType('');
    setCapturedImages({ side1: null, side2: null });
    setGradingResult(null);
    setStep(1);
    setValidationError('');
  };

  // Process grading
  const handleGradeFish = () => {
    if (!capturedImages.side1 || !capturedImages.side2) {
      Alert.alert('Incomplete', 'Please capture both sides of the fish');
      return;
    }

    setIsGrading(true);
    
    // Simulate API call to ML model
    setTimeout(() => {
      const result = mockGradingResults[fishType] || mockGradingResults['Tuna'];
      setGradingResult(result);
      setIsGrading(false);
      setStep(3);
      
      // Log grading event
      console.log('Grading completed:', {
        fishType,
        grade: result.grade,
        confidence: result.confidence,
        timestamp: new Date().toISOString()
      });
    }, 2000);
  };

  // Upload from gallery
  const pickImage = async (side: CapturedSide) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCapturedImages(prev => ({
        ...prev,
        [side]: result.assets[0].uri
      }));
      setValidationError('');
    }
  };

  // Start new grading
  const startNewGrading = () => {
    setCapturedImages({ side1: null, side2: null });
    setGradingResult(null);
    setStep(2);
    setValidationError('');
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
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.closeCamera}
              onPress={() => setShowCamera(false)}
            >
              <MaterialIcons name="close" size={30} color="white" />
            </TouchableOpacity>
            
            <View style={styles.captureGuide}>
              <View style={styles.guideTextContainer}>
                <Text style={styles.guideText}>
                  Position fish in the frame
                </Text>
                <Text style={styles.guideSubtext}>
                  Ensure good lighting and clear view
                </Text>
              </View>
              
              <View style={styles.captureFrame}>
                <View style={styles.frameBorder} />
                <Text style={styles.frameText}>Fish Area</Text>
              </View>
            </View>
            
            <View style={styles.captureButtons}>
              <TouchableOpacity
                style={[
                  styles.captureButton,
                  capturedImages.side1 && styles.capturedButton
                ]}
                onPress={() => takePicture('side1')}
              >
                <MaterialIcons 
                  name={capturedImages.side1 ? "check-circle" : "photo-camera"} 
                  size={30} 
                  color="white" 
                />
                <Text style={styles.captureButtonText}>
                  {capturedImages.side1 ? 'Side 1 ✓' : 'Capture Side 1'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.captureButton,
                  capturedImages.side2 && styles.capturedButton
                ]}
                onPress={() => takePicture('side2')}
              >
                <MaterialIcons 
                  name={capturedImages.side2 ? "check-circle" : "photo-camera"} 
                  size={30} 
                  color="white" 
                />
                <Text style={styles.captureButtonText}>
                  {capturedImages.side2 ? 'Side 2 ✓' : 'Capture Side 2'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // Main UI
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <MaterialIcons name="assistant-photo" size={32} color="#fff" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Fish Quality Grading</Text>
              <Text style={styles.headerSubtitle}>AI-Powered Quality Assessment</Text>
            </View>
          </View>
          <View style={styles.stepsIndicator}>
            {[1, 2, 3].map((stepNum) => (
              <View key={stepNum} style={styles.stepContainer}>
                <View style={[
                  styles.stepCircle,
                  step === stepNum && styles.stepCircleActive,
                  step > stepNum && styles.stepCircleCompleted
                ]}>
                  {step > stepNum ? (
                    <MaterialIcons name="check" size={20} color="#fff" />
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
                  {stepNum === 1 ? 'Select Fish' : stepNum === 2 ? 'Capture' : 'Results'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {step === 1 && (
          <View style={styles.selectionContainer}>
            <Text style={styles.sectionTitle}>Select Fish Type</Text>
            <Text style={styles.sectionDescription}>
              Choose the type of fish you want to grade. Currently supporting:
            </Text>
            
            <View style={styles.fishGrid}>
              {fishTypes.map((fish) => (
                <TouchableOpacity
                  key={fish.id}
                  style={styles.fishCard}
                  onPress={() => handleFishSelect(fish.name)}
                >
                  <View style={styles.fishIconContainer}>
                    <MaterialIcons name="pets" size={40} color="#3B82F6" />
                  </View>
                  <Text style={styles.fishName}>{fish.name}</Text>
                  <Text style={styles.fishLocalName}>{fish.localName}</Text>
                  <View style={styles.statusBadge}>
                    {fish.name === 'Tuna' || fish.name === 'Mackerel' ? (
                      <>
                        <MaterialIcons name="check-circle" size={12} color="#10B981" />
                        <Text style={styles.statusText}>Model Ready</Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="schedule" size={12} color="#F59E0B" />
                        <Text style={styles.statusText}>Coming Soon</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.infoBox}>
              <MaterialIcons name="info" size={24} color="#3B82F6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Grading Process</Text>
                <Text style={styles.infoText}>
                  1. Select fish type{'\n'}
                  2. Capture both sides of the fish{'\n'}
                  3. AI model analyzes quality{'\n'}
                  4. Get grade (A, B, C) and recommendations
                </Text>
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.captureContainer}>
            <View style={styles.currentFishHeader}>
              <TouchableOpacity onPress={handleBackToSelection} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color="#3B82F6" />
              </TouchableOpacity>
              <View>
                <Text style={styles.currentFishTitle}>Grading: {fishType}</Text>
                <Text style={styles.currentFishSubtitle}>
                  {fishTypes.find(f => f.name === fishType)?.localName}
                </Text>
              </View>
            </View>

            {validationError ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={40} color="#EF4444" />
                <Text style={styles.errorTitle}>Validation Failed</Text>
                <Text style={styles.errorText}>{validationError}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => setValidationError('')}
                >
                  <Text style={styles.retryButtonText}>Retry Capture</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.instructions}>
                  Capture clear images of both sides of the fish for accurate grading
                </Text>

                <View style={styles.imageCaptureSection}>
                  {/* Side 1 */}
                  <View style={styles.imageCard}>
                    <Text style={styles.sideLabel}>Side 1</Text>
                    {capturedImages.side1 ? (
                      <View style={styles.imagePreviewContainer}>
                        <Image 
                          source={{ uri: capturedImages.side1 }} 
                          style={styles.imagePreview} 
                        />
                        <TouchableOpacity 
                          style={styles.replaceButton}
                          onPress={() => setCapturedImages(prev => ({...prev, side1: null}))}
                        >
                          <MaterialIcons name="refresh" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.captureCard}
                        onPress={handleCameraPermission}
                      >
                        <MaterialIcons name="photo-camera" size={50} color="#9CA3AF" />
                        <Text style={styles.captureText}>Capture Image</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.uploadButton}
                      onPress={() => pickImage('side1')}
                    >
                      <MaterialIcons name="cloud-upload" size={20} color="#3B82F6" />
                      <Text style={styles.uploadButtonText}>Upload from Gallery</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Side 2 */}
                  <View style={styles.imageCard}>
                    <Text style={styles.sideLabel}>Side 2</Text>
                    {capturedImages.side2 ? (
                      <View style={styles.imagePreviewContainer}>
                        <Image 
                          source={{ uri: capturedImages.side2 }} 
                          style={styles.imagePreview} 
                        />
                        <TouchableOpacity 
                          style={styles.replaceButton}
                          onPress={() => setCapturedImages(prev => ({...prev, side2: null}))}
                        >
                          <MaterialIcons name="refresh" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.captureCard}
                        onPress={handleCameraPermission}
                      >
                        <MaterialIcons name="photo-camera" size={50} color="#9CA3AF" />
                        <Text style={styles.captureText}>Capture Image</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.uploadButton}
                      onPress={() => pickImage('side2')}
                    >
                      <MaterialIcons name="cloud-upload" size={20} color="#3B82F6" />
                      <Text style={styles.uploadButtonText}>Upload from Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Capture Tips */}
                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsTitle}>
                    <MaterialIcons name="lightbulb" size={20} color="#F59E0B" /> Tips for Best Results
                  </Text>
                  <View style={styles.tipItem}>
                    <MaterialIcons name="check-circle" size={16} color="#10B981" />
                    <Text style={styles.tipText}>Use good natural lighting</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <MaterialIcons name="check-circle" size={16} color="#10B981" />
                    <Text style={styles.tipText}>Place fish on clean, contrasting surface</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <MaterialIcons name="check-circle" size={16} color="#10B981" />
                    <Text style={styles.tipText}>Capture entire fish in frame</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <MaterialIcons name="check-circle" size={16} color="#10B981" />
                    <Text style={styles.tipText}>Avoid shadows and glare</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={handleBackToSelection}
                  >
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.primaryButton,
                      (!capturedImages.side1 || !capturedImages.side2) && styles.disabledButton
                    ]}
                    onPress={handleGradeFish}
                    disabled={!capturedImages.side1 || !capturedImages.side2 || isGrading}
                  >
                    {isGrading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="analytics" size={20} color="#fff" />
                        <Text style={styles.primaryButtonText}>Grade Fish</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {step === 3 && gradingResult && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <TouchableOpacity onPress={handleBackToSelection} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color="#3B82F6" />
              </TouchableOpacity>
              <Text style={styles.resultsTitle}>Grading Results</Text>
            </View>

            {/* Grade Display */}
            <View style={styles.gradeCard}>
              <View style={styles.gradeHeader}>
                <View>
                  <Text style={styles.fishTypeResult}>{fishType}</Text>
                  <Text style={styles.fishLocalResult}>
                    {fishTypes.find(f => f.name === fishType)?.localName}
                  </Text>
                </View>
                <View style={styles.confidenceBadgeResult}>
                  <Text style={styles.confidenceTextResult}>{gradingResult.confidence}%</Text>
                  <Text style={styles.confidenceLabel}>Confidence</Text>
                </View>
              </View>

              <View style={styles.gradeDisplay}>
                <View style={[
                  styles.gradeCircle,
                  { borderColor: qualityStandards[fishType]?.[gradingResult.grade]?.color || '#10B981' }
                ]}>
                  <Text style={styles.gradeLetter}>
                    {gradingResult.grade.split(' ')[1]}
                  </Text>
                  <Text style={styles.gradeLabel}>Grade</Text>
                </View>
                
                <View style={styles.gradeInfo}>
                  <Text style={[
                    styles.gradeText,
                    { color: qualityStandards[fishType]?.[gradingResult.grade]?.color || '#10B981' }
                  ]}>
                    {gradingResult.grade}
                  </Text>
                  <Text style={styles.gradeDescription}>
                    {qualityStandards[fishType]?.[gradingResult.grade]?.pricePremium || 'Market Price'}
                  </Text>
                </View>
              </View>

              {/* Quality Scores */}
              <View style={styles.scoresContainer}>
                <Text style={styles.scoresTitle}>Quality Metrics</Text>
                <View style={styles.scoreGrid}>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Color</Text>
                    <Text style={styles.scoreValue}>{gradingResult.details.colorScore}%</Text>
                    <View style={styles.scoreBar}>
                      <View 
                        style={[
                          styles.scoreFill,
                          { 
                            width: `${gradingResult.details.colorScore}%`,
                            backgroundColor: gradingResult.details.colorScore > 80 ? '#10B981' : 
                                          gradingResult.details.colorScore > 60 ? '#F59E0B' : '#EF4444'
                          }
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Texture</Text>
                    <Text style={styles.scoreValue}>{gradingResult.details.textureScore}%</Text>
                    <View style={styles.scoreBar}>
                      <View 
                        style={[
                          styles.scoreFill,
                          { 
                            width: `${gradingResult.details.textureScore}%`,
                            backgroundColor: gradingResult.details.textureScore > 80 ? '#10B981' : 
                                          gradingResult.details.textureScore > 60 ? '#F59E0B' : '#EF4444'
                          }
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Freshness</Text>
                    <Text style={styles.scoreValue}>{gradingResult.details.freshnessScore}%</Text>
                    <View style={styles.scoreBar}>
                      <View 
                        style={[
                          styles.scoreFill,
                          { 
                            width: `${gradingResult.details.freshnessScore}%`,
                            backgroundColor: gradingResult.details.freshnessScore > 80 ? '#10B981' : 
                                          gradingResult.details.freshnessScore > 60 ? '#F59E0B' : '#EF4444'
                          }
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Overall</Text>
                    <Text style={styles.scoreValue}>{gradingResult.details.overallScore}%</Text>
                    <View style={styles.scoreBar}>
                      <View 
                        style={[
                          styles.scoreFill,
                          { 
                            width: `${gradingResult.details.overallScore}%`,
                            backgroundColor: gradingResult.details.overallScore > 80 ? '#10B981' : 
                                          gradingResult.details.overallScore > 60 ? '#F59E0B' : '#EF4444'
                          }
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Recommendations */}
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>
                  <MaterialIcons name="recommend" size={20} color="#3B82F6" /> Recommendations
                </Text>
                {gradingResult.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <MaterialIcons name="check-circle" size={16} color="#10B981" />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>

              {/* Quality Criteria */}
              {qualityStandards[fishType]?.[gradingResult.grade] && (
                <View style={styles.criteriaContainer}>
                  <Text style={styles.criteriaTitle}>Grade {gradingResult.grade.split(' ')[1]} Criteria</Text>
                  {qualityStandards[fishType][gradingResult.grade].criteria.map((criterion, index) => (
                    <View key={index} style={styles.criterionItem}>
                      <View style={[
                        styles.criterionDot,
                        { backgroundColor: qualityStandards[fishType][gradingResult.grade].color }
                      ]} />
                      <Text style={styles.criterionText}>{criterion}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.resultsActions}>
                <TouchableOpacity 
                  style={styles.resultsSecondaryButton}
                  onPress={() => {
                    // Share results functionality
                    Alert.alert('Share', 'Results shared successfully!');
                  }}
                >
                  <MaterialIcons name="share" size={20} color="#3B82F6" />
                  <Text style={styles.resultsSecondaryButtonText}>Share</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.resultsPrimaryButton}
                  onPress={startNewGrading}
                >
                  <MaterialIcons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.resultsPrimaryButtonText}>Grade Another</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* History Preview */}
            <View style={styles.historyPreview}>
              <Text style={styles.historyTitle}>Recent Gradings</Text>
              <View style={styles.historyItem}>
                <View style={styles.historyFishInfo}>
                  <Text style={styles.historyFishName}>Tuna</Text>
                  <Text style={styles.historyDate}>Today, 10:30 AM</Text>
                </View>
                <View style={styles.historyGradeBadge}>
                  <Text style={styles.historyGrade}>B</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.viewHistoryButton}>
                <Text style={styles.viewHistoryText}>View Full History</Text>
                <MaterialIcons name="chevron-right" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#0057cf',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#DBEAFE',
    marginTop: 2,
  },
  stepsIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#93C5FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#fff',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  stepNumberActive: {
    color: '#3B82F6',
  },
  stepLabel: {
    fontSize: 12,
    color: '#DBEAFE',
    fontWeight: '500',
  },
  selectionContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  fishGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  fishCard: {
    width: (width - 60) / 3,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fishIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  fishName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  fishLocalName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    marginLeft: 4,
    color: '#6B7280',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  captureContainer: {
    padding: 20,
  },
  currentFishHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 12,
  },
  currentFishTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  currentFishSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  instructions: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  imageCaptureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  imageCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sideLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  captureCard: {
    height: 150,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  captureText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  replaceButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 6,
    fontWeight: '500',
  },
  tipsContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  closeCamera: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  captureGuide: {
    alignItems: 'center',
  },
  guideTextContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  guideText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  guideSubtext: {
    color: '#D1D5DB',
    fontSize: 14,
    marginTop: 4,
  },
  captureFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameBorder: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
  },
  frameText: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  captureButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  captureButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    padding: 16,
    borderRadius: 12,
    width: 150,
  },
  capturedButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.8)',
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  resultsContainer: {
    padding: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 12,
  },
  gradeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  fishTypeResult: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  fishLocalResult: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  confidenceBadgeResult: {
    alignItems: 'center',
  },
  confidenceTextResult: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  gradeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  gradeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  gradeLetter: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  gradeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  gradeInfo: {
    flex: 1,
  },
  gradeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gradeDescription: {
    fontSize: 16,
    color: '#6B7280',
  },
  scoresContainer: {
    marginBottom: 24,
  },
  scoresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  scoreItem: {
    width: (width - 80) / 2,
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  scoreBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 3,
  },
  recommendationsContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#0369A1',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  criteriaContainer: {
    marginBottom: 24,
  },
  criteriaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  criterionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  criterionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 8,
  },
  criterionText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
    lineHeight: 20,
  },
  resultsActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultsSecondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginRight: 12,
  },
  resultsSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
  resultsPrimaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
  },
  resultsPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  historyPreview: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyFishInfo: {
    flex: 1,
  },
  historyFishName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  historyDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  historyGradeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyGrade: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
  },
  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  viewHistoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginRight: 4,
  },
});

export default Quality;