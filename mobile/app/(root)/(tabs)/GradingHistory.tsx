// app/(root)/(tabs)/GradingHistory.tsx
import React, { useCallback, useEffect, useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { FlashList } from '@shopify/flash-list';

const SERVER_BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

// Memoized grade color function
const gradeColor = (g?: string | null) => {
  switch(g) {
    case 'A': return '#27ae60';
    case 'B': return '#f39c12';
    case 'C': return '#e74c3c';
    default: return '#95a5a6';
  }
};

// Memoized date formatter
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

// Memoized list item component
const HistoryItem = memo(({ 
  item, 
  onPress, 
  onDelete,
  isDeleting 
}: { 
  item: GradingRecord; 
  onPress: (id: string) => void;
  onDelete: (record: GradingRecord) => void;
  isDeleting: boolean;
}) => {
  const thumb = item.imagePaths?.[0]
    ? { uri: `${SERVER_BASE}${item.imagePaths[0]}` }
    : null;
  const color = gradeColor(item.predictedGrade);
  const date = formatDate(item.createdAt);
  const time = formatTime(item.createdAt);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => onPress(item._id)}
    >
      {/* Thumbnail with loading state */}
      <View style={styles.thumb}>
        {thumb ? (
          <Image 
            source={thumb} 
            style={styles.thumbImg} 
            resizeMode="cover"
            fadeDuration={200}
          />
        ) : (
          <View style={styles.thumbEmpty}>
            <MaterialIcons name="image-not-supported" size={24} color="#b2bec3" />
          </View>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.info}>
        <Text style={styles.fishName} numberOfLines={1}>
          {item.fishName || item.fishSpecies?.replace(/_/g, ' ') || 'Unknown Fish'}
        </Text>
        <View style={styles.dateContainer}>
          <MaterialIcons name="calendar-today" size={12} color="#94a3b8" />
          <Text style={styles.dateText}>{date}</Text>
          <View style={styles.timeDot} />
          <MaterialIcons name="access-time" size={12} color="#94a3b8" />
          <Text style={styles.dateText}>{time}</Text>
        </View>
        {item.notes ? (
          <View style={styles.noteContainer}>
            <MaterialIcons name="notes" size={12} color="#64748b" />
            <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text>
          </View>
        ) : null}
      </View>

      {/* Grade badge */}
      <View style={[styles.gradeBadge, { backgroundColor: `${color}15` }]}>
        <Text style={[styles.gradeText, { color }]}>
          {item.predictedGrade || '?'}
        </Text>
      </View>

      {/* Delete button */}
      <TouchableOpacity
        onPress={() => onDelete(item)}
        style={styles.deleteBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
});

HistoryItem.displayName = 'HistoryItem';

// Empty State Component
const EmptyState = memo(() => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <MaterialIcons name="history" size={48} color="#94a3b8" />
    </View>
    <Text style={styles.emptyText}>No grading history yet</Text>
    <Text style={styles.emptySub}>
      Grade your first fish and save the result to see it here
    </Text>
  </View>
));

EmptyState.displayName = 'EmptyState';

export default function GradingHistory() {
  const router = useRouter();
  const { history, historyLoading, historyError, loadHistory, remove } = useGradingRecordStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const handlePress = useCallback((id: string) => {
    router.push({ pathname: '/GradingDetail', params: { id } });
  }, [router]);

  const confirmDelete = useCallback((record: GradingRecord) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to delete the grading result for ${record.fishName || record.fishSpecies || 'this fish'}?`,
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
              Alert.alert('Error', 'Failed to delete record. Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  }, [remove]);

  const renderItem = useCallback(({ item }: { item: GradingRecord }) => (
    <HistoryItem
      item={item}
      onPress={handlePress}
      onDelete={confirmDelete}
      isDeleting={deletingId === item._id}
    />
  ), [handlePress, confirmDelete, deletingId]);

  const keyExtractor = useCallback((item: GradingRecord) => item._id, []);

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      {/* Header with proper content - matching Quality.tsx pattern */}
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
       
      </LinearGradient>

      {historyError && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={16} color="#c0392b" />
          <Text style={styles.errorText}>{historyError}</Text>
        </View>
      )}

      <FlashList
        data={history}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing || historyLoading} 
            onRefresh={onRefresh}
            colors={['#27ae60']}
            tintColor="#27ae60"
          />
        }
        ListEmptyComponent={!historyLoading ? <EmptyState /> : null}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={100}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#fff',
    letterSpacing: 0.5,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 8,
  },
  errorText: { 
    color: '#c0392b', 
    fontSize: 13, 
    flex: 1,
  },
  list: { 
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: '#f1f5f9',
  },
  thumbImg: { 
    width: '100%', 
    height: '100%' 
  },
  thumbEmpty: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { 
    flex: 1,
    gap: 4,
  },
  fishName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#0f172a',
    marginBottom: 2,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: { 
    fontSize: 11, 
    color: '#94a3b8',
    marginRight: 4,
  },
  timeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#94a3b8',
    marginHorizontal: 4,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  notes: { 
    fontSize: 11, 
    color: '#64748b',
    flex: 1,
  },
  gradeBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  gradeText: { 
    fontSize: 20, 
    fontWeight: '800',
  },
  deleteBtn: { 
    padding: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#334155',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
});