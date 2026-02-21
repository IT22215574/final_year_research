import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import * as Notifications from 'expo-notifications';
import API_CONFIG, { getPredictionApiBaseUrls } from '@/src/config/api';

const screenWidth = Dimensions.get('window').width;

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
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [loadingFish, setLoadingFish] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Recommendations state
  const [budget, setBudget] = useState<number>(1000);
  const [preference, setPreference] = useState<string>('profitable');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [favoriteFishIds, setFavoriteFishIds] = useState<number[]>([]);

  // Feedback state
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const fetchAccuracy = async () => {
    try {
      const data = await predictionRequest<any>('/accuracy', { method: 'GET' }, 5000);
      setAccuracy(data.accuracy);
    } catch (err) {
      console.error('Failed to fetch accuracy', err);
    }
  };

  useEffect(() => {
    fetchAccuracy();
  }, []);

  useEffect(() => {
    const loadFish = async () => {
      try {
        setLoadingFish(true);
        const data = await predictionRequest<unknown>('/fish', { method: 'GET' }, 8000);
        const list = Array.isArray(data) && data.length > 0 ? (data as FishOption[]) : sampleFish;

        setFishList(list);
        if (list.length > 0) {
          setSelectedFishId(list[0].fish_id);
        }
      } catch (err) {
        const list = sampleFish;
        setFishList(list);
        if (list.length > 0) setSelectedFishId(list[0].fish_id);
      } finally {
        setLoadingFish(false);
      }
    };
    loadFish();
  }, []);

  // Automatically predict when fish is selected
  useEffect(() => {
    if (selectedFishId) {
      handlePredictPrice();
    }
  }, [selectedFishId]);

  const handlePredictPrice = async () => {
    if (!selectedFishId) return;
    
    setLoadingPredict(true);
    setFeedbackGiven(false); // Reset feedback state for new prediction
    try {
      const dateStr = new Date().toISOString().split('T')[0];
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
      setMinPrice(data.min_price || data.predicted * 0.9);
      setMaxPrice(data.max_price || data.predicted * 1.1);
      setPriceHistory(data.series as PriceHistory[]);

      // Check if tomorrow's price is lower than today's
      if (data.series && data.series.length > 16) {
        const todayPrice = data.series[15].price;
        const tomorrowPrice = data.series[16].price;
        
        if (tomorrowPrice < todayPrice) {
          const fishName = fishList.find(f => f.fish_id === selectedFishId)?.sinhala_name || 'මාළු';
          const diff = (todayPrice - tomorrowPrice).toFixed(2);
          
          // Request permissions if not already granted
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            await Notifications.requestPermissionsAsync();
          }
          
          // Schedule notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Price Drop Alert! 📉",
              body: `Tomorrow's price for ${fishName} is expected to drop by Rs. ${diff}.`,
              data: { fishId: selectedFishId },
            },
            trigger: null, // Send immediately
          });
        }
      }
    } catch (err) {
      Alert.alert('Prediction failed', err instanceof Error ? err.message : 'Please check backend API and try again.');
    } finally {
      setLoadingPredict(false);
    }
  };

  const handleFeedback = async (isCorrect: boolean) => {
    try {
      const data = await predictionRequest<any>(
        '/feedback',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            is_correct: isCorrect,
            fish_id: predictedFishId,
            predicted_price: predictedPrice
          }),
        },
        5000,
      );
      setAccuracy(data.accuracy);
      setFeedbackGiven(true);
      Alert.alert('Thank you!', 'Your feedback has been recorded.');
    } catch (err) {
      Alert.alert('Error', 'Failed to submit feedback.');
    }
  };

  const selectedFishName = fishList.find(f => f.fish_id === selectedFishId);
  const predictedFishName = fishList.find(f => f.fish_id === predictedFishId);
  
  // Get 7 days of data starting from today (index 15 in the 31-day series)
  const weekData = priceHistory.length > 15 ? priceHistory.slice(15, 22) : [];
  
  // Calculate percentage change from yesterday (index 14)
  let percentageChange = 0;
  let priceDiff = 0;
  if (priceHistory.length > 15 && predictedPrice) {
    const yesterdayPrice = priceHistory[14].price;
    priceDiff = predictedPrice - yesterdayPrice;
    percentageChange = (priceDiff / yesterdayPrice) * 100;
  }

  const isPositive = priceDiff >= 0;
  const changeText = `${isPositive ? '+' : ''}${priceDiff.toFixed(2)} (${Math.abs(percentageChange).toFixed(1)}%)`;

  // Fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoadingRecs(true);
      try {
        const dateStr = new Date().toISOString().split('T')[0];
        const data = await predictionRequest<any>(
          '/recommend',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ budget, date: dateStr, preference, favorite_fish_ids: favoriteFishIds }),
          },
          12000,
        );
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error('Failed to fetch recommendations', err);
      } finally {
        setLoadingRecs(false);
      }
    };
    fetchRecommendations();
  }, [budget, preference, favoriteFishIds]);

  const toggleFavorite = (fishId: number) => {
    setFavoriteFishIds(prev => 
      prev.includes(fishId) 
        ? prev.filter(id => id !== fishId)
        : [...prev, fishId]
    );
  };

  const chartData = {
    labels: weekData.map(d => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        data: weekData.map(d => d.price),
        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Blue line
        strokeWidth: 2
      }
    ]
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Price Fluctuation</Text>
        
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={styles.dropdownText}>
            {selectedFishName ? `${selectedFishName.sinhala_name} (${selectedFishName.common_name})` : 'Select Fish'}
          </Text>
          <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={16} color="#4b5563" />
        </TouchableOpacity>
      </View>

      {/* Dropdown List */}
      {showDropdown && (
        <View style={styles.dropdownListContainer}>
          <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
            {fishList.map(fish => (
              <TouchableOpacity
                key={fish.fish_id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedFishId(fish.fish_id);
                  setShowDropdown(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedFishId === fish.fish_id && styles.dropdownItemTextSelected
                ]}>
                  {fish.sinhala_name} ({fish.common_name})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {loadingPredict ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Calculating Price...</Text>
          </View>
        ) : predictedPrice !== null && predictedFishName && weekData.length > 0 ? (
          <View style={styles.card}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.fishName}>{predictedFishName.sinhala_name} <Text style={styles.recFishNameEnglish}>({predictedFishName.common_name})</Text></Text>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>Rs. {predictedPrice.toFixed(2)}</Text>
                <View style={[styles.badge, isPositive ? styles.badgePositive : styles.badgeNegative]}>
                  <Text style={styles.badgeText}>{changeText}</Text>
                </View>
              </View>
            </View>

            {/* Chart */}
            <View style={styles.chartWrapper}>
              <LineChart
                data={chartData}
                width={screenWidth - 64} // padding 16*2 + card padding 16*2
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
                  color: (opacity = 1) => `rgba(147, 197, 253, ${opacity})`, // Light blue for shadow
                  labelColor: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Blue labels
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: "#2563eb",
                    fill: "#2563eb"
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: "4 4",
                    stroke: "#e5e7eb"
                  }
                }}
                bezier
                style={styles.chart}
              />
            </View>

            {/* Confidence Interval Box */}
            <View style={styles.confidenceBox}>
              <Text style={styles.confidenceTitle}>90% Confidence Interval</Text>
              <Text style={styles.confidenceValue}>
                Rs. {minPrice?.toFixed(2)} - Rs. {maxPrice?.toFixed(2)}
              </Text>
            </View>

            {/* Legend */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                <Text style={styles.legendText}>Expected Price</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#bfdbfe' }]} />
                <Text style={styles.legendText}>Confidence Interval</Text>
              </View>
            </View>

            {/* Feedback Section */}
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackTitle}>Is this prediction accurate?</Text>
              {!feedbackGiven ? (
                <View style={styles.feedbackButtons}>
                  <TouchableOpacity 
                    style={[styles.feedbackBtn, styles.feedbackBtnYes]} 
                    onPress={() => handleFeedback(true)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
                    <Text style={styles.feedbackBtnTextYes}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.feedbackBtn, styles.feedbackBtnNo]} 
                    onPress={() => handleFeedback(false)}
                  >
                    <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                    <Text style={styles.feedbackBtnTextNo}>No</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.feedbackThanks}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  <Text style={styles.feedbackThanksText}>Thank you for your feedback!</Text>
                </View>
              )}
              {accuracy !== null && (
                <View style={styles.accuracyContainer}>
                  <Text style={styles.accuracyText}>System Accuracy: </Text>
                  <Text style={[
                    styles.accuracyValue, 
                    { color: accuracy >= 70 ? '#10b981' : accuracy >= 50 ? '#f59e0b' : '#ef4444' }
                  ]}>
                    {accuracy}%
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Select a fish</Text>
          </View>
        )}

        {/* Recommendations Section */}
        <View style={styles.recommendationsCard}>
          <View style={styles.recHeader}>
            <Ionicons name="bulb-outline" size={24} color="#2563eb" />
            <Text style={styles.recTitle}>Fish Recommendations</Text>
            <TouchableOpacity onPress={() => setBudget(budget)}>
              <Ionicons name="refresh-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Budget</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.budgetScroll}>
            {[500, 1000, 1500, 2000].map(b => (
              <TouchableOpacity
                key={b}
                style={[styles.budgetBtn, budget === b && styles.budgetBtnActive]}
                onPress={() => setBudget(b)}
              >
                <Text style={[styles.budgetText, budget === b && styles.budgetTextActive]}>
                  Rs. {b}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionLabel}>Preferences</Text>
          <View style={styles.prefContainer}>
            <TouchableOpacity
              style={[styles.prefBtn, preference === 'profitable' && styles.prefBtnActive]}
              onPress={() => setPreference('profitable')}
            >
              <Ionicons name="cash-outline" size={16} color={preference === 'profitable' ? '#fff' : '#2563eb'} />
              <Text style={[styles.prefText, preference === 'profitable' && styles.prefTextActive]}>Profitable</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.prefBtn, preference === 'seasonal' && styles.prefBtnActive]}
              onPress={() => setPreference('seasonal')}
            >
              <Ionicons name="leaf-outline" size={16} color={preference === 'seasonal' ? '#fff' : '#d97706'} />
              <Text style={[styles.prefText, preference === 'seasonal' && styles.prefTextActive, { color: preference === 'seasonal' ? '#fff' : '#d97706' }]}>Seasonal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.prefBtn, preference === 'popular' && styles.prefBtnActive]}
              onPress={() => setPreference('popular')}
            >
              <Ionicons name="heart-outline" size={16} color={preference === 'popular' ? '#fff' : '#dc2626'} />
              <Text style={[styles.prefText, preference === 'popular' && styles.prefTextActive, { color: preference === 'popular' ? '#fff' : '#dc2626' }]}>Popular</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recListHeader}>
            <Text style={styles.sectionLabel}>Recommendations for Today</Text>
            <Text style={styles.timeText}>Last Updated: 14:00</Text>
          </View>

          {loadingRecs ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 20 }} />
          ) : recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <View key={index} style={styles.recItem}>
                <View style={styles.recItemHeader}>
                  <Text style={styles.recFishName}>{rec.sinhala_name} <Text style={styles.recFishNameEnglish}>({rec.common_name})</Text></Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.recPriceBadge}>
                      <Text style={styles.recPriceText}>Rs. {rec.predicted_price.toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleFavorite(rec.fish_id)}>
                      <Ionicons 
                        name={favoriteFishIds.includes(rec.fish_id) ? "heart" : "heart-outline"} 
                        size={24} 
                        color={favoriteFishIds.includes(rec.fish_id) ? "#ec4899" : "#9ca3af"} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.recTagRow}>
                  <Ionicons name="trending-up-outline" size={14} color="#10b981" />
                  <Text style={styles.recTagText}>{rec.tag}</Text>
                </View>
                
                <Text style={styles.recDescText}>
                  {rec.tag === 'Available at a lower price today' 
                    ? 'Available at a lower price today - Profitable choice' 
                    : rec.tag === 'Seasonal Fish' 
                    ? 'Seasonal Fish - Fair price'
                    : 'Popular Fish - Fair price'}
                </Text>
                
                <View style={styles.recActionRow}>
                  <TouchableOpacity style={styles.recDetailsBtn}>
                    <Text style={styles.recDetailsText}>Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.recBuyBtn}>
                    <Text style={styles.recBuyText}>Buy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noRecsText}>No fish available for this budget or preference.</Text>
          )}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f3f4f6',
    zIndex: 10,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dropdownText: {
    fontSize: 14,
    color: '#4b5563',
    marginRight: 8,
  },
  dropdownListContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 200,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 20,
    maxHeight: 300,
  },
  dropdownList: {
    padding: 8,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownItemTextSelected: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  fishName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePositive: {
    backgroundColor: '#10b981',
  },
  badgeNegative: {
    backgroundColor: '#ef4444',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chartWrapper: {
    alignItems: 'center',
    marginBottom: 24,
    marginLeft: -16, // Adjust for chart kit default padding
  },
  chart: {
    borderRadius: 16,
  },
  confidenceBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  confidenceTitle: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  confidenceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#6b7280',
  },
  feedbackContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'center',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
  },
  feedbackBtnYes: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  feedbackBtnNo: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  feedbackBtnTextYes: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 16,
  },
  feedbackBtnTextNo: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  feedbackThanks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 10,
  },
  feedbackThanksText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 16,
  },
  accuracyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  accuracyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  accuracyValue: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  recommendationsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
    marginTop: 8,
  },
  budgetScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  budgetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
    backgroundColor: '#ffffff',
  },
  budgetBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  budgetText: {
    color: '#4b5563',
    fontSize: 14,
  },
  budgetTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  prefContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  prefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    flex: 1,
    justifyContent: 'center',
  },
  prefBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  prefText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  prefTextActive: {
    color: '#ffffff',
  },
  recListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  recItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  recItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recFishName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  recFishNameEnglish: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#6b7280',
  },
  recPriceBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recPriceText: {
    color: '#065f46',
    fontWeight: 'bold',
    fontSize: 12,
  },
  recTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recTagText: {
    color: '#10b981',
    fontSize: 12,
    marginLeft: 4,
  },
  recDescText: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 16,
  },
  recActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  recDetailsBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  recDetailsText: {
    color: '#4b5563',
    fontWeight: '600',
  },
  recBuyBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  recBuyText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  noRecsText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 20,
    marginBottom: 20,
  }
});
