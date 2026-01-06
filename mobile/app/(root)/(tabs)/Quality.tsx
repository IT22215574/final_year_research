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
  const [fishType, setFishType] = useState('');
  const [capturedImages, setCapturedImages] = useState({
    side1: null,
    side2: null
  });
  const [gradingResult, setGradingResult] = useState(null);
  const [isGrading, setIsGrading] = useState(false);
  const [step, setStep] = useState(1);
  const [activeSide, setActiveSide] = useState('side1');
  const cameraRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const getGradeColor = (gradeText: string) => {
    const letter = String(gradeText || '').trim().split(' ')[1] || String(gradeText || '').trim();
    if (letter === 'A') return ['#10B981', '#34D399'];
    if (letter === 'B') return ['#F59E0B', '#FBBF24'];
    if (letter === 'C') return ['#EF4444', '#F87171'];
    return ['#0066CC', '#00A3FF'];
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
          quality: 0.9,
          base64: true,
          exif: true
        });
        
        setCapturedImages(prev => ({
          ...prev,
          [side]: photo.uri
        }));
        
        Alert.alert(
          'Success!',
          'Image captured successfully!',
          [{ text: 'OK' }]
        );
      } catch (error) {
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  const handleBackToSelection = () => {
    setFishType('');
    setCapturedImages({ side1: null, side2: null });
    setGradingResult(null);
    setStep(1);
  };

  const handleGradeFish = async () => {
    if (!capturedImages.side1 || !capturedImages.side2) {
      Alert.alert('Incomplete', 'Please capture both sides to continue');
      return;
    }

    setIsGrading(true);

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1200));

      const predictedSpeciesRaw = fishType || 'Tuna';
      const predictedSpecies =
        predictedSpeciesRaw?.toLowerCase?.() === 'makerel'
          ? 'Mackerel'
          : predictedSpeciesRaw;

      const predictedGradeLetter = 'B';
      const gradeConfidence = 0.86;
      const speciesConfidence = 0.91;

      setFishType(predictedSpecies);

      const result = {
        grade: `Grade ${predictedGradeLetter}`,
        confidence: Math.round(gradeConfidence * 100),
        details: {
          freshness: Math.round(92),
          color: Math.round(78),
          texture: Math.round(85),
          appearance: Math.round(80)
        },
        recommendations:
          predictedGradeLetter === 'A'
            ? ['Excellent quality - Premium grade', 'Ideal for export markets', 'Maintain at 0-2°C']
            : predictedGradeLetter === 'B'
              ? ['Good quality - Market grade', 'Sell within 24 hours', 'Keep chilled at 0-2°C']
              : ['Average quality - Local sale', 'Sell quickly', 'Monitor temperature closely'],
      };

      setGradingResult(result);
      setStep(2);
    } catch (error) {
      Alert.alert('Analysis Failed', 'Unable to grade fish at this time');
    } finally {
      setIsGrading(false);
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
            <Text style={styles.cameraTitle}>Capture {activeSide === 'side1' ? 'Side 1' : 'Side 2'}</Text>
            <View style={{ width: 44 }} />
          </LinearGradient>

          <View style={styles.captureGuide}>
            <View style={styles.guideFrame}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'transparent']}
                style={styles.guideGradient}
              />
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
            <View style={styles.sideSelector}>
              <TouchableOpacity
                style={[styles.sideButton, activeSide === 'side1' && styles.activeSideButton]}
                onPress={() => setActiveSide('side1')}
              >
                <MaterialIcons 
                  name="photo-camera" 
                  size={20} 
                  color={activeSide === 'side1' ? '#0066CC' : 'rgba(255,255,255,0.7)'} 
                />
                <Text style={[styles.sideButtonText, activeSide === 'side1' && styles.activeSideButtonText]}>
                  Side 1
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sideButton, activeSide === 'side2' && styles.activeSideButton]}
                onPress={() => setActiveSide('side2')}
              >
                <MaterialIcons 
                  name="photo-camera" 
                  size={20} 
                  color={activeSide === 'side2' ? '#0066CC' : 'rgba(255,255,255,0.7)'} 
                />
                <Text style={[styles.sideButtonText, activeSide === 'side2' && styles.activeSideButtonText]}>
                  Side 2
                </Text>
              </TouchableOpacity>
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
                    <MaterialIcons name="camera-alt" size={24} color="#0066CC" />
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
          </LinearGradient>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066CC" />
      
      {/* Animated Header */}
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
              <Text style={styles.stepLabel}>Results</Text>
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
          {/* Step 1: Capture */}
          {step === 1 && (
            <>
              <View style={styles.welcomeCard}>
                <Text style={styles.welcomeTitle}>Capture Fish Images</Text>
                <Text style={styles.welcomeText}>
                  Take clear photos of both sides for accurate AI quality analysis
                </Text>
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
                          <Text style={styles.cardTitle}>
                            {index === 0 ? 'Side 1' : 'Side 2'}
                          </Text>
                        </View>
                        {capturedImages[side] && (
                          <View style={styles.statusBadge}>
                            <MaterialIcons name="check-circle" size={14} color="#10B981" />
                            <Text style={styles.statusText}>Captured</Text>
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
                            <Text style={styles.captureButtonText}>Tap to Capture</Text>
                            <Text style={styles.captureSubtext}>or choose from gallery</Text>
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

              <View style={styles.tipsCard}>
                <View style={styles.tipsHeader}>
                  <MaterialIcons name="lightbulb" size={22} color="#F59E0B" />
                  <Text style={styles.tipsTitle}>Capture Tips</Text>
                </View>
                <View style={styles.tipsGrid}>
                  <View style={styles.tipItem}>
                    <View style={styles.tipIcon}>
                      <MaterialIcons name="wb-sunny" size={14} color="#FFFFFF" />
                    </View>
                    <Text style={styles.tipText}>Good Lighting</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <View style={styles.tipIcon}>
                      <MaterialIcons name="crop-free" size={14} color="#FFFFFF" />
                    </View>
                    <Text style={styles.tipText}>Full View</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <View style={styles.tipIcon}>
                      <MaterialIcons name="visibility" size={14} color="#FFFFFF" />
                    </View>
                    <Text style={styles.tipText}>Clear Focus</Text>
                  </View>
                  <View style={styles.tipItem}>
                    <View style={styles.tipIcon}>
                      <MaterialIcons name="straighten" size={14} color="#FFFFFF" />
                    </View>
                    <Text style={styles.tipText}>Proper Angle</Text>
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
                    <ActivityIndicator color="#fff" size="small" />
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
                <Text style={styles.resultsTitle}>Quality Analysis</Text>
                <Text style={styles.resultsSubtitle}>AI-powered assessment results</Text>
              </View>

              <View style={styles.resultCard}>
                <LinearGradient
                  colors={['#FFFFFF', '#F8FAFC']}
                  style={styles.resultCardGradient}
                >
                  <View style={styles.resultHeader}>
                    <View style={styles.resultTitleContainer}>
                      <Text style={styles.fishName}>{fishType || 'Fish'}</Text>
                      <View style={styles.resultTimeContainer}>
                        <MaterialIcons name="schedule" size={12} color="#94A3B8" />
                        <Text style={styles.resultTime}>Analyzed just now</Text>
                      </View>
                    </View>
                    <LinearGradient
                      colors={['#10B981', '#34D399']}
                      style={styles.confidenceBadge}
                    >
                      <MaterialIcons name="verified" size={14} color="white" />
                      <Text style={styles.confidenceText}>{gradingResult.confidence}% Confidence</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.gradeSection}>
                    <View style={styles.gradeCircleContainer}>
                      <LinearGradient
                        colors={getGradeColor(gradingResult.grade)}
                        style={styles.gradeCircle}
                      >
                        <Text style={styles.gradeLetter}>{gradingResult.grade.split(' ')[1]}</Text>
                        <Text style={styles.gradeLabel}>Grade</Text>
                      </LinearGradient>
                    </View>
                    
                    <View style={styles.gradeInfo}>
                      <Text style={[
                        styles.gradeTitle,
                        { color: getGradeColor(gradingResult.grade)[0] }
                      ]}>
                        {gradingResult.grade}
                      </Text>
                      <Text style={styles.gradeDescription}>
                        Overall Quality Assessment
                      </Text>
                      <View style={styles.gradeTags}>
                        <View style={styles.gradeTag}>
                          <Text style={styles.gradeTagText}>
                            {gradingResult.grade === 'Grade A' ? 'Premium' : 
                             gradingResult.grade === 'Grade B' ? 'Market' : 'Standard'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.metricsSection}>
                    <Text style={styles.metricsTitle}>Quality Metrics</Text>
                    <View style={styles.metricsGrid}>
                      {Object.entries(gradingResult.details).map(([key, value]) => (
                        <View key={key} style={styles.metricItem}>
                          <View style={styles.metricHeader}>
                            <Text style={styles.metricLabel}>
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </Text>
                            <Text style={styles.metricValue}>{value}%</Text>
                          </View>
                          <View style={styles.progressBar}>
                            <LinearGradient
                              colors={value > 85 ? ['#10B981', '#34D399'] : 
                                     value > 70 ? ['#F59E0B', '#FBBF24'] : 
                                     ['#EF4444', '#F87171']}
                              style={[styles.progressFill, { width: `${value}%` }]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

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

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.shareButton}
                  onPress={() => Alert.alert('Share', 'Share functionality would go here')}
                >
                  <MaterialIcons name="share" size={20} color="#0066CC" />
                  <Text style={styles.shareButtonText}>Share Report</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
    letterSpacing: -0.5,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  connectorLine: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
  tipsCard: {
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
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tipText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
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
  fishName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  resultTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
    marginBottom: 12,
  },
  gradeTags: {
    flexDirection: 'row',
  },
  gradeTag: {
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  gradeTagText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '600',
  },
  metricsSection: {
    marginBottom: 24,
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 20,
  },
  metricsGrid: {
    gap: 20,
  },
  metricItem: {
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
  shareButton: {
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
  shareButtonText: {
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
    letterSpacing: -0.5,
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
    overflow: 'hidden',
  },
  guideGradient: {
    ...StyleSheet.absoluteFillObject,
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
  sideSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 28,
    padding: 6,
    marginBottom: 40,
  },
  sideButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 22,
    gap: 8,
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
  captureButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
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
});

export default Quality;