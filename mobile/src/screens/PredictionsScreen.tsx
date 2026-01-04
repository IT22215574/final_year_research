import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export const PredictionsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Future Predictions</Text>
        <Text style={styles.subtitle}>7-day price forecast</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Predictions</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading predictions...</Text>
        </View>
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2937',
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
