import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { getPredictionApiBaseUrls } from '@/src/config/api';

// ── API helpers (same pattern as predictions.tsx) ─────────────────────────────

const fetchJsonWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(json?.message ?? `HTTP ${res.status}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
};

async function predictionRequest<T>(path: string, timeoutMs = 8000): Promise<T> {
  const baseUrls = getPredictionApiBaseUrls();
  let lastError: unknown;
  for (const baseUrl of baseUrls) {
    const url = `${String(baseUrl).replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      return (await fetchJsonWithTimeout(url, {}, timeoutMs)) as T;
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err || '');
      const isNetwork = err?.name === 'AbortError' || err instanceof TypeError ||
        /Network request failed|Failed to fetch|network/i.test(msg);
      if (!isNetwork) throw err;
    }
  }
  throw new Error(`Network error. Tried: ${getPredictionApiBaseUrls().join(', ')}. Last: ${String((lastError as any)?.message ?? lastError ?? '')}`);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarketAlert {
  type: string;
  icon: string;
  color: string;
  title: string;
  description: string;
  age: string;
}

// Group-label ordering
const AGE_ORDER = ['Today', 'Tomorrow', 'This week', 'Forecast', 'Next 3 days'];

export default function MarketAlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setError(null);
      const data = await predictionRequest<{ alerts: MarketAlert[] }>('/alerts');
      setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAlerts();
  }, [loadAlerts]);

  // Group by `age` label, preserving a sensible order
  const grouped = alerts.reduce((acc, alert) => {
    const key = alert.age || 'Today';
    if (!acc[key]) acc[key] = [];
    acc[key].push(alert);
    return acc;
  }, {} as Record<string, MarketAlert[]>);

  const groupKeys = [
    ...AGE_ORDER.filter(k => grouped[k]),
    ...Object.keys(grouped).filter(k => !AGE_ORDER.includes(k)),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={20} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Market Alerts</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading market alerts…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color="#9ca3af" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAlerts}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} tintColor="#3b82f6" />
          }
        >
          {groupKeys.map(groupKey => (
            <View key={groupKey} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{groupKey}</Text>
              <View style={styles.alertsContainer}>
                {grouped[groupKey].map((alert, idx) => (
                  <View
                    key={`${groupKey}-${idx}`}
                    style={[
                      styles.alertItem,
                      idx === grouped[groupKey].length - 1 && styles.alertItemLast,
                    ]}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: alert.color }]}>
                      <Ionicons name={alert.icon as any} size={20} color="#fff" />
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      {!!alert.description && (
                        <Text style={styles.alertDescription}>{alert.description}</Text>
                      )}
                      <View style={[styles.typeBadge, { backgroundColor: alert.color + '22' }]}>
                        <Text style={[styles.typeBadgeText, { color: alert.color }]}>
                          {alert.type?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {groupKeys.length === 0 && (
            <View style={styles.centered}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#10b981" />
              <Text style={styles.emptyText}>No alerts right now. Market is calm.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 12,
    marginLeft: 4,
  },
  alertsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  alertItemLast: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 24,
    marginRight: 14,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 8,
    lineHeight: 18,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});