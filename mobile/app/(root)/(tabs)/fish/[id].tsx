import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { getPredictionApiBaseUrls } from '@/src/config/api';

const screenWidth = Dimensions.get('window').width;

interface PriceHistory {
  date: string;
  price: number;
}

const fetchJsonWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message = (json && typeof json === 'object' && 'message' in json)
        ? String((json as any).message)
        : `HTTP ${res.status}`;
      throw new Error(message);
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
};

async function predictionRequest<T>(path: string, init: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const baseUrls = getPredictionApiBaseUrls();
  let lastError: unknown;

  for (const baseUrl of baseUrls) {
    const url = `${String(baseUrl).replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      return (await fetchJsonWithTimeout(url, init, timeoutMs)) as T;
    } catch (err: any) {
      lastError = err;
      const message = String(err?.message || err || '');
      const isNetwork =
        err?.name === 'AbortError' ||
        err instanceof TypeError ||
        /Network request failed|Failed to fetch|network/i.test(message);

      if (!isNetwork) throw err;
    }
  }

  const tried = getPredictionApiBaseUrls().join(', ');
  const message = String((lastError as any)?.message || lastError || 'Network request failed');
  throw new Error(`${message}. Tried: ${tried}`);
}

export default function FishDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fishData, setFishData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const dateStr = new Date().toISOString().split('T')[0];
        const data = await predictionRequest<any>(
          '/predict',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fish_id: parseInt(id as string), date: dateStr }),
          },
          12000,
        );
        setFishData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (error || !fishData) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error || 'Fish not found'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const series: PriceHistory[] = fishData.series || [];
  
  // Calculate Min and Max for the month (31 days series)
  let minPrice = Infinity;
  let maxPrice = 0;
  let minDate = '';
  let maxDate = '';

  series.forEach(item => {
    if (item.price < minPrice) {
      minPrice = item.price;
      minDate = item.date;
    }
    if (item.price > maxPrice) {
      maxPrice = item.price;
      maxDate = item.date;
    }
  });

  // Next week prediction (index 16 to 22)
  const nextWeekData = series.length > 16 ? series.slice(16, 23) : [];
  
  // Chart data for the whole month (every 3rd day to avoid crowding)
  const chartData = {
    labels: series.filter((_, i) => i % 3 === 0).map(d => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        data: series.filter((_, i) => i % 3 === 0).map(d => d.price),
        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {fishData.fish.sinhala_name} ({fishData.fish.common_name})
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Current Price Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today&apos;s Expected Price</Text>
          <Text style={styles.mainPrice}>Rs. {fishData.predicted.toFixed(2)}</Text>
          <Text style={styles.subText}>
            Confidence Interval: Rs. {fishData.min_price.toFixed(2)} - Rs. {fishData.max_price.toFixed(2)}
          </Text>
        </View>

        {/* 1 Month Analysis Chart */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1-Month Price Analysis</Text>
          <View style={styles.chartWrapper}>
            <LineChart
              data={chartData}
              width={screenWidth - 64}
              height={220}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLines={true}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(147, 197, 253, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "3", strokeWidth: "2", stroke: "#2563eb", fill: "#2563eb" },
                propsForBackgroundLines: { strokeDasharray: "4 4", stroke: "#f3f4f6" }
              }}
              bezier
              style={styles.chart}
            />
          </View>
        </View>

        {/* Min / Max Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#ecfdf5', borderColor: '#10b981' }]}>
            <Ionicons name="arrow-down-circle" size={24} color="#10b981" />
            <Text style={styles.statLabel}>Lowest Price</Text>
            <Text style={[styles.statValue, { color: '#065f46' }]}>Rs. {minPrice.toFixed(2)}</Text>
            <Text style={styles.statDate}>{minDate}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef2f2', borderColor: '#ef4444' }]}>
            <Ionicons name="arrow-up-circle" size={24} color="#ef4444" />
            <Text style={styles.statLabel}>Highest Price</Text>
            <Text style={[styles.statValue, { color: '#991b1b' }]}>Rs. {maxPrice.toFixed(2)}</Text>
            <Text style={styles.statDate}>{maxDate}</Text>
          </View>
        </View>

        {/* Next Week Prediction */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Next Week&apos;s Prediction</Text>
          {nextWeekData.map((day, index) => {
            const dateObj = new Date(day.date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            
            return (
              <View key={index} style={styles.weekRow}>
                <View style={styles.weekDateCol}>
                  <Text style={styles.weekDayName}>{dayName}</Text>
                  <Text style={styles.weekDateStr}>{dateStr}</Text>
                </View>
                <View style={styles.weekPriceCol}>
                  <Text style={styles.weekPrice}>Rs. {day.price.toFixed(2)}</Text>
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backIcon: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  mainPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#4b5563',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  chartWrapper: {
    alignItems: 'center',
    marginLeft: -16,
  },
  chart: {
    borderRadius: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  weekDateCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekDayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    width: 40,
  },
  weekDateStr: {
    fontSize: 14,
    color: '#6b7280',
  },
  weekPriceCol: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  weekPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  }
});
