// app/(root)/(tabs)/GradingHistory.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HEADER_GRADIENT } from '@/constants';
import { useGradingRecordStore } from '@/stores/gradingRecordStore';
import type { GradingRecord } from '@/services/gradingRecordService';

const SERVER_BASE = (process.env.EXPO_PUBLIC_API_KEY ?? '').replace(/\/+$/, '');

const gradeColor = (g?: string | null) => {
  if (g === 'A') return '#27ae60';
  if (g === 'B') return '#f39c12';
  if (g === 'C') return '#e74c3c';
  return '#95a5a6';
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) + '  ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function GradingHistory() {
  const router = useRouter();
  const { history, historyLoading, historyError, loadHistory, remove } =
    useGradingRecordStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(() => loadHistory(), [loadHistory]);

  const confirmDelete = (record: GradingRecord) => {
    Alert.alert(
      'Delete Record?',
      `Delete the grading result for ${record.fishName || record.fishSpecies || 'this fish'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(record._id);
            try {
              await remove(record._id);
            } catch {
              Alert.alert('Error', 'Failed to delete record.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: GradingRecord }) => {
    const thumb = item.imagePaths?.[0]
      ? { uri: `${SERVER_BASE}${item.imagePaths[0]}` }
      : null;
    const isDeleting = deletingId === item._id;

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/GradingDetail', params: { id: item._id } })}
      >
        {/* Thumbnail */}
        <View style={s.thumb}>
          {thumb ? (
            <Image source={thumb} style={s.thumbImg} resizeMode="cover" />
          ) : (
            <View style={s.thumbEmpty}>
              <MaterialIcons name="set-meal" size={28} color="#b2bec3" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={s.info}>
          <Text style={s.fishName} numberOfLines={1}>
            {item.fishName || item.fishSpecies || 'Unknown Fish'}
          </Text>
          <Text style={s.dateText}>{formatDate(item.createdAt)}</Text>
          {item.notes ? (
            <Text style={s.notes} numberOfLines={1}>{item.notes}</Text>
          ) : null}
        </View>

        {/* Grade badge */}
        <View style={[s.gradeBadge, { borderColor: gradeColor(item.predictedGrade) }]}>
          <Text style={[s.gradeText, { color: gradeColor(item.predictedGrade) }]}>
            {item.predictedGrade || '?'}
          </Text>
        </View>

        {/* Delete */}
        <TouchableOpacity
          onPress={() => confirmDelete(item)}
          style={s.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#e74c3c" />
          ) : (
            <MaterialIcons name="delete-outline" size={20} color="#e74c3c" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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
        <Text style={s.headerTitle}>Grading History</Text>
      </LinearGradient>

      {historyError && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>{historyError}</Text>
        </View>
      )}

      <FlatList
        data={history}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={[s.list, history.length === 0 && s.listEmpty]}
        refreshControl={
          <RefreshControl refreshing={historyLoading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          historyLoading ? null : (
            <View style={s.emptyState}>
              <MaterialIcons name="history" size={60} color="#dfe6e9" />
              <Text style={s.emptyText}>No saved grading results yet.</Text>
              <Text style={s.emptySub}>
                Grade a fish and tap "Save Result" to record it here.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  errorBanner: {
    backgroundColor: '#fdf0f0',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5c6c6',
  },
  errorText: { color: '#c0392b', fontSize: 13, textAlign: 'center' },
  list: { padding: 16, gap: 10 },
  listEmpty: { flex: 1, justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: '#f8f9fa',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbEmpty: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  fishName: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  dateText: { fontSize: 11, color: '#94a3b8' },
  notes: { fontSize: 11, color: '#64748b', marginTop: 2, fontStyle: 'italic' },
  gradeBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  gradeText: { fontSize: 18, fontWeight: '800' },
  deleteBtn: { padding: 4, flexShrink: 0 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 60,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#b2bec3' },
  emptySub: {
    fontSize: 13,
    color: '#b2bec3',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
  },
});
