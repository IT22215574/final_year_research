import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { fetchModelMetrics, fetchPricePredict } from '../api/client';
import { ModelMetrics, PredictionData } from '../types';

const HomeScreen = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [latestPrediction, setLatestPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsData, predictionsData] = await Promise.all([
        fetchModelMetrics(),
        fetchPricePredict(),
      ]);
      setMetrics(metricsData);
      if (predictionsData && predictionsData.length > 0) {
        setLatestPrediction(predictionsData[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E86AB" />
        <Text style={styles.loadingText}>දත්ත පූරණය කරන්න...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>මෙහෙයුම් ස්ථితිය</Text>
        <Text style={styles.headerSubtitle}>
          {new Date().toLocaleDateString('si-LK')}
        </Text>
      </View>

      {latestPrediction && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>නවතම පුරෝකථනය</Text>
          <View style={styles.cardContent}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>ඉතිරි නාම:</Text>
              <Text style={styles.statValue}>
                {latestPrediction.fish_name || 'N/A'}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>පුරෝකථන මිල:</Text>
              <Text style={styles.statValueHighlight}>
                Rs. {latestPrediction.predicted_price?.toFixed(2) || 'N/A'}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>නිශ්චිතता:</Text>
              <Text style={styles.statValue}>
                {(latestPrediction.confidence * 100)?.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {metrics && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ප්‍රමාණ</Text>
          <View style={styles.cardContent}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>නිරවද්‍යතා:</Text>
              <Text style={styles.statValue}>
                {(metrics.accuracy * 100)?.toFixed(2)}%
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>MSE:</Text>
              <Text style={styles.statValue}>
                {metrics.mse?.toFixed(4) || 'N/A'}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>RMSE:</Text>
              <Text style={styles.statValue}>
                {metrics.rmse?.toFixed(4) || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ගැයුම් ඉඟි</Text>
        <Text style={styles.infoText}>
          ✓ නිතිපතා දත්ත ඉතාවුවා කරන්න{'\n'}✓ පුරෝකථන ඉතිහාසය පරීක්ෂා කරන්න{'\n'}✓ කාලගුණ තොරතුරු සොයා බලන්න
        </Text>
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
  headerCard: {
    backgroundColor: '#2E86AB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E8F1F5',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E86AB',
    marginBottom: 12,
  },
  cardContent: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  statValueHighlight: {
    fontSize: 16,
    color: '#27AE60',
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#E8F1F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2E86AB',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E86AB',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default HomeScreen;
