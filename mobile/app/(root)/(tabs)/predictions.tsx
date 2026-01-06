import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import API_CONFIG, { getPredictionApiBaseUrls } from '@/src/config/api';

interface FishOption {
  fish_id: number;
  sinhala_name: string;
  common_name: string;
}

const sampleFish: FishOption[] = [
  { fish_id: 2, sinhala_name: 'පරව් (ලොකු)', common_name: 'Trevally (L)' },
  { fish_id: 6, sinhala_name: 'කෙළවල්ලා', common_name: 'Yellowfin tuna' },
  { fish_id: 7, sinhala_name: 'සාලයා (මට්ට)', common_name: 'Sardinella' },
  { fish_id: 9, sinhala_name: 'හුරුල්ලා', common_name: 'Herrings' },
  { fish_id: 10, sinhala_name: 'කුම්බලා', common_name: 'Indian Mackerel' },
];

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

const predictionRequest = async <T,>(path: string, init: RequestInit = {}, timeoutMs = 8000): Promise<T> => {
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
};

export default function PredictionsScreen() {
  const [fishList, setFishList] = useState<FishOption[]>([]);
  const [selectedFishId, setSelectedFishId] = useState<number | null>(null);
  const [predictedFishId, setPredictedFishId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [loadingFish, setLoadingFish] = useState(false);

  useEffect(() => {
    const loadFish = async () => {
      try {
        setLoadingFish(true);
        console.log('Prediction API base URL candidates:', getPredictionApiBaseUrls());

        const data = await predictionRequest<unknown>('/fish', { method: 'GET' }, 8000);
        const list = Array.isArray(data) && data.length > 0 ? (data as FishOption[]) : sampleFish;

        setFishList(list);
        if (list.length > 0) {
          setSelectedFishId(list[0].fish_id);
        }
      } catch (err) {
        console.log('❌ Fish list fetch failed:', {
          predictionApi: API_CONFIG.PREDICTION_API,
          message: err instanceof Error ? err.message : String(err),
        });
        const list = sampleFish;
        setFishList(list);
        if (list.length > 0) setSelectedFishId(list[0].fish_id);
        Alert.alert('Notice', 'Using sample fish list (backend not reachable).');
      } finally {
        setLoadingFish(false);
      }
    };
    loadFish();
  }, []);

  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
    setShowDatePicker(false);
  };

  const handlePredictPrice = async () => {
    if (!selectedFishId) {
      Alert.alert('Select fish', 'Please select a fish first.');
      return;
    }
    setLoadingPredict(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await predictionRequest<any>(
        '/predict',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fish_id: selectedFishId, date: dateStr }),
        },
        12000,
      );
      setPredictedFishId(selectedFishId);
      setPredictedPrice(data.predicted);
      setPriceHistory(data.series as PriceHistory[]);
    } catch (err) {
      Alert.alert('Prediction failed', err instanceof Error ? err.message : 'Please check backend API and try again.');
    } finally {
      setLoadingPredict(false);
    }
  };

  const selectedFishName = fishList.find(f => f.fish_id === selectedFishId);
  const predictedFishName = fishList.find(f => f.fish_id === predictedFishId);
  const minPrice = priceHistory.length > 0 ? Math.min(...priceHistory.map(p => p.price)) : 0;
  const maxPrice = priceHistory.length > 0 ? Math.max(...priceHistory.map(p => p.price)) : 0;
  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐟 Fish Price Predictor</Text>
        <Text style={styles.headerSubtitle}>Real-time market data for Sri Lanka</Text>
      </View>

      {/* Selection Panel */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Step 1: Select Fish</Text>
        <Text style={styles.label}>Choose a fish species (සිංහල නම):</Text>
        <View style={styles.dropdownList}>
          {loadingFish ? (
            <View style={styles.dropdownLoading}>
              <ActivityIndicator size="small" color="#1e40af" />
              <Text style={styles.dropdownLoadingText}>Loading fish...</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.dropdownListScroll}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}>
              {fishList.map(fish => {
                const selected = selectedFishId === fish.fish_id;
                return (
                  <TouchableOpacity
                    key={fish.fish_id}
                    activeOpacity={0.7}
                    style={[
                      styles.dropdownRow,
                      selected && styles.dropdownRowSelected,
                    ]}
                    onPress={() => {
                      setSelectedFishId(fish.fish_id);
                    }}>
                    <View style={styles.dropdownRowTextWrap}>
                      <Text style={[
                        styles.dropdownOptionText,
                        selected && styles.dropdownOptionTextSelected,
                      ]}>
                        {fish.sinhala_name}
                      </Text>
                      {fish.common_name ? (
                        <Text style={styles.dropdownOptionSub}>{fish.common_name}</Text>
                      ) : null}
                    </View>
                    {selected ? <Text style={styles.dropdownCheck}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Selected Fish Display */}
        {selectedFishName && (
          <View style={styles.selectedFishInfo}>
            <Text style={styles.selectedFishLabel}>Selected:</Text>
            <Text style={styles.selectedFishName}>{selectedFishName.sinhala_name}</Text>
            <Text style={styles.selectedFishCommon}>{selectedFishName.common_name}</Text>
          </View>
        )}
      </View>

      {/* Date Selection */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Step 2: Select Date</Text>
        <Text style={styles.label}>Choose a future date for prediction:</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateIcon}>📅</Text>
          <View style={styles.dateButtonContent}>
            <Text style={styles.dateButtonLabel}>Prediction Date</Text>
            <Text style={styles.dateButtonText}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </View>

      {/* Prediction Button */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Step 3: Get Prediction</Text>
        <TouchableOpacity
          style={[styles.predictButton, loadingPredict && styles.predictButtonDisabled]}
          onPress={handlePredictPrice}
          disabled={loadingPredict || !selectedFishId}>
          {loadingPredict ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.predictButtonText}>Predicting...</Text>
            </>
          ) : (
            <>
              <Text style={styles.predictButtonIcon}>⚡</Text>
              <Text style={styles.predictButtonText}>Predict Price</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Price Prediction Result */}
      {predictedPrice !== null && predictedFishName && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>💰 Price Prediction</Text>
          </View>

          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Predicted Price</Text>
            <Text style={styles.priceText}>Rs. {predictedPrice.toFixed(2)}</Text>
            <Text style={styles.priceUnit}>per Kilogram</Text>
          </View>

          <View style={styles.predictionDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Fish Species</Text>
              <Text style={styles.detailValue}>{predictedFishName.sinhala_name}</Text>
              <Text style={styles.detailSubtext}>{predictedFishName.common_name}</Text>
            </View>
            <View style={[styles.detailItem, styles.detailItemBorder]}>
              <Text style={styles.detailLabel}>Prediction Date</Text>
              <Text style={styles.detailValue}>
                {selectedDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Price Trend */}
      {priceHistory.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📊 Price Trend (30 Days)</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Min Price</Text>
              <Text style={styles.statValue}>Rs. {minPrice.toFixed(0)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg Price</Text>
              <Text style={styles.statValue}>
                Rs. {(priceHistory.reduce((a, b) => a + b.price, 0) / priceHistory.length).toFixed(0)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Max Price</Text>
              <Text style={styles.statValue}>Rs. {maxPrice.toFixed(0)}</Text>
            </View>
          </View>

          {/* Simple bar chart representation */}
          <View style={styles.sparklineContainer}>
            <View style={styles.sparkline}>
              {priceHistory.map((item, idx) => {
                const normalized = ((item.price - minPrice) / (maxPrice - minPrice)) * 60 + 10;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.sparklineBar,
                      { height: normalized },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.dateRange}>
            <Text style={styles.dateRangeText}>
              {priceHistory[0]?.date} to {priceHistory[priceHistory.length - 1]?.date}
            </Text>
          </View>
        </View>
      )}

      {/* Empty State */}
      {predictedPrice === null && (
        <View style={styles.card}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📈</Text>
            <Text style={styles.emptyText}>
              Select a fish and date, then click {"\"Predict Price\""} to see the market forecast
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#1e40af',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#dbeafe',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderTopWidth: 4,
    borderTopColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    maxHeight: 220,
  },
  dropdownListScroll: {
    paddingVertical: 4,
  },
  dropdownLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dropdownLoadingText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dropdownRowSelected: {
    backgroundColor: '#dbeafe',
  },
  dropdownRowTextWrap: {
    flexShrink: 1,
  },
  dropdownOptionText: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
  },
  dropdownOptionSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  dropdownOptionTextSelected: {
    color: '#1e40af',
  },
  dropdownCheck: {
    fontSize: 16,
    color: '#1e40af',
    marginLeft: 8,
  },
  selectedFishInfo: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
    borderRadius: 8,
  },
  selectedFishLabel: {
    fontSize: 12,
    color: '#0c4a6e',
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedFishName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0c4a6e',
  },
  selectedFishCommon: {
    fontSize: 13,
    color: '#0c4a6e',
    marginTop: 2,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
  },
  dateIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  dateButtonContent: {
    flex: 1,
  },
  dateButtonLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    marginTop: 2,
  },
  predictButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  predictButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },
  predictButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  predictButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultHeader: {
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  priceBox: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    marginBottom: 16,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#059669',
  },
  priceUnit: {
    fontSize: 12,
    color: '#059669',
    marginTop: 4,
    fontWeight: '500',
  },
  predictionDetails: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  detailItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  detailItemBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  detailLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  detailSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  sparklineContainer: {
    marginVertical: 12,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sparklineBar: {
    width: '2.5%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  dateRange: {
    alignItems: 'center',
    marginTop: 8,
  },
  dateRangeText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
