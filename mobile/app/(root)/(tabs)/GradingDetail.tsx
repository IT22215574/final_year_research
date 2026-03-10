// app/(root)/(tabs)/GradingDetail.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { HEADER_GRADIENT } from '@/constants';
import { useGradingRecordStore } from '@/stores/gradingRecordStore';
import type { GradingRecord } from '@/services/gradingRecordService';

const SERVER_BASE = (process.env.EXPO_PUBLIC_API_KEY ?? '').replace(/\/+$/, '');
const { width: SCREEN_W } = Dimensions.get('window');

const gradeColor = (g?: string | null) => {
  if (g === 'A') return '#27ae60';
  if (g === 'B') return '#f39c12';
  if (g === 'C') return '#e74c3c';
  return '#95a5a6';
};

const gradeLabel = (g?: string | null) => {
  if (g === 'A') return 'Premium Quality';
  if (g === 'B') return 'Standard Quality';
  if (g === 'C') return 'Low Quality';
  return 'Unknown';
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <View style={cb.wrap}>
      <View style={[cb.track]}>
        <View style={[cb.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[cb.label, { color }]}>{pct}%</Text>
    </View>
  );
}
const cb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#ecf0f1' },
  fill: { height: '100%', borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '700', width: 40, textAlign: 'right' },
});

export default function GradingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history, historyLoading, getOne, remove } = useGradingRecordStore();

  const [record, setRecord] = useState<GradingRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    // Try loading from store cache first
    const cached = history.find((h) => h._id === id);
    if (cached) { setRecord(cached); return; }
    // Fetch from API
    setLoading(true);
    getOne(id)
      .then((r) => r && setRecord(r))
      .catch((e) => setError(e?.message ?? 'Failed to load record'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = useCallback(() => {
    if (!record) return;
    Alert.alert(
      'Delete Record?',
      `Delete the grading result for ${record.fishName || record.fishSpecies || 'this fish'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await remove(record._id);
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete record.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [record, remove, router]);

  if (loading || historyLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#27ae60" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !record) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}>
          <MaterialIcons name="error-outline" size={48} color="#e74c3c" />
          <Text style={s.errorMsg}>{error || 'Record not found'}</Text>
          <TouchableOpacity style={s.backBtnAlt} onPress={() => router.back()}>
            <Text style={{ color: '#27ae60', fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = (record.imagePaths ?? []).map((p) => `${SERVER_BASE}${p}`);
  const color = gradeColor(record.predictedGrade);

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {record.fishName || record.fishSpecies || 'Grading Detail'}
        </Text>
        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="delete-outline" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Image gallery */}
        {images.length > 0 ? (
          <View style={s.imageWrap}>
            <Image
              source={{ uri: images[imgIndex] }}
              style={s.mainImg}
              resizeMode="cover"
            />
            {images.length > 1 && (
              <View style={s.thumbRow}>
                {images.map((uri, i) => (
                  <TouchableOpacity key={i} onPress={() => setImgIndex(i)}>
                    <Image
                      source={{ uri }}
                      style={[s.miniThumb, imgIndex === i && s.miniThumbActive]}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={s.noImgBox}>
            <MaterialIcons name="set-meal" size={60} color="#b2bec3" />
            <Text style={{ color: '#b2bec3', marginTop: 6 }}>No image available</Text>
          </View>
        )}

        {/* Grade ring banner */}
        <LinearGradient
          colors={[`${color}22`, `${color}08`]}
          style={s.gradeBanner}
        >
          <View style={[s.gradeRing, { borderColor: color }]}>
            <Text style={[s.gradeRingText, { color }]}>
              {record.predictedGrade || '?'}
            </Text>
          </View>
          <View style={s.gradeInfo}>
            <Text style={[s.gradeLabel, { color }]}>
              {gradeLabel(record.predictedGrade)}
            </Text>
            <Text style={s.gradeSub}>
              {record.fishName
                ? `${record.fishName}${record.fishSpecies ? ` (${record.fishSpecies.replace(/_/g, ' ')})` : ''}`
                : record.fishSpecies?.replace(/_/g, ' ') || 'Unknown species'}
            </Text>
          </View>
        </LinearGradient>

        {/* Confidence section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Confidence Scores</Text>
          <View style={s.confRow}>
            <Text style={s.confLabel}>Grade</Text>
            <ConfidenceBar value={record.gradeConfidence ?? 0} color={color} />
          </View>
          <View style={s.confRow}>
            <Text style={s.confLabel}>Species</Text>
            <ConfidenceBar value={record.speciesConfidence ?? 0} color="#0984e3" />
          </View>
        </View>

        {/* Meta */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Details</Text>
          <InfoRow icon="access-time" label="Recorded" value={formatDate(record.createdAt)} />
          {record.marketStatus && (
            <InfoRow
              icon="storefront"
              label="Market Status"
              value={record.marketStatus === 'used_in_market' ? 'Used in Market' : 'Saved'}
            />
          )}
          {record.notes && <InfoRow icon="notes" label="Notes" value={record.notes} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string }) {
  return (
    <View style={ir.row}>
      <MaterialIcons name={icon} size={18} color="#74b9ff" style={ir.icon} />
      <View style={ir.content}>
        <Text style={ir.label}>{label}</Text>
        <Text style={ir.value}>{value}</Text>
      </View>
    </View>
  );
}
const ir = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  icon: { marginTop: 2 },
  content: { flex: 1 },
  label: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 14, color: '#0f172a', fontWeight: '500', marginTop: 1 },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  errorMsg: { fontSize: 16, color: '#e74c3c', textAlign: 'center' },
  backBtnAlt: { marginTop: 8 },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { padding: 4, marginRight: 10 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  deleteBtn: { padding: 4, marginLeft: 8 },
  scroll: { paddingBottom: 40 },
  imageWrap: {
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
  },
  mainImg: { width: SCREEN_W, height: SCREEN_W * 0.65 },
  thumbRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    backgroundColor: '#0d0d1a',
  },
  miniThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  miniThumbActive: { borderColor: '#27ae60' },
  noImgBox: {
    height: 180,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    margin: 16,
    borderRadius: 16,
    padding: 18,
  },
  gradeRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  gradeRingText: { fontSize: 30, fontWeight: '900' },
  gradeInfo: { flex: 1 },
  gradeLabel: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  gradeSub: { fontSize: 13, color: '#64748b' },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  confRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  confLabel: { width: 60, fontSize: 13, color: '#334155' },
});
