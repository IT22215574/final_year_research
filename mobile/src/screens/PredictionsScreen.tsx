import React from 'react';
import { FC, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { api } from '../api/client';
import { ModelPrediction, ModelStatus } from '../types';

const FISH_OPTIONS = ['කෙලවල්ලා', 'බාලයා', 'තලපත්', 'තෝරා'];

export const PredictionsScreen: FC = () => {
  const [predictions, setPredictions] = useState<ModelPrediction[]>([]);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [selectedFish, setSelectedFish] = useState<string>(FISH_OPTIONS[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModelData();
  }, [selectedFish]);

  const loadModelData = async () => {
    setLoading(true);
    try {
      const [predsData, statusData] = await Promise.all([
        api.getModelPredictions(selectedFish, 7),
        api.getModelStatus()
      ]);
      setPredictions(predsData.predictions || []);
      setModelStatus(statusData);
    } catch (error) {
      console.error('Error loading model data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>මිල අනාවැකි</Text>
        <Text style={styles.subtitle}>7-දින මිල පුරෝකථනය</Text>
      </View>

      {modelStatus && (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Model Status</Text>
          <Text style={styles.statusText}>Trained: {modelStatus.trained ? '✅' : '❌'}</Text>
          <Text style={styles.statusText}>MAE: {modelStatus.mae?.toFixed(2) || 'N/A'}</Text>
          <Text style={styles.statusText}>R² Score: {modelStatus.r2_score?.toFixed(3) || 'N/A'}</Text>
          <Text style={styles.statusText}>Records: {modelStatus.total_records || 0}</Text>
        </View>
      )}

      <View style={styles.fishSelector}>
        <Text style={styles.sectionTitle}>මාළු තෝරන්න</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FISH_OPTIONS.map((fish) => (
            <TouchableOpacity
              key={fish}
              style={[styles.fishButton, selectedFish === fish && styles.fishButtonActive]}
              onPress={() => setSelectedFish(fish)}
            >
              <Text style={[styles.fishButtonText, selectedFish === fish && styles.fishButtonTextActive]}>
                {fish}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>අනාවැකි</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" />
        ) : predictions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>මිල අනාවැකි නැත</Text>
          </View>
        ) : (
          predictions.map((pred, index) => (
            <View key={index} style={styles.predictionCard}>
              <View style={styles.predictionHeader}>
                <Text style={styles.predictionDate}>{new Date(pred.date).toLocaleDateString('si-LK')}</Text>
                <Text style={styles.predictionModel}>{pred.model_type}</Text>
              </View>
              <Text style={styles.predictionPrice}>රු. {pred.predicted_price.toFixed(2)}</Text>
              <Text style={styles.predictionFish}>{pred.fish_name}</Text>
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
    backgroundColor: '#f3f4f6',
  },
  header: {
    padding: 16,
    backgroundColor: '#1e40af',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#bfdbfe',
    marginTop: 4,
  },
  statusCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
  },
  statusText: {
    fontSize: 14,
    color: '#4b5563',
    marginVertical: 2,
  },
  fishSelector: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  fishButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  fishButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  fishButtonText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  fishButtonTextActive: {
    color: '#fff',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2937',
  },
  predictionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  predictionDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  predictionModel: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  predictionPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#059669',
    marginVertical: 4,
  },
  predictionFish: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '500',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
