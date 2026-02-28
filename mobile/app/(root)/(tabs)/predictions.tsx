import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Path, Line as SvgLine, Text as SvgText, Circle } from 'react-native-svg';
import * as Notifications from 'expo-notifications';
import { getPredictionApiBaseUrls } from '@/src/config/api';

const screenWidth = Dimensions.get('window').width;

/** Format a number as Sri Lankan Rupees: Rs. 1,250 */
const formatLKR = (amount: number | null | undefined): string => {
  if (amount == null || isNaN(amount)) return 'Rs. --';
  return `Rs. ${Math.round(amount).toLocaleString('en-LK')}`;
};

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

interface InsightsData {
  fish: { fish_id: number; sinhala_name: string; common_name: string };
  labels: string[];
  prediction_7_days: number[];
  knn_baseline: number[];
  insights: {
    fuel_lag_weeks: number;
    correlation_score: number;
    current_lk_price: number;
    current_elasticity: number;
    elasticity_label: string;
    holiday_lift: number;
    is_holiday_period: boolean;
    current_season: string;
    season_price_impact: string;
    season_alert: string;
    weather_factor: number;
    weather_label: string;
  };
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

// ─── Custom confidence-interval chart ──────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cx = (prev.x + curr.x) / 2;
    d += ` C${cx},${prev.y} ${cx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

function bandPath(
  upperPts: { x: number; y: number }[],
  lowerPts: { x: number; y: number }[],
): string {
  const fwd = smoothPath(upperPts);
  const rev = [...lowerPts].reverse();
  let back = ` L${rev[0].x},${rev[0].y}`;
  for (let i = 1; i < rev.length; i++) {
    const p = rev[i - 1];
    const c = rev[i];
    const cx = (p.x + c.x) / 2;
    back += ` C${cx},${p.y} ${cx},${c.y} ${c.x},${c.y}`;
  }
  return fwd + back + ' Z';
}

function PriceFluctuationChart({
  weekData,
  chartWidth,
}: {
  weekData: PriceHistory[];
  chartWidth: number;
}) {
  if (weekData.length === 0) return null;

  const PAD_L = 54;
  const PAD_R = 12;
  const PAD_T = 18;
  const PAD_B = 28;
  const height = 220;
  const plotW = chartWidth - PAD_L - PAD_R;
  const plotH = height - PAD_T - PAD_B;

  const prices = weekData.map(d => d.price);
  const outerUpper = prices.map(p => p * 1.10);
  const outerLower = prices.map(p => p * 0.90);
  const innerUpper = prices.map(p => p * 1.05);
  const innerLower = prices.map(p => p * 0.95);

  const allVals = [...outerUpper, ...outerLower];
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const yMin = Math.floor(rawMin / 100) * 100;
  const yMax = Math.ceil(rawMax / 100) * 100;
  const yRange = yMax - yMin || 1;

  const toY = (v: number) => PAD_T + plotH - ((v - yMin) / yRange) * plotH;
  const toX = (i: number) => PAD_L + (i / Math.max(prices.length - 1, 1)) * plotW;

  const mkPts = (vals: number[]) => vals.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const mainPts     = mkPts(prices);
  const outerUpPts  = mkPts(outerUpper);
  const outerLoPts  = mkPts(outerLower);
  const innerUpPts  = mkPts(innerUpper);
  const innerLoPts  = mkPts(innerLower);

  const yTicks = Array.from({ length: 5 }, (_, i) =>
    Math.round(yMin + (i / 4) * yRange),
  );

  return (
    <Svg width={chartWidth} height={height}>
      {/* Outer CI band (±10%) */}
      <Path d={bandPath(outerUpPts, outerLoPts)} fill="rgba(147, 197, 253, 0.22)" />
      {/* Inner CI band (±5%) */}
      <Path d={bandPath(innerUpPts, innerLoPts)} fill="rgba(96, 165, 250, 0.28)" />

      {/* Dashed horizontal grid lines */}
      {yTicks.map((tick, i) => (
        <SvgLine
          key={`g${i}`}
          x1={PAD_L} y1={toY(tick)}
          x2={chartWidth - PAD_R} y2={toY(tick)}
          stroke="rgba(37, 99, 235, 0.15)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      ))}

      {/* Price line */}
      <Path d={smoothPath(mainPts)} stroke="#2563eb" strokeWidth="2.5" fill="none" />

      {/* Dots */}
      {mainPts.map((pt, i) => (
        <Circle key={`d${i}`} cx={pt.x} cy={pt.y} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((tick, i) => (
        <SvgText key={`y${i}`} x={PAD_L - 6} y={toY(tick) + 4}
          textAnchor="end" fontSize="11" fill="rgba(37, 99, 235, 0.85)">
          {Math.round(tick).toLocaleString()}
        </SvgText>
      ))}

      {/* X-axis day labels */}
      {weekData.map((d, i) => {
        const label = i === 0 ? 'Today' : DAY_NAMES[new Date(d.date).getDay()];
        return (
          <SvgText key={`x${i}`} x={toX(i)} y={height - 6}
            textAnchor="middle" fontSize="11" fill="rgba(37, 99, 235, 0.7)">
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}
// ────────────────────────────────────────────────────────────────────────────

export default function PredictionsScreen() {
  const router = useRouter();
  const [fishList, setFishList] = useState<FishOption[]>([]);
  const [selectedFishId, setSelectedFishId] = useState<number | null>(null);
  const [predictedFishId, setPredictedFishId] = useState<number | null>(null);
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Market Trends state
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);

  // Recommendations state
  const [budget, setBudget] = useState<number>(1000);
  const [preference, setPreference] = useState<string>('profitable');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [favoriteFishIds, setFavoriteFishIds] = useState<number[]>([]);

  // Feedback state
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'daily' | 'insights'>('daily');

  // Market Insights state
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsRetryKey, setInsightsRetryKey] = useState(0);

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
        const data = await predictionRequest<unknown>('/fish', { method: 'GET' }, 8000);
        const list = Array.isArray(data) && data.length > 0 ? (data as FishOption[]) : sampleFish;

        setFishList(list);
        if (list.length > 0) {
          setSelectedFishId(list[0].fish_id);
        }
      } catch (err) {
        console.error('Failed to load fish list', err);
        const list = sampleFish;
        setFishList(list);
        if (list.length > 0) {
          setSelectedFishId(list[0].fish_id);
        }
      }
    };
    loadFish();
  }, []);

  // Automatically predict when fish is selected
  useEffect(() => {
    if (selectedFishId) {
      handlePredictPrice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.error('Failed to submit feedback', err);
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

  // Fetch Market Trend (synced to selectedFishId)
  useEffect(() => {
    const fetchTrend = async () => {
      if (!selectedFishId) return;
      setLoadingTrend(true);
      try {
        const dateStr = new Date().toISOString().split('T')[0];
        const data = await predictionRequest<any>(
          '/trend',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fish_id: selectedFishId, date: dateStr }),
          },
          12000,
        );
        setTrendData(data.trend || []);
      } catch (err) {
        console.error('Failed to fetch trend data', err);
      } finally {
        setLoadingTrend(false);
      }
    };
    fetchTrend();
  }, [selectedFishId]);

  // Fetch Market Insights
  useEffect(() => {
    const fetchInsights = async () => {
      if (!selectedFishId) return;
      setLoadingInsights(true);
      setInsightsError(null);
      try {
        const dateStr = new Date().toISOString().split('T')[0];
        const data = await predictionRequest<InsightsData>(
          `/insights?fish_id=${selectedFishId}&date=${dateStr}`,
          { method: 'GET' },
          15000,
        );
        // Guard: ensure KNN baseline has same length as predictions
        if (!data.knn_baseline || data.knn_baseline.length !== data.prediction_7_days.length) {
          data.knn_baseline = data.prediction_7_days.map(p => Math.round(p * 0.97));
        }
        setInsightsData(data);
      } catch (err: any) {
        const msg = String(err?.message ?? err ?? 'Unknown error');
        const isNetwork = /Network request failed|Failed to fetch|AbortError|timeout/i.test(msg);
        setInsightsError(
          isNetwork
            ? 'Unable to reach the prediction server. Check your network connection.'
            : `Failed to load insights: ${msg}`,
        );
        console.error('Failed to fetch insights', err);
      } finally {
        setLoadingInsights(false);
      }
    };
    fetchInsights();
  }, [selectedFishId, insightsRetryKey]);



  const trendChartData = {
    labels: trendData.map(d => d.month),
    datasets: [
      {
        data: trendData.map(d => d.price),
        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

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

  return (
    <View style={styles.container}>
      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'daily' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('daily')}
        >
          <Ionicons name="stats-chart-outline" size={15} color={activeTab === 'daily' ? '#fff' : '#4b5563'} style={{ marginRight: 5 }} />
          <Text style={[styles.segmentText, activeTab === 'daily' && styles.segmentTextActive]}>Daily Prices</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'insights' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('insights')}
        >
          <Ionicons name="bulb-outline" size={15} color={activeTab === 'insights' ? '#fff' : '#4b5563'} style={{ marginRight: 5 }} />
          <Text style={[styles.segmentText, activeTab === 'insights' && styles.segmentTextActive]}>Market Insights</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={() => {
          setShowDropdown(false);
        }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={() => {
          setShowDropdown(false);
        }}>
          <View>
            {activeTab === 'daily' && (
              <>
            {/* Price Fluctuation Section */}
            <View style={[styles.card, { zIndex: 10, marginBottom: 16 }]}>
            {/* Top Bar */}
            <View style={{ zIndex: 20, position: 'relative', marginBottom: 16 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderTitle}>Price Fluctuation</Text>
                
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => {
                    setShowDropdown(!showDropdown);
                  }}
                >
                  <Text
                    style={styles.dropdownText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {selectedFishName ? `${selectedFishName.sinhala_name} (${selectedFishName.common_name})` : 'Select Fish'}
                  </Text>
                  <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={16} color="#4b5563" />
                </TouchableOpacity>
              </View>

              {/* Dropdown List */}
              {showDropdown && (
                <View style={styles.dropdownListContainer}>
                  <ScrollView style={styles.dropdownList} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                    {fishList.map(fish => (
                      <TouchableOpacity
                        key={fish.fish_id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedFishId(fish.fish_id);
                          setShowDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            selectedFishId === fish.fish_id && styles.dropdownItemTextSelected
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {fish.sinhala_name} ({fish.common_name})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

        {loadingPredict ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Calculating Price...</Text>
          </View>
        ) : predictedPrice !== null && predictedFishName && weekData.length > 0 ? (
          <>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.fishName}>{predictedFishName.sinhala_name} <Text style={styles.recFishNameEnglish}>({predictedFishName.common_name})</Text></Text>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>{formatLKR(predictedPrice)}</Text>
                <View style={[styles.badge, isPositive ? styles.badgePositive : styles.badgeNegative]}>
                  <Text style={styles.badgeText}>{changeText}</Text>
                </View>
              </View>
            </View>

            {/* Chart with confidence-interval bands */}
            <View style={styles.chartWrapper}>
              <PriceFluctuationChart weekData={weekData} chartWidth={screenWidth - 64} />
            </View>

            {/* Confidence Interval label (numerical) */}
            <View style={styles.confidenceBox}>
              <Text style={styles.confidenceTitle}>90% Confidence Interval</Text>
              <Text style={styles.confidenceValue}>
                {formatLKR(minPrice)} — {formatLKR(maxPrice)}
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

            {/* Model Accuracy + Feedback */}
            <View style={{ marginTop: 16 }}>
              {accuracy !== null && (
                <View style={styles.accuracyContainer}>
                  <Ionicons name="analytics-outline" size={18} color="#2563eb" style={{ marginRight: 6 }} />
                  <Text style={styles.accuracyText}>Model Accuracy: </Text>
                  <Text style={[styles.accuracyValue, { color: accuracy >= 80 ? '#10b981' : '#f59e0b' }]}>
                    {accuracy.toFixed(1)}%
                  </Text>
                </View>
              )}

              {predictedPrice !== null && (
                feedbackGiven ? (
                  <View style={{ alignItems: 'center', marginTop: 12 }}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    <Text style={styles.feedbackThanksText}>Thanks for your feedback!</Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.accuracyText, { textAlign: 'center', marginBottom: 8 }]}>
                      Was this prediction accurate?
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
                      <TouchableOpacity
                        style={{ backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20 }}
                        onPress={() => handleFeedback(true)}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>👍 Yes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20 }}
                        onPress={() => handleFeedback(false)}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>👎 No</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              )}
            </View>

          </>
        ) : null}
            </View>

        {/* Market Trends Section – synced to Price Fluctuation fish selection */}
        <View style={[styles.card, { zIndex: 10, marginBottom: 16 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>Market Trends</Text>
            {selectedFishName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Ionicons name="fish-outline" size={14} color="#2563eb" style={{ marginRight: 4 }} />
                <Text style={{ color: '#2563eb', fontWeight: '600', fontSize: 12 }} numberOfLines={1} ellipsizeMode="tail">
                  {selectedFishName.sinhala_name} ({selectedFishName.common_name})
                </Text>
              </View>
            )}
          </View>

          {loadingTrend ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.loadingText}>Loading Trend...</Text>
            </View>
          ) : trendData.length > 0 ? (
            <View style={styles.chartWrapper}>
              <LineChart
                data={trendChartData}
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
                  labelColor: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#2563eb", fill: "#2563eb" },
                  propsForBackgroundLines: { strokeDasharray: "4 4", stroke: "#e5e7eb" }
                }}
                bezier
                style={styles.chart}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No trend data available</Text>
            </View>
          )}
        </View>

        <View style={[styles.recommendationsCard, { marginTop: 0, marginBottom: 16 }]}>
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
                      <Text style={styles.recPriceText}>{formatLKR(rec.predicted_price)}</Text>
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
                  <TouchableOpacity
                    style={styles.recDetailsBtn}
                    onPress={() => router.push(`/(root)/(tabs)/fish/${rec.fish_id}` as any)}
                  >
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

        {/* Market Alerts Section */}
        <View style={[styles.card, { zIndex: 5, marginBottom: 16 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.sectionHeaderTitle}>Market Alerts</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/market-alerts' as any)}>
              <Text style={{ color: '#2563eb', fontWeight: '600' }}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ marginTop: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f9fafb', padding: 12, borderRadius: 12 }}>
              <View style={{ backgroundColor: '#f59e0b', padding: 8, borderRadius: 20 }}>
                <Ionicons name="warning" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: '#1f2937' }}>High demand for Mackerel expected tomorrow</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>2 hours ago</Text>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f9fafb', padding: 12, borderRadius: 12 }}>
              <View style={{ backgroundColor: '#10b981', padding: 8, borderRadius: 20 }}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: '#1f2937' }}>Cod prices stabilizing</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>4 hours ago</Text>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f9fafb', padding: 12, borderRadius: 12 }}>
              <View style={{ backgroundColor: '#3b82f6', padding: 8, borderRadius: 20 }}>
                <Ionicons name="information" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: '#1f2937' }}>New fishing zone opened in North region</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>1 day ago</Text>
              </View>
            </View>
          </View>
        </View>
              </>
            )}

            {/* ═══════════ MARKET INSIGHTS TAB ═══════════ */}
            {activeTab === 'insights' && (
              <>
                {/* Header card */}
                <View style={styles.insightsHeaderCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="analytics-outline" size={22} color="#2563eb" />
                    <Text style={styles.insightsHeaderTitle}>  Market Insights</Text>
                  </View>
                  <Text style={styles.insightsHeaderSub}>
                    {selectedFishName
                      ? `${selectedFishName.sinhala_name} (${selectedFishName.common_name})`
                      : 'Select a fish species'}
                  </Text>
                </View>

                {loadingInsights ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Loading market insights...</Text>
                  </View>
                ) : insightsError ? (
                  <View style={[styles.emptyState, { padding: 24 }]}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
                    <Text style={[styles.emptyText, { marginTop: 12, color: '#ef4444', fontWeight: '600' }]}>Data Unavailable</Text>
                    <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
                      {insightsError}
                    </Text>
                    <TouchableOpacity
                      style={{ marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
                      onPress={() => { setInsightsError(null); setInsightsRetryKey(k => k + 1); }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : insightsData ? (
                  <>
                    {/* ── 1. Fuel Lag Correlation Card ── */}
                    <View style={styles.insightCard}>
                      <View style={styles.insightCardRow}>
                        <View style={[styles.insightIconWrap, { backgroundColor: '#fef3c7' }]}>
                          <Ionicons name="flame-outline" size={22} color="#d97706" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.insightCardTitle}>Fuel Price Impact</Text>
                          <Text style={styles.insightCardSub}>Kerosene price with 6-week lag</Text>
                        </View>
                        <View style={styles.correlationBadge}>
                          <Text style={styles.correlationBadgeText}>r = {insightsData.insights.correlation_score.toFixed(3)}</Text>
                        </View>
                      </View>
                      <View style={styles.fuelRow}>
                        <View style={styles.fuelStat}>
                          <Text style={styles.fuelStatLabel}>Lag</Text>
                          <Text style={styles.fuelStatValue}>{insightsData.insights.fuel_lag_weeks} weeks</Text>
                        </View>
                        <View style={styles.fuelDivider} />
                        <View style={styles.fuelStat}>
                          <Text style={styles.fuelStatLabel}>Kerosene (LKR/L)</Text>
                          <Text style={styles.fuelStatValue}>{formatLKR(insightsData.insights.current_lk_price)}</Text>
                        </View>
                        <View style={styles.fuelDivider} />
                        <View style={styles.fuelStat}>
                          <Text style={styles.fuelStatLabel}>Correlation</Text>
                          <Text style={[styles.fuelStatValue, { color: '#d97706' }]}>✓ Positive</Text>
                        </View>
                      </View>
                    </View>

                    {/* ── 2. Price Elasticity Badge ── */}
                    <View style={styles.insightCard}>
                      <View style={styles.insightCardRow}>
                        <View style={[styles.insightIconWrap, { backgroundColor: insightsData.insights.current_elasticity <= -2 ? '#fee2e2' : insightsData.insights.current_elasticity <= -1.4 ? '#fef3c7' : '#d1fae5' }]}>
                          <Ionicons name="pulse-outline" size={22} color={insightsData.insights.current_elasticity <= -2 ? '#dc2626' : insightsData.insights.current_elasticity <= -1.4 ? '#d97706' : '#10b981'} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.insightCardTitle}>Price Sensitivity</Text>
                          <Text style={styles.insightCardSub}>{insightsData.fish.sinhala_name} ({insightsData.fish.common_name})</Text>
                        </View>
                        <View style={[
                          styles.elasticityBadge,
                          {
                            backgroundColor: insightsData.insights.current_elasticity <= -2 ? '#fecaca' :
                              insightsData.insights.current_elasticity <= -1.4 ? '#fef3c7' : '#d1fae5'
                          }
                        ]}>
                          <Text style={[
                            styles.elasticityBadgeText,
                            {
                              color: insightsData.insights.current_elasticity <= -2 ? '#991b1b' :
                                insightsData.insights.current_elasticity <= -1.4 ? '#92400e' : '#065f46'
                            }
                          ]}>
                            e = {insightsData.insights.current_elasticity.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.elasticityBar}>
                        <Text style={styles.elasticityLabel}>{insightsData.insights.elasticity_label}</Text>
                        <Text style={styles.elasticityHint}>
                          {insightsData.insights.current_elasticity <= -2
                            ? 'A 1% price rise reduces demand by 2%+'
                            : insightsData.insights.current_elasticity <= -1.4
                            ? 'A 1% price rise reduces demand by ~1.5%'
                            : 'Demand is relatively stable versus price changes'}
                        </Text>
                      </View>
                    </View>

                    {/* ── 3. Season / Holiday Alert ── */}
                    <View style={[styles.insightCard, { borderLeftWidth: 4, borderLeftColor: insightsData.insights.is_holiday_period ? '#f59e0b' : '#3b82f6' }]}>
                      <View style={styles.insightCardRow}>
                        <View style={[styles.insightIconWrap, { backgroundColor: insightsData.insights.is_holiday_period ? '#fef3c7' : '#dbeafe' }]}>
                          <Ionicons name={insightsData.insights.is_holiday_period ? 'calendar-outline' : 'partly-sunny-outline'} size={22} color={insightsData.insights.is_holiday_period ? '#d97706' : '#3b82f6'} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.insightCardTitle}>{insightsData.insights.current_season}</Text>
                          <Text style={styles.insightCardSub}>{insightsData.insights.season_price_impact} price impact</Text>
                        </View>
                        {insightsData.insights.is_holiday_period && (
                          <View style={styles.holidayBadge}>
                            <Text style={styles.holidayBadgeText}>+{insightsData.insights.holiday_lift}% Holiday</Text>
                          </View>
                        )}
                      </View>
                      {insightsData.insights.season_alert !== '' && (
                        <View style={styles.alertRow}>
                          <Ionicons name="information-circle-outline" size={16} color="#d97706" />
                          <Text style={styles.alertRowText}> {insightsData.insights.season_alert}</Text>
                        </View>
                      )}
                      <View style={styles.alertRow}>
                        <Ionicons name={insightsData.insights.weather_factor > 1.05 ? 'thunderstorm-outline' : 'cloud-outline'} size={16} color="#6b7280" />
                        <Text style={styles.alertRowText}> Weather: {insightsData.insights.weather_label}</Text>
                      </View>
                    </View>

                    {/* ── 4. KNN vs ML Prediction Chart ── */}
                    <View style={styles.insightCard}>
                      <Text style={styles.insightCardTitle}>ML Prediction vs KNN Baseline</Text>
                      <Text style={[styles.insightCardSub, { marginBottom: 12 }]}>Compared with similar-weather historical average</Text>
                      {insightsData.prediction_7_days.length > 0 && (
                        <View style={styles.chartWrapper}>
                          <LineChart
                            data={{
                              labels: insightsData.labels,
                              datasets: [
                                {
                                  data: insightsData.prediction_7_days,
                                  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                                  strokeWidth: 2,
                                },
                                {
                                  data: insightsData.knn_baseline.length === insightsData.prediction_7_days.length
                                    ? insightsData.knn_baseline
                                    : insightsData.prediction_7_days.map(p => p * 0.97),
                                  color: (opacity = 1) => `rgba(217, 119, 6, ${opacity})`,
                                  strokeWidth: 2,
                                },
                              ],
                              legend: ['ML Prediction', 'KNN Baseline'],
                            }}
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
                              color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                              labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
                              style: { borderRadius: 16 },
                              propsForDots: { r: '3', strokeWidth: '2' },
                              propsForBackgroundLines: { strokeDasharray: '4 4', stroke: '#e5e7eb' },
                            }}
                            bezier
                            style={styles.chart}
                          />
                        </View>
                      )}
                      {/* Chart legend */}
                      <View style={styles.legendContainer}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                          <Text style={styles.legendText}>ML Prediction</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#d97706' }]} />
                          <Text style={styles.legendText}>KNN Baseline</Text>
                        </View>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="analytics-outline" size={48} color="#d1d5db" />
                    <Text style={[styles.emptyText, { marginTop: 12 }]}>No Data Available</Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
                      Select a fish species to load market insights.
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
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
    maxWidth: 200,
    minWidth: 140,
  },
  dropdownText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
    maxWidth: 170,
  },
  dropdownListContainer: {
    position: 'relative',
    marginTop: 8,
    width: '100%',
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
    maxHeight: 220,
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
  },

  // ── Segmented Control ──────────────────────────────────────────────────────
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    margin: 16,
    marginBottom: 4,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  segmentTextActive: {
    color: '#ffffff',
  },

  // ── Market Insights cards ──────────────────────────────────────────────────
  insightsHeaderCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  insightsHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  insightsHeaderSub: {
    fontSize: 14,
    color: '#3b82f6',
    marginTop: 4,
  },
  insightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  insightCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  insightCardSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  // Correlation badge (r = 0.351)
  correlationBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  correlationBadgeText: {
    color: '#92400e',
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Fuel stats row
  fuelRow: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  fuelStat: {
    flex: 1,
    alignItems: 'center',
  },
  fuelDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e5e7eb',
  },
  fuelStatLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
    textAlign: 'center',
  },
  fuelStatValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },

  // Elasticity badge
  elasticityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  elasticityBadgeText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  elasticityBar: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
  },
  elasticityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  elasticityHint: {
    fontSize: 12,
    color: '#6b7280',
  },

  // Season/holiday alert
  holidayBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  holidayBadgeText: {
    color: '#92400e',
    fontWeight: 'bold',
    fontSize: 12,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 8,
  },
  alertRowText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
});

