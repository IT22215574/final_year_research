import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { fetchPricePredict } from '../api/client';
import { PredictionData } from '../types';

const PredictionsScreen = () => {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const data = await fetchPricePredict();
      setPredictions(data);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPredictions();
    setRefreshing(false);
  };

  const getChartData = () => {
    if (predictions.length === 0) return null;
    
    const labels = predictions.slice(0, 7).map((p: PredictionData, i: number) => `දින ${i + 1}`);
    const prices = predictions.slice(0, 7).map((p: PredictionData) => p.predicted_price || 0);
    
    return {
      labels,
      datasets: [
        {
          data: prices,
          color: (opacity = 1) => `rgba(46, 134, 171, ${opacity})`,
        },
      ],
    };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E86AB" />
        <Text style={styles.loadingText}>පුරෝකථන පූරණය කරන්න...</Text>
      </View>
    );
  }

  const chartData = getChartData();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.titleCard}>
        <Text style={styles.title}>මිල පුරෝකථන</Text>
        <Text style={styles.subtitle}>
          ඉතිරි ඉතිරි දින සඳහා පුරෝකථනය
        </Text>
      </View>

      {chartData && (
        <View style={styles.chartCard}>
          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              color: (opacity = 1) => `rgba(46, 134, 171, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
              style: { borderRadius: 12 },
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: '#2E86AB',
              },
            }}
            bezier
            style={{ borderRadius: 12 }}
          />
        </View>
      )}

      <View style={styles.listCard}>
        <Text style={styles.listTitle}>සිදු පුරෝකථන</Text>
        {predictions.length === 0 ? (
          <Text style={styles.emptyText}>පුරෝකථනයක් නොමැත</Text>
        ) : (
          predictions.map((prediction: PredictionData, index: number) => (
            <View key={index} style={styles.predictionItem}>
              <View style={styles.predictionHeader}>
                <Text style={styles.fishName}>
                  {prediction.fish_name || `ඉතිරි ${index + 1}`}
                </Text>
                <Text style={styles.date}>
                  {prediction.date || new Date().toLocaleDateString('si-LK')}
                </Text>
              </View>
              <View style={styles.predictionDetails}>
                <View>
                  <Text style={styles.label}>පුරෝකථන මිල:</Text>
                  <Text style={styles.price}>
                    Rs. {prediction.predicted_price?.toFixed(2) || 'N/A'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.label}>නිශ්චිතතාවය:</Text>
                  <Text style={styles.confidence}>
                    {(prediction.confidence * 100)?.toFixed(2) || 'N/A'}%
                  </Text>
                </View>
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
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listCard: {
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
  listTitle: {
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
  predictionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingVertical: 12,
  },
  predictionHeader: {
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
  date: {
    fontSize: 12,
    color: '#999',
  },
  predictionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  confidence: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E86AB',
  },
});

export default PredictionsScreen;
