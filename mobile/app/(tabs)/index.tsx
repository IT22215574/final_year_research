import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';

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

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export default function HomeScreen() {
  const [fishList, setFishList] = useState<FishOption[]>([]);
  const [selectedFishId, setSelectedFishId] = useState<number | null>(null);
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
        const res = await axios.get(`${API_BASE}/fish`);
        const data = res.data as FishOption[];
        const list = data.length > 0 ? data : sampleFish;
        setFishList(list);
        if (list.length > 0) {
          setSelectedFishId(list[0].fish_id);
        }
      } catch (err) {
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
      const res = await axios.post(`${API_BASE}/predict`, {
        fish_id: selectedFishId,
        date: dateStr,
      });
      const data = res.data;
      setPredictedPrice(data.predicted);
      setPriceHistory(data.series as PriceHistory[]);
    } catch (err) {
      Alert.alert('Prediction failed', 'Please check backend API and try again.');
    } finally {
      setLoadingPredict(false);
    }
  };

  const selectedFishName = fishList.find(f => f.fish_id === selectedFishId);
  const minPrice = priceHistory.length > 0 ? Math.min(...priceHistory.map(p => p.price)) : 0;
  const maxPrice = priceHistory.length > 0 ? Math.max(...priceHistory.map(p => p.price)) : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐟 Fish Price Predictor</Text>
        <Text style={styles.headerSubtitle}>Real-time market data for Sri Lanka</Text>
      </View>

      {/* Selection Panel */}
      <View style={styles.card}>
        <Text style={styles.label}>Select Fish (සිංහල නම):</Text>
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

        <Text style={[styles.label, { marginTop: 16 }]}>Select Future Date:</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateButtonText}>
            📅 {selectedDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        <TouchableOpacity
          style={styles.predictButton}
          onPress={handlePredictPrice}
          disabled={loadingPredict}>
          {loadingPredict ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.predictButtonText}>Predict Price</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Price Prediction Result */}
      {predictedPrice !== null && (
        <View style={styles.card}>
          <Text style={styles.resultLabel}>Price Prediction</Text>
          <View style={styles.priceBox}>
            <Text style={styles.priceText}>Rs. {predictedPrice.toFixed(2)} per Kg</Text>
          </View>
          <Text style={styles.fishInfo}>
            Fish: {selectedFishName?.common_name} ({selectedFishName?.sinhala_name})
          </Text>
          <Text style={styles.dateInfo}>
            Date: {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      )}

      {/* Price Trend */}
      {priceHistory.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.trendTitle}>Price Trend (30 Days)</Text>
          <View style={styles.trendInfo}>
            <View style={styles.trendStat}>
              <Text style={styles.trendLabel}>Min Price</Text>
              <Text style={styles.trendValue}>Rs. {minPrice.toFixed(0)}</Text>
            </View>
            <View style={styles.trendStat}>
              <Text style={styles.trendLabel}>Max Price</Text>
              <Text style={styles.trendValue}>Rs. {maxPrice.toFixed(0)}</Text>
            </View>
            <View style={styles.trendStat}>
              <Text style={styles.trendLabel}>Avg Price</Text>
              <Text style={styles.trendValue}>
                Rs. {(priceHistory.reduce((a, b) => a + b.price, 0) / priceHistory.length).toFixed(0)}
              </Text>
            </View>
          </View>

          {/* Simple bar chart representation */}
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
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>Select a fish and date to see price prediction</Text>
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
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
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
  dateButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  predictButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  predictButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  priceBox: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    marginBottom: 12,
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
  },
  fishInfo: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  dateInfo: {
    fontSize: 13,
    color: '#6b7280',
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  trendInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  trendStat: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  trendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
    marginVertical: 12,
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
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
