// screens/Quality.tsx  — Fish Classifier (backend pipeline)
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';

import { loadModels, runFishPipeline } from '@/utils/fish_quality_utils/runFishPipeline';
import {
  type PredictionResult,
  SPECIES_THRESHOLD,
  GRADE_THRESHOLD,
} from '@/utils/fish_quality_utils/fishTypes';

// ── Status types ───────────────────────────────────────────────────────────────
type ApiStatus = 'checking' | 'ready' | 'error';

export default function Quality() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Preparing request...');
  const [predError, setPredError] = useState<string | null>(null);

  const [leftImage, setLeftImage] = useState<string | null>(null);
  const [rightImage, setRightImage] = useState<string | null>(null);
  const [leftImageName, setLeftImageName] = useState('Not selected');
  const [rightImageName, setRightImageName] = useState('Not selected');

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showProbabilities, setShowProbabilities] = useState(false);

  // ── Check backend each time screen is focused ──────────────────────────────
  const checkApi = useCallback(async () => {
    setApiStatus('checking');
    setApiError(null);
    try {
      await loadModels();
      setApiStatus('ready');
    } catch (err: any) {
      setApiStatus('error');
      setApiError(err?.message ?? 'Cannot reach classification server');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkApi();
    }, [checkApi])
  );

  // ── Image source helpers ───────────────────────────────────────────────────
  const setImageForSide = (side: 'left' | 'right', uri: string) => {
    const name = uri.split('/').pop() ?? 'Captured';
    if (side === 'left') { setLeftImage(uri); setLeftImageName(name); }
    else                  { setRightImage(uri); setRightImageName(name); }
  };

  const openGallery = async (side: 'left' | 'right') => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
      });
      if (!res.canceled && res.assets.length > 0) {
        setImageForSide(side, res.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  const openCamera = async (side: 'left' | 'right') => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access in your device settings to take photos.',
        );
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
      });
      if (!res.canceled && res.assets.length > 0) {
        setImageForSide(side, res.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const pickImage = (side: 'left' | 'right') => {
    Alert.alert(
      side === 'left' ? 'Left Image' : 'Right Image',
      'Choose image source',
      [
        { text: '📷  Take Photo',     onPress: () => openCamera(side) },
        { text: '🖼  Choose Gallery', onPress: () => openGallery(side) },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  // ── Run prediction ─────────────────────────────────────────────────────────
  const predict = async () => {
    if (!leftImage || !rightImage) {
      Alert.alert('Select Images', 'Please select both left and right images first.');
      return;
    }
    setLoading(true);
    setLoadingMessage('Preparing images...');
    setPredError(null);
    setResult(null);
    try {
      const pred = await runFishPipeline(leftImage, rightImage, {
        onProgress: (message) => setLoadingMessage(message),
      });
      setResult(pred);
    } catch (err: any) {
      setPredError(err?.message ?? 'Prediction failed');
    } finally {
      setLoading(false);
      setLoadingMessage('Preparing request...');
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setLeftImage(null); setRightImage(null);
    setLeftImageName('Not selected'); setRightImageName('Not selected');
    setResult(null); setPredError(null);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const gradeColor = (g?: string) =>
    g === 'A' ? '#27ae60' : g === 'B' ? '#f39c12' : g === 'C' ? '#e74c3c' : '#7f8c8d';

  const apiStatusColor =
    apiStatus === 'ready' ? '#2ecc71' : apiStatus === 'error' ? '#e74c3c' : '#f39c12';

  const apiStatusText =
    apiStatus === 'ready'
      ? '✓ Server connected'
      : apiStatus === 'error'
      ? '✗ Server unreachable'
      : '⟳ Connecting to server…';

  const canPredict = apiStatus === 'ready' && !!leftImage && !!rightImage && !loading;

  // ── Probabilities modal ────────────────────────────────────────────────────
  const ProbModal = () => (
    <Modal visible={showProbabilities} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={s.modalContent}>
          <Text style={s.modalTitle}>All Probabilities</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            <Text style={s.probSection}>STAGE 1 — Fish Detector</Text>
            {result?.allProbabilities &&
              Object.entries(result.allProbabilities.fish).map(([l, p]) => (
                <ProbRow key={l} label={l} value={p} />
              ))}
            {result?.isFish && (
              <>
                <Text style={s.probSection}>STAGE 2 — Species</Text>
                {result?.allProbabilities &&
                  Object.entries(result.allProbabilities.species).map(([l, p]) => (
                    <ProbRow key={l} label={l} value={p} />
                  ))}
                <Text style={s.probSection}>STAGE 3 — Grade</Text>
                {result?.allProbabilities &&
                  Object.entries(result.allProbabilities.grade).map(([l, p]) => (
                    <ProbRow key={l} label={l} value={p} />
                  ))}
              </>
            )}
          </ScrollView>
          <TouchableOpacity style={s.closeBtn} onPress={() => setShowProbabilities(false)}>
            <Text style={s.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Details modal ──────────────────────────────────────────────────────────
  const DetailsModal = () => (
    <Modal visible={showDetails} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={s.modalContent}>
          <Text style={s.modalTitle}>Detailed Results</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {result && (
              <>
                <DetailRow label="Final Result"  value={result.finalLabel ?? result.fishLabel} />
                <DetailRow label="Stage 1 (Fish)" value={`${result.fishLabel} — ${(result.fishConfidence * 100).toFixed(2)}%`} />
                {result.pairValidation && (
                  <>
                    <DetailRow
                      label="Left species validation"
                      value={`${result.pairValidation.leftLabel} — ${(result.pairValidation.leftConfidence * 100).toFixed(2)}%`}
                    />
                    <DetailRow
                      label="Right species validation"
                      value={`${result.pairValidation.rightLabel} — ${(result.pairValidation.rightConfidence * 100).toFixed(2)}%`}
                    />
                  </>
                )}
                {result.isFish && (
                  <>
                    <DetailRow
                      label="Stage 2 (Species)"
                      value={`${result.species} — ${((result.speciesConfidence ?? 0) * 100).toFixed(2)}%`}
                    />
                    <DetailRow
                      label="Stage 3 (Grade)"
                      value={`${result.grade} — ${((result.gradeConfidence ?? 0) * 100).toFixed(2)}%`}
                    />
                  </>
                )}
                <DetailRow label="Status" value={result.isFish ? 'Fish detected ✓' : 'Not fish ✗'} />
              </>
            )}
          </ScrollView>
          <TouchableOpacity style={s.closeBtn} onPress={() => setShowDetails(false)}>
            <Text style={s.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#2c3e50', '#3498db']} style={s.header}>
        <Text style={s.headerTitle}>🐟 Multi-Stage Fish Classifier</Text>
        <View style={s.headerStatus}>
          <View style={[s.statusDot, { backgroundColor: apiStatusColor }]} />
          <Text style={[s.statusText, { color: apiStatusColor }]}>{apiStatusText}</Text>
          {(apiStatus === 'error' || apiStatus === 'checking') && (
            <TouchableOpacity onPress={checkApi} style={s.retryBtn}>
              <MaterialIcons name="refresh" size={14} color="#fff" />
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
        {apiStatus === 'error' && apiError && (
          <Text style={s.apiErrorText}>{apiError}</Text>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={apiStatus === 'checking'} onRefresh={checkApi} />}
      >
        {/* ── Image Selection ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Select Images</Text>
          <View style={s.imageRow}>
            {/* Left */}
            <View style={s.imageSlotWrapper}>
              <TouchableOpacity style={s.imageSlot} onPress={() => pickImage('left')}>
                {leftImage
                  ? <Image source={{ uri: leftImage }} style={s.thumbImage} />
                  : <View style={s.thumbEmpty}>
                      <MaterialIcons name="add-photo-alternate" size={36} color="#95a5a6" />
                      <Text style={s.thumbLabel}>Tap to add</Text>
                    </View>
                }
                <View style={s.imageSlotBadge}>
                  <Text style={s.imageSlotBadgeText}>LEFT</Text>
                </View>
              </TouchableOpacity>
              <View style={s.slotActions}>
                <TouchableOpacity style={s.slotActionBtn} onPress={() => openCamera('left')}>
                  <MaterialIcons name="photo-camera" size={18} color="#3498db" />
                  <Text style={s.slotActionText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.slotActionBtn} onPress={() => openGallery('left')}>
                  <MaterialIcons name="photo-library" size={18} color="#3498db" />
                  <Text style={s.slotActionText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Right */}
            <View style={s.imageSlotWrapper}>
              <TouchableOpacity style={s.imageSlot} onPress={() => pickImage('right')}>
                {rightImage
                  ? <Image source={{ uri: rightImage }} style={s.thumbImage} />
                  : <View style={s.thumbEmpty}>
                      <MaterialIcons name="add-photo-alternate" size={36} color="#95a5a6" />
                      <Text style={s.thumbLabel}>Tap to add</Text>
                    </View>
                }
                <View style={s.imageSlotBadge}>
                  <Text style={s.imageSlotBadgeText}>RIGHT</Text>
                </View>
              </TouchableOpacity>
              <View style={s.slotActions}>
                <TouchableOpacity style={s.slotActionBtn} onPress={() => openCamera('right')}>
                  <MaterialIcons name="photo-camera" size={18} color="#3498db" />
                  <Text style={s.slotActionText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.slotActionBtn} onPress={() => openGallery('right')}>
                  <MaterialIcons name="photo-library" size={18} color="#3498db" />
                  <Text style={s.slotActionText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* File names */}
          <View style={s.fileNames}>
            <Text style={s.fileName} numberOfLines={1}>L: {leftImageName}</Text>
            <Text style={s.fileName} numberOfLines={1}>R: {rightImageName}</Text>
          </View>

          {/* Action row */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.predictBtn, !canPredict && s.predictBtnDisabled]}
              onPress={predict}
              disabled={!canPredict}
            >
              <LinearGradient
                colors={canPredict ? ['#27ae60', '#2ecc71'] : ['#95a5a6', '#7f8c8d']}
                style={s.predictBtnGradient}
              >
                {loading
                  ? <View style={s.loadingContainer}>
                      <ActivityIndicator color="#fff" />
                      <Text style={s.loadingText}>{loadingMessage}</Text>
                    </View>
                  : <Text style={s.predictBtnText}>▶  CLASSIFY FISH</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={s.resetBtn} onPress={reset}>
              <MaterialIcons name="restart-alt" size={20} color="#e74c3c" />
            </TouchableOpacity>
          </View>

          {predError && (
            <View style={s.errorBox}>
              <MaterialIcons name="error-outline" size={16} color="#c0392b" />
              <Text style={s.errorText}>{predError}</Text>
            </View>
          )}
        </View>

        {/* ── Results ── */}
        {result && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Results</Text>

            {/* Fish / Not Fish badge */}
            <View style={s.badgeRow}>
              <View style={[s.badge, result.isFish ? s.badgeGreen : s.badgeRed]}>
                <Text style={s.badgeText}>
                  {result.isFish ? '✓ Fish Detected' : '✗ Not a Fish'}
                </Text>
              </View>
            </View>

            {result.isFish ? (
              <>
                {/* Grade ring + species */}
                <View style={s.resultCenter}>
                  <View style={[s.gradeRing, { borderColor: gradeColor(result.grade) }]}>
                    <Text style={[s.gradeText, { color: gradeColor(result.grade) }]}>
                      {result.grade}
                    </Text>
                  </View>
                  <Text style={s.speciesText}>{result.species}</Text>
                  <Text style={s.finalLabel}>{result.finalLabel}</Text>
                </View>

                {/* Stage breakdown */}
                <View style={s.stages}>
                  <StageRow
                    stage="S1"
                    label={result.fishLabel}
                    confidence={result.fishConfidence}
                    color="#3498db"
                  />
                  <StageRow
                    stage="S2"
                    label={result.species ?? ''}
                    confidence={result.speciesConfidence ?? 0}
                    color="#9b59b6"
                    warn={(result.speciesConfidence ?? 0) < SPECIES_THRESHOLD}
                  />
                  <StageRow
                    stage="S3"
                    label={`Grade ${result.grade}`}
                    confidence={result.gradeConfidence ?? 0}
                    color={gradeColor(result.grade)}
                    warn={(result.gradeConfidence ?? 0) < GRADE_THRESHOLD}
                  />
                </View>

                {/* Low-confidence warnings */}
                {((result.speciesConfidence ?? 1) < SPECIES_THRESHOLD ||
                  (result.gradeConfidence ?? 1) < GRADE_THRESHOLD) && (
                  <View style={s.warnBox}>
                    {(result.speciesConfidence ?? 1) < SPECIES_THRESHOLD && (
                      <Text style={s.warnText}>⚠ Low species confidence — result may be unreliable</Text>
                    )}
                    {(result.gradeConfidence ?? 1) < GRADE_THRESHOLD && (
                      <Text style={s.warnText}>⚠ Low grade confidence — result may be unreliable</Text>
                    )}
                  </View>
                )}
              </>
            ) : (
              <View style={s.notFishBox}>
                <MaterialIcons name="no-photography" size={48} color="#e74c3c" />
                <Text style={s.notFishText}>
                  Not identified as a fish{'\n'}
                  <Text style={s.notFishSub}>
                    (Confidence: {(result.fishConfidence * 100).toFixed(1)}%)
                  </Text>
                </Text>
              </View>
            )}

            {/* Secondary action buttons */}
            <View style={s.secondaryRow}>
              <SecondaryBtn icon="info-outline"  label="Details"       onPress={() => setShowDetails(true)} />
              <SecondaryBtn icon="bar-chart"     label="Probabilities" onPress={() => setShowProbabilities(true)} />
              <SecondaryBtn icon="refresh"       label="Reset"         onPress={reset} color="#e74c3c" />
            </View>
          </View>
        )}

        {/* ── Empty state ── */}
        {!result && !loading && (
          <View style={s.emptyState}>
            <MaterialIcons name="set-meal" size={64} color="#dfe6e9" />
            <Text style={s.emptyText}>Select left + right images{'\n'}then tap CLASSIFY FISH</Text>
          </View>
        )}
      </ScrollView>

      <ProbModal />
      <DetailsModal />
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const StageRow = ({
  stage, label, confidence, color, warn = false,
}: {
  stage: string; label: string; confidence: number; color: string; warn?: boolean;
}) => (
  <View style={s.stageRow}>
    <View style={[s.stageBadge, { backgroundColor: color }]}>
      <Text style={s.stageBadgeText}>{stage}</Text>
    </View>
    <Text style={[s.stageLabel, warn && s.stageLabelWarn]}>{label}</Text>
    <Text style={[s.stageConf, warn && s.stageLabelWarn]}>
      {(confidence * 100).toFixed(1)}%
    </Text>
    {warn && <MaterialIcons name="warning" size={14} color="#f39c12" style={{ marginLeft: 4 }} />}
  </View>
);

const ProbRow = ({ label, value }: { label: string; value: number }) => (
  <View style={s.probRow}>
    <Text style={s.probLabel}>{label}</Text>
    <View style={s.probBarBg}>
      <View style={[s.probBarFill, { width: `${Math.round(value * 100)}%` as any }]} />
    </View>
    <Text style={s.probValue}>{(value * 100).toFixed(2)}%</Text>
  </View>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={s.detailRow}>
    <Text style={s.detailLabel}>{label}</Text>
    <Text style={s.detailValue}>{value}</Text>
  </View>
);

const SecondaryBtn = ({
  icon, label, onPress, color = '#3498db',
}: {
  icon: any; label: string; onPress: () => void; color?: string;
}) => (
  <TouchableOpacity style={s.secondaryBtn} onPress={onPress}>
    <MaterialIcons name={icon} size={22} color={color} />
    <Text style={[s.secondaryBtnText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f0f4f8' },
  header:              { paddingVertical: 14, paddingHorizontal: 18 },
  headerTitle:         { fontSize: 19, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  headerStatus:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6, gap: 6 },
  statusDot:           { width: 8, height: 8, borderRadius: 4 },
  statusText:          { fontSize: 12, fontWeight: '600' },
  retryBtn:            { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
  retryText:           { color: '#fff', fontSize: 11, marginLeft: 2 },
  apiErrorText:        { color: '#ffd0cc', fontSize: 11, textAlign: 'center', marginTop: 4, paddingHorizontal: 10 },

  scrollContent:       { padding: 14, paddingBottom: 30 },

  card:                { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  cardTitle:           { fontSize: 16, fontWeight: '700', color: '#2c3e50', marginBottom: 14 },

  imageRow:            { flexDirection: 'row', gap: 12, marginBottom: 10 },
  imageSlotWrapper:    { flex: 1, gap: 6 },
  imageSlot:           { borderRadius: 10, overflow: 'hidden', position: 'relative', borderWidth: 2, borderColor: '#ecf0f1' },
  slotActions:         { flexDirection: 'row', gap: 6 },
  slotActionBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#d0e8f7', backgroundColor: '#eaf5fd' },
  slotActionText:      { fontSize: 11, color: '#3498db', fontWeight: '600' },
  thumbImage:          { width: '100%', aspectRatio: 1, borderRadius: 8 },
  thumbEmpty:          { width: '100%', aspectRatio: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' },
  thumbLabel:          { fontSize: 11, color: '#95a5a6', marginTop: 4 },
  imageSlotBadge:      { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  imageSlotBadgeText:  { fontSize: 10, color: '#fff', fontWeight: '700' },

  fileNames:           { flexDirection: 'row', gap: 8, marginBottom: 12 },
  fileName:            { flex: 1, fontSize: 11, color: '#7f8c8d' },

  actionRow:           { flexDirection: 'row', alignItems: 'center', gap: 10 },
  predictBtn:          { flex: 1, borderRadius: 10, overflow: 'hidden' },
  predictBtnDisabled:  { opacity: 0.6 },
  predictBtnGradient:  { paddingVertical: 14, alignItems: 'center' },
  loadingContainer:    { alignItems: 'center' },
  loadingText:         { color: '#f5f6fa', fontSize: 11, marginTop: 6, textAlign: 'center' },
  predictBtnText:      { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resetBtn:            { padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#e74c3c' },

  errorBox:            { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fdf0f0', borderRadius: 8, padding: 10, marginTop: 10, gap: 6 },
  errorText:           { flex: 1, color: '#c0392b', fontSize: 13 },

  badgeRow:            { alignItems: 'center', marginBottom: 14 },
  badge:               { paddingHorizontal: 22, paddingVertical: 8, borderRadius: 20 },
  badgeGreen:          { backgroundColor: '#d4efdf' },
  badgeRed:            { backgroundColor: '#fadbd8' },
  badgeText:           { fontWeight: '700', fontSize: 14, color: '#2c3e50' },

  resultCenter:        { alignItems: 'center', marginVertical: 12 },
  gradeRing:           { width: 76, height: 76, borderRadius: 38, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  gradeText:           { fontSize: 34, fontWeight: 'bold' },
  speciesText:         { fontSize: 18, fontWeight: '600', color: '#2c3e50', textTransform: 'capitalize' },
  finalLabel:          { fontSize: 13, color: '#7f8c8d', marginTop: 4 },

  stages:              { gap: 8, marginBottom: 10 },
  stageRow:            { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageBadge:          { width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  stageBadgeText:      { color: '#fff', fontSize: 11, fontWeight: '700' },
  stageLabel:          { flex: 1, fontSize: 14, color: '#2c3e50', textTransform: 'capitalize' },
  stageConf:           { fontSize: 13, fontWeight: '600', color: '#636e72' },
  stageLabelWarn:      { color: '#f39c12' },

  warnBox:             { backgroundColor: '#fef9e7', borderRadius: 8, padding: 10, gap: 4 },
  warnText:            { color: '#d68910', fontSize: 12 },

  notFishBox:          { alignItems: 'center', paddingVertical: 20, gap: 10 },
  notFishText:         { fontSize: 16, color: '#7f8c8d', textAlign: 'center', fontWeight: '600' },
  notFishSub:          { fontSize: 13, fontWeight: '400' },

  secondaryRow:        { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#ecf0f1' },
  secondaryBtn:        { alignItems: 'center', gap: 3 },
  secondaryBtnText:    { fontSize: 11, fontWeight: '600' },

  emptyState:          { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText:           { color: '#b2bec3', textAlign: 'center', fontSize: 14, lineHeight: 22 },

  // Modals
  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  modalContent:        { width: '92%', maxHeight: '82%', backgroundColor: '#fff', borderRadius: 14, padding: 22 },
  modalTitle:          { fontSize: 18, fontWeight: '700', color: '#2c3e50', textAlign: 'center', marginBottom: 16 },

  probSection:         { fontSize: 13, fontWeight: '700', color: '#3498db', marginTop: 12, marginBottom: 6 },
  probRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  probLabel:           { width: 130, fontSize: 13, color: '#636e72', textTransform: 'capitalize' },
  probBarBg:           { flex: 1, height: 6, backgroundColor: '#ecf0f1', borderRadius: 3, overflow: 'hidden' },
  probBarFill:         { height: '100%', backgroundColor: '#3498db', borderRadius: 3 },
  probValue:           { width: 52, fontSize: 12, fontWeight: '600', color: '#2c3e50', textAlign: 'right' },

  detailRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailLabel:         { fontSize: 13, color: '#7f8c8d', flex: 1 },
  detailValue:         { fontSize: 13, fontWeight: '600', color: '#2c3e50', flex: 1, textAlign: 'right' },

  closeBtn:            { backgroundColor: '#3498db', padding: 13, borderRadius: 8, alignItems: 'center', marginTop: 18 },
  closeBtnText:        { color: '#fff', fontWeight: '700', fontSize: 15 },
});

