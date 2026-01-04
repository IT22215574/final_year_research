import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';

interface Price {
  fish_name: string;
  price: number;
  port: string;
  date: string;
}

export const HomeScreen = () => {
  const [prices, setPrices] = React.useState<Price[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // TODO: Fetch data from API
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading prices...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fish Price Predictions</Text>
        <Text style={styles.subtitle}>Real-time market data for Sri Lanka</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Prices</Text>
        {prices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No data available</Text>
          </View>
        ) : (
          prices.map((item, index) => (
            <View key={index} style={styles.priceCard}>
              <Text style={styles.fishName}>{item.fish_name}</Text>
              <Text style={styles.price}>Rs. {item.price}</Text>
              <Text style={styles.port}>{item.port}</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 16,
    backgroundColor: '#3b82f6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#dbeafe',
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
  priceCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  fishName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 4,
  },
  port: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
