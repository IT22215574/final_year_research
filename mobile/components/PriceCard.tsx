import { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PriceCardProps {
  fishName: string;
  price: number;
  port: string;
  change?: number;
}

export const PriceCard: FC<PriceCardProps> = ({ fishName, price, port, change }) => {
  const isPositive = change && change > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.fishName}>{fishName}</Text>
        <Text style={styles.port}>{port}</Text>
      </View>
      <View style={styles.priceSection}>
        <Text style={styles.price}>Rs. {price.toFixed(2)}</Text>
        {change !== undefined && (
          <Text style={[styles.change, isPositive ? styles.positive : styles.negative]}>
            {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    marginBottom: 8,
  },
  fishName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  port: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  change: {
    fontSize: 14,
    fontWeight: '600',
  },
  positive: {
    color: '#ef4444',
  },
  negative: {
    color: '#10b981',
  },
});
