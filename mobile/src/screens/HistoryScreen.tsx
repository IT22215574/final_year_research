import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { fetchHistoricalPrices } from '../api/client';
import { HistoryData } from '../types';

const HistoryScreen = () => {
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await fetchHistoricalPrices();
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const calculateStats = () => {
    if (history.length === 0) return null;
    const prices = history.map((h: HistoryData) => h.actual_price || 0);
    const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    return { avg, max, min };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E86AB" />
        <Text style={styles.loadingText}>ඉතිහාසය පූරණය කරන්න...</Text>
      </View>
    );
  }

  const stats = calculateStats();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.titleCard}>
        <Text style={styles.title}>මිල ඉතිහාසය</Text>
        <Text style={styles.subtitle}>
          පැවතුන දිනවල ඉතිරි මිල
        </Text>
      </View>

      {stats && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>සාමාන්‍ය මිල</Text>
            <Text style={styles.statValue}>Rs. {stats.avg.toFixed(2)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>උচ්චතම මිල</Text>
            <Text style={styles.statValue}>Rs. {stats.max.toFixed(2)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>අවම මිල</Text>
            <Text style={styles.statValue}>Rs. {stats.min.toFixed(2)}</Text>
          </View>
        </View>
      )}

      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>විස්තරිත ඉතිහාසය</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>ඉතිහාසයක් නොමැත</Text>
        ) : (
          history.map((item: HistoryData, index: number) => (
            <View
              key={index}
              style={[
                styles.historyItem,
                index === history.length - 1 && styles.lastItem,
              ]}
            >
              <View style={styles.historyHeader}>
                <Text style={styles.fishName}>
                  {item.fish_name || `ඉතිරි ${index + 1}`}
                </Text>
                <Text style={styles.historyDate}>
                  {item.date || new Date().toLocaleDateString('si-LK')}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>සත්‍ය මිල</Text>
                  <Text style={styles.actualPrice}>
                    Rs. {typeof item.actual_price === 'number' ? item.actual_price.toFixed(2) : 'N/A'}
                  </Text>
                </View>
                {item.predicted_price && (
                  <View>
                    <Text style={styles.priceLabel}>පුරෝකථන</Text>
                    <Text style={styles.predictedPrice}>
                      Rs. {item.predicted_price.toFixed(2)}
                    </Text>
                  </View>
                )}
                {item.accuracy && (
                  <View>
                    <Text style={styles.priceLabel}>නිරවද්‍යතා</Text>
                    <Text style={styles.accuracy}>
                      {(item.accuracy * 100).toFixed(2)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  titleCard: {
    backgroundColor: '#2E86AB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#E8F1F5',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E86AB',
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E86AB',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingVertical: 12,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fishName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  priceLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  actualPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  predictedPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E67E22',
  },
  accuracy: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27AE60',
  },
});

export default HistoryScreen;
