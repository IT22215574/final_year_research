import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Path, Line as SvgLine, Text as SvgText, Circle } from 'react-native-svg';
import * as Notifications from 'expo-notifications';
import { getPredictionApiBaseUrls } from '@/src/config/api';
import useAuthStore from '@/stores/authStore';

const screenWidth = Dimensions.get('window').width;

/** Format a number as Sri Lankan Rupees: Rs. 1,250 */
const formatLKR = (amount: number | null | undefined): string => {
  if (amount == null || isNaN(amount)) return 'Rs. --';
  return `Rs. ${Math.round(amount).toLocaleString('en-LK')}`;
};

/** Normalise district field (can be string or object) */
const getDistrictName = (district: { name?: string } | string | undefined): string => {
  if (!district) return '';
  if (typeof district === 'string') return district;
  return district.name ?? '';
};

/**
 * Adjust a Peliyagoda base price to the user's local zone.
 * Coastal  (near ports)  → -10%
 * Inland   (transport)   → +12%
 * Main Hub (Colombo)     →   0%
 */
const calculateLocalPrice = (basePrice: number, zone: string | undefined): number => {
  if (zone === 'Coastal') return Math.round(basePrice * 0.90);
  if (zone === 'Inland')  return Math.round(basePrice * 1.12);
  return Math.round(basePrice);
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

interface FavoriteItem {
  fish_id: number;
  sinhala_name: string;
  common_name: string;
  predicted_price: number;
  date_added: string;
}

interface ElasticityItem {
  name: string;
  elasticity: number; // negative value
}

interface DemandDay {
  date: string;
  score: number;       // 0–1
  label: string;      // 'Low' | 'Normal' | 'High' | 'Very High'
  color: string;
  festival: string;
  spike_risk: boolean;
}

interface PredictionReason {
  icon: string;      // Ionicons name
  text: string;
  impact: 'up' | 'down' | 'neutral';
}

interface MarketAlert {
  type: string;          // 'warning' | 'danger' | 'success' | 'info'
  icon: string;          // Ionicons name
  color: string;
  title: string;
  description: string;
  age: string;           // human readable time label
}

interface FeatureImportanceItem {
  feature: string;
  label: string;
  category: string;
  color: string;
  rf: number;    // Random Forest importance % (0–100)
  gb: number;    // Gradient Boost importance % (0–100)
  avg: number;   // average of both
}

interface InsightsData {
  fish: { fish_id: number; sinhala_name: string; common_name: string };
  labels: string[];
  prediction_7_days: number[];
  knn_baseline: number[];
  demand_sentiment_7_days: DemandDay[];
  price_spike_warning: boolean;
  price_spike_day: string;
  data_as_of?: string;  // ISO datetime when data was computed server-side
  insights: {
    fuel_lag_weeks: number;
    correlation_score: number;
    current_lk_price: number;
    fuel_avg_90d: number;         // 90-day average — baseline for HIGH/NORMAL/LOW
    fuel_level: 'HIGH' | 'NORMAL' | 'LOW';  // compared to 90-day avg ± 0.5σ
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

// ── Elasticity Comparison Chart ───────────────────────────────────────────
function ElasticityChart({ items, highlighted }: {
  items: ElasticityItem[];
  highlighted: string | null;
}) {
  // Max bar width: screen − outer padding(32) − card padding(32) − label(120) − value(42)
  const barMaxW = screenWidth - 32 - 32 - 120 - 42;
  const maxAbs  = 3.0;

  const barColor = (absE: number, isCurrent: boolean) => {
    if (isCurrent) return '#2563eb';
    if (absE >= 2.0) return '#dc2626';
    if (absE >= 1.5) return '#f59e0b';
    if (absE >= 1.0) return '#10b981';
    return '#94a3b8';
  };

  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ backgroundColor: '#fce7f3', borderRadius: 10, padding: 8, marginRight: 10 }}>
          <Ionicons name="git-compare-outline" size={22} color="#db2777" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>📉 Price Elasticity by Fish Type</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>How fast demand drops when price rises</Text>
        </View>
      </View>

      {/* Bar rows */}
      {items.map((item, i) => {
        const absE      = Math.abs(item.elasticity);
        const barW      = Math.round((absE / maxAbs) * barMaxW);
        const isCurrent = highlighted === item.name;
        const color     = barColor(absE, isCurrent);
        return (
          <View key={i} style={{ marginBottom: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Fish label */}
              <Text
                numberOfLines={1}
                style={{ width: 120, fontSize: 11,
                  color: isCurrent ? '#2563eb' : '#374151',
                  fontWeight: isCurrent ? '700' : '400' }}
              >
                {item.name}{isCurrent ? ' ◀' : ''}
              </Text>
              {/* Bar track + fill */}
              <View style={{ flex: 1, height: 13, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: barW, height: '100%', backgroundColor: color, borderRadius: 4,
                               borderWidth: isCurrent ? 1 : 0, borderColor: '#1d4ed8' }} />
              </View>
              {/* Value */}
              <Text style={{ width: 38, fontSize: 10, color: color, fontWeight: '700',
                             textAlign: 'right', marginLeft: 4 }}>
                {item.elasticity.toFixed(2)}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Axis labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between',
                     marginLeft: 120, marginTop: 4, marginRight: 42 }}>
        <Text style={{ fontSize: 9, color: '#9ca3af' }}>Stable ↟ slow drop</Text>
        <Text style={{ fontSize: 9, color: '#9ca3af' }}>Very sensitive ↟ fast drop</Text>
      </View>

      {/* Colour legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10,
                     borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }}>
        {([
          ['#dc2626', 'Very High (>2.0)'],
          ['#f59e0b', 'High (1.5–2.0)'],
          ['#10b981', 'Medium (1.0–1.5)'],
          ['#94a3b8', 'Low (<1.0)'],
          ['#2563eb', 'You selected'],
        ] as [string, string][]).map(([c, lbl]) => (
          <View key={lbl} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} />
            <Text style={{ fontSize: 10, color: '#6b7280' }}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* Reading tip */}
      <View style={{ backgroundColor: '#fce7f3', borderRadius: 10, padding: 10, marginTop: 10 }}>
        <Text style={{ fontSize: 12, color: '#831843', lineHeight: 18 }}>
          💡 <Text style={{ fontWeight: '600' }}>How to read this:</Text> A longer bar means demand
          drops faster when prices rise. Squid buyers switch to alternatives quickly;
          Swordfish buyers are less price-sensitive.
        </Text>
      </View>
    </View>
  );
}

// ── Feature Importance Chart ─────────────────────────────────────────────────
function FeatureImportanceChart({ items }: { items: FeatureImportanceItem[] }) {
  if (items.length === 0) return null;
  const maxVal = Math.max(...items.map(f => f.rf), 1);
  const CATEGORY_NAMES: Record<string, string> = {
    fuel: 'Fuel / Cost', weather: 'Weather', demand: 'Demand / Calendar',
    season: 'Season', time: 'Time', fish: 'Fish Species',
  };

  // Derive unique categories present in visible items
  const visibleCats = Array.from(new Set(items.map(i => i.category)));

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <View style={{ backgroundColor: '#ecfdf5', borderRadius: 10, padding: 8, marginRight: 10 }}>
          <Ionicons name="bar-chart-outline" size={22} color="#059669" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 15, color: '#1f2937' }}>Feature Importance</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>What drives fish price predictions</Text>
        </View>
      </View>

      {/* Model badge row */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, marginTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff',
                       borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' }} />
          <Text style={{ fontSize: 11, color: '#1d4ed8', fontWeight: '600' }}>Random Forest</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed',
                       borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ea580c' }} />
          <Text style={{ fontSize: 11, color: '#c2410c', fontWeight: '600' }}>Gradient Boost</Text>
        </View>
      </View>

      {/* Bars */}
      {items.map((feat, i) => {
        const rfBar  = (feat.rf  / maxVal) * 100;
        const gbBar  = (feat.gb  / maxVal) * 100;
        return (
          <View key={feat.feature} style={{ marginBottom: i < items.length - 1 ? 10 : 0 }}>
            {/* Label row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between',
                           alignItems: 'center', marginBottom: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: feat.color }} />
                <Text style={{ fontSize: 12, color: '#374151', fontWeight: '500', flexShrink: 1 }}
                      numberOfLines={1}>
                  {feat.label}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>
                RF {feat.rf.toFixed(1)}%
              </Text>
            </View>
            {/* RF bar */}
            <View style={{ height: 9, backgroundColor: '#f1f5f9', borderRadius: 6, overflow: 'hidden', marginBottom: 2 }}>
              <View style={{ width: `${rfBar}%`, height: '100%',
                             backgroundColor: feat.color, borderRadius: 6, opacity: 0.9 }} />
            </View>
            {/* GB bar (thinner, slightly transparent) */}
            <View style={{ height: 5, backgroundColor: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
              <View style={{ width: `${gbBar}%`, height: '100%',
                             backgroundColor: '#ea580c', borderRadius: 6, opacity: 0.55 }} />
            </View>
          </View>
        );
      })}

      {/* Category colour legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14,
                     borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }}>
        {visibleCats.map(cat => {
          const colour = items.find(i => i.category === cat)?.color ?? '#6b7280';
          return (
            <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colour }} />
              <Text style={{ fontSize: 10, color: '#6b7280' }}>
                {CATEGORY_NAMES[cat] ?? cat}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Thesis reading tip */}
      <View style={{ backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginTop: 10 }}>
        <Text style={{ fontSize: 12, color: '#065f46', lineHeight: 18 }}>
          💡 <Text style={{ fontWeight: '700' }}>Thesis note:</Text> A longer bar indicates a
          higher contribution to the model prediction. Fuel price lags, wind speed, and
          festival signals are typically the strongest price drivers in Sri Lankan fish markets.
        </Text>
      </View>
    </View>
  );
}

// ── Market Demand Meter ─────────────────────────────────────────────────────
function MarketDemandMeter({ days, spikeWarning, spikeDay }: {
  days: DemandDay[];
  spikeWarning: boolean;
  spikeDay: string;
}) {
  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ backgroundColor: '#ede9fe', borderRadius: 10, padding: 8, marginRight: 10 }}>
          <Ionicons name="pulse-outline" size={22} color="#7c3aed" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>📊 Market Demand Meter</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Demand sentiment for the next 7 days</Text>
        </View>
      </View>

      {/* Price spike warning banner */}
      {spikeWarning && (
        <View style={{ flexDirection: 'row', backgroundColor: '#fef2f2', borderRadius: 10, padding: 10,
                       borderLeftWidth: 4, borderLeftColor: '#dc2626', marginBottom: 12, gap: 8, alignItems: 'flex-start' }}>
          <Ionicons name="warning-outline" size={18} color="#dc2626" />
          <Text style={{ flex: 1, fontSize: 13, color: '#991b1b', lineHeight: 20 }}>
            <Text style={{ fontWeight: '700' }}>⚠️ Price Spike Risk</Text>{' '}on{' '}
            <Text style={{ fontWeight: '700' }}>{spikeDay}</Text>: bad weather + high demand detected.
            Consider buying earlier.
          </Text>
        </View>
      )}

      {/* 7-bar demand chart */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 90 }}>
        {days.map((day, i) => {
          const barH = Math.round(day.score * 72);
          return (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              {/* Festival badge above bar */}
              {day.festival ? (
                <View style={{ backgroundColor: '#fef3c7', borderRadius: 4, paddingHorizontal: 4,
                               paddingVertical: 1, marginBottom: 2, maxWidth: 44 }}>
                  <Text style={{ fontSize: 8, color: '#92400e', textAlign: 'center' }} numberOfLines={1}>
                    {day.festival.replace(/ 🎊| 🎄| 🎆| 🪔/, '')}
                  </Text>
                </View>
              ) : <View style={{ height: 14 }} />}
              {/* Bar */}
              <View style={{ width: 28, height: barH, backgroundColor: day.color,
                             borderRadius: 6, opacity: day.spike_risk ? 1 : 0.82 }} />
              {/* Score % */}
              <Text style={{ fontSize: 10, color: day.color, fontWeight: '700', marginTop: 3 }}>
                {Math.round(day.score * 100)}%
              </Text>
              {/* Date label */}
              <Text style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>{day.date}</Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {([['#6b7280','Low'],['#10b981','Normal'],['#f59e0b','High'],['#dc2626','Very High']] as [string,string][]).map(
          ([color, label]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
              <Text style={{ fontSize: 11, color: '#6b7280' }}>{label}</Text>
            </View>
          )
        )}
      </View>

      {/* How it works */}
      <View style={{ backgroundColor: '#f5f3ff', borderRadius: 10, padding: 10, marginTop: 10 }}>
        <Text style={{ fontSize: 12, color: '#5b21b6', lineHeight: 18 }}>
          💡 <Text style={{ fontWeight: '600' }}>How it works:</Text> Score is derived from
          festival calendar, price elasticity, and weather conditions. A score above 60% with
          bad weather triggers a ⚠️ Price Spike Risk.
        </Text>
      </View>
    </View>
  );
}

// Reusable error card shown when any section fails to load
function DataUnavailableCard({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#ef4444', marginTop: 12 }}>Data Unavailable</Text>
      <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
        {message ?? 'Unable to reach the prediction server. Check your network connection.'}
      </Text>
      {onRetry && (
        <TouchableOpacity
          style={{ marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}
          onPress={onRetry}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

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

  // Current user — needed early for per-account favorites storage key
  const currentUser = useAuthStore(s => s.currentUser);
  // Each account gets its own favorites list (key = favoriteItems_<userId>)
  const favStorageKey = `favoriteItems_${currentUser?.id ?? 'guest'}`;

  // Recommendations state
  const [budget, setBudget] = useState<number>(1000);
  const [preference, setPreference] = useState<string>('profitable');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recsLastUpdated, setRecsLastUpdated] = useState<string | null>(null);  // HH:MM of last successful fetch
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);

  // Load favorites from storage — re-runs when user account changes
  useEffect(() => {
    setFavoriteItems([]); // clear previous user's favorites immediately
    AsyncStorage.getItem(favStorageKey).then(stored => {
      if (stored) { try { setFavoriteItems(JSON.parse(stored)); } catch {} }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Persist favorites under the current user's key whenever they change
  useEffect(() => {
    AsyncStorage.setItem(favStorageKey, JSON.stringify(favoriteItems));
  }, [favStorageKey, favoriteItems]);

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

  // Elasticity comparison chart
  const [elasticityItems, setElasticityItems] = useState<ElasticityItem[]>([]);
  const [elasticityHighlight, setElasticityHighlight] = useState<string | null>(null);

  // Per-section error states for Daily Prices tab
  const [predictError, setPredictError] = useState<string | null>(null);
  const [, setPredictRetryKey] = useState(0);
  const [predictionReasons, setPredictionReasons] = useState<PredictionReason[]>([]);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [trendRetryKey, setTrendRetryKey] = useState(0);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [recsRetryKey, setRecsRetryKey] = useState(0);

  const [marketAlerts, setMarketAlerts] = useState<MarketAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [featureImportance, setFeatureImportance] = useState<FeatureImportanceItem[]>([]);

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
    const fetchAlerts = async () => {
      setLoadingAlerts(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const data = await predictionRequest<{ alerts: MarketAlert[] }>(
          `/alerts?date=${today}`,
          { method: 'GET' },
          8000,
        );
        setMarketAlerts(data.alerts ?? []);
      } catch (err) {
        console.error('Market alerts fetch failed', err);
        setMarketAlerts([]);
      } finally {
        setLoadingAlerts(false);
      }
    };
    fetchAlerts();
  }, []);

  useEffect(() => {
    const loadFeatureImportance = async () => {
      try {
        const data = await predictionRequest<{ features: FeatureImportanceItem[] }>(
          '/feature-importance',
          { method: 'GET' },
          8000,
        );
        setFeatureImportance(data.features ?? []);
      } catch (err) {
        console.error('Feature importance fetch failed', err);
      }
    };
    loadFeatureImportance();
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
    setPredictError(null);
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
      setPredictionReasons((data.reasons ?? []) as PredictionReason[]);

      // Check if tomorrow's price is lower than today's
      if (data.series && data.series.length > 16) {
        const todayPrice = data.series[15].price;
        const tomorrowPrice = data.series[16].price;
        
        if (tomorrowPrice < todayPrice) {
          const fishName = fishList.find(f => f.fish_id === selectedFishId)?.common_name || 'fish';
          const diff = (todayPrice - tomorrowPrice).toFixed(2);
          
          // Request permissions if not already granted
          const { status } = await Notifications.getPermissionsAsync().catch(() => ({ status: 'denied' }));
          if (status !== 'granted') {
            await Notifications.requestPermissionsAsync().catch(() => null);
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
      const msg = err instanceof Error ? err.message : 'Please check the prediction server and try again.';
      setPredictError(msg);
      setPredictionReasons([]);
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

  // ── Location-aware pricing ─────────────────────────────────────────────────
  const userZone      = currentUser?.zone ?? 'Main Hub';
  const userDistrict  = getDistrictName(currentUser?.district);
  const locationLabel = userDistrict
    ? `Price adjusted for ${userDistrict} (${userZone} zone)`
    : 'Price at Peliyagoda Base Market';

  // Get 7 days of data starting from today (index 15 in the 31-day series)
  const weekData = priceHistory.length > 15 ? priceHistory.slice(15, 22) : [];
  // Apply zone multiplier to chart data too
  const adjustedWeekData: PriceHistory[] = weekData.map(d => ({
    ...d,
    price: calculateLocalPrice(d.price, userZone),
  }));
  
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
      setTrendError(null);
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
      } catch (err: any) {
        console.error('Failed to fetch trend data', err);
        setTrendError(String(err?.message ?? 'Unable to reach the prediction server. Check your network connection.'));
      } finally {
        setLoadingTrend(false);
      }
    };
    fetchTrend();
  }, [selectedFishId, trendRetryKey]);

  // Fetch Elasticity chart data whenever selected fish changes
  useEffect(() => {
    const fetchElasticity = async () => {
      try {
        const qs = selectedFishId ? `?fish_id=${selectedFishId}` : '';
        const data = await predictionRequest<{ items: ElasticityItem[]; highlighted: string | null }>(
          `/elasticity${qs}`, { method: 'GET' }, 8000,
        );
        setElasticityItems(data.items ?? []);
        setElasticityHighlight(data.highlighted ?? null);
      } catch (err) {
        console.warn('Elasticity fetch failed', err);
      }
    };
    fetchElasticity();
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
      setRecsError(null);
      try {
        const dateStr = new Date().toISOString().split('T')[0];
        const data = await predictionRequest<any>(
          '/recommend',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ budget: budget === 9999 ? 99999 : budget, date: dateStr, preference, favorite_fish_ids: favoriteItems.map(f => f.fish_id) }),
          },
          12000,
        );
        setRecommendations(data.recommendations || []);
        // Record the time this data was last successfully loaded
        const now = new Date();
        setRecsLastUpdated(
          `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        );
      } catch (err: any) {
        console.error('Failed to fetch recommendations', err);
        setRecsError(String(err?.message ?? 'Unable to reach the prediction server. Check your network connection.'));
      } finally {
        setLoadingRecs(false);
      }
    };
    fetchRecommendations();
  }, [budget, preference, favoriteItems, recsRetryKey]);

  const favIds = favoriteItems.map(f => f.fish_id);

  const toggleFavorite = (rec: any) => {
    setFavoriteItems(prev => {
      if (prev.some(f => f.fish_id === rec.fish_id)) {
        return prev.filter(f => f.fish_id !== rec.fish_id);
      }
      return [
        ...prev,
        {
          fish_id: rec.fish_id,
          sinhala_name: rec.sinhala_name,
          common_name: rec.common_name,
          predicted_price: rec.predicted_price ?? 0,
          date_added: new Date().toISOString().split('T')[0],
        },
      ];
    });
  };

  // Filtered recommendations — API already applies budget + seasonal filter server-side.
  // Client only needs to merge locally-saved favorites for the Popular tab.
  const filteredRecs: any[] = (() => {
    if (preference === 'popular') {
      const isAbove2k = budget === 9999;
      const inBudget = (price: number) => isAbove2k ? price > 2000 : price <= budget;
      // Favorites stored locally (may not be returned by API if they're out of budget)
      const favInBudget = favoriteItems
        .filter(f => inBudget(f.predicted_price))
        .map(f => ({ ...f, tag: 'Popular Fish', isFavorite: true }));
      // Merge API results + local favorites, deduplicating by fish_id
      const seen = new Set<number>();
      const merged: any[] = [];
      [...recommendations, ...favInBudget].forEach(item => {
        if (!seen.has(item.fish_id)) { seen.add(item.fish_id); merged.push(item); }
      });
      return merged;
    }
    // seasonal / profitable: API already returned the correct filtered list
    return recommendations;
  })();

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
                    {selectedFishName ? selectedFishName.common_name : 'Select Fish'}
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
                          {fish.common_name}
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
        ) : predictError ? (
          <DataUnavailableCard
            message="Unable to reach the prediction server. Check your network connection."
            onRetry={() => { setPredictError(null); setPredictRetryKey(k => k + 1); handlePredictPrice(); }}
          />
        ) : predictedPrice !== null && predictedFishName && weekData.length > 0 ? (
          <>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.fishName}>{predictedFishName.common_name}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>{formatLKR(calculateLocalPrice(predictedPrice, userZone))}</Text>
                <View style={[styles.badge, isPositive ? styles.badgePositive : styles.badgeNegative]}>
                  <Text style={styles.badgeText}>{changeText}</Text>
                </View>
              </View>
            </View>
            {/* Location note */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, marginTop: -4 }}>
              <Ionicons name="location-outline" size={13} color="#6b7280" />
              <Text style={{ fontSize: 11, color: '#6b7280' }}>{locationLabel}</Text>
            </View>

            {/* Chart with confidence-interval bands */}
            <View style={styles.chartWrapper}>
              <PriceFluctuationChart weekData={adjustedWeekData} chartWidth={screenWidth - 64} />
            </View>

            {/* Confidence Interval label (numerical) */}
            <View style={styles.confidenceBox}>
              <Text style={styles.confidenceTitle}>90% Confidence Interval</Text>
              <Text style={styles.confidenceValue}>
                {formatLKR(calculateLocalPrice(minPrice ?? 0, userZone))} — {formatLKR(calculateLocalPrice(maxPrice ?? 0, userZone))}
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

            {/* ── Why This Price? (XAI) ─────────────────────────── */}
            {predictionReasons.length > 0 && (
              <View style={{
                backgroundColor: '#f0fdf4',
                borderRadius: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#10b981',
                padding: 14,
                marginTop: 14,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Ionicons name="information-circle-outline" size={18} color="#059669" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#065f46', marginLeft: 6 }}>
                    Why this price?
                  </Text>
                </View>
                {predictionReasons.map((reason, i) => {
                  const dotColor =
                    reason.impact === 'up'   ? '#ef4444' :
                    reason.impact === 'down' ? '#10b981' : '#6b7280';
                  const arrowIcon =
                    reason.impact === 'up'   ? 'arrow-up-outline' :
                    reason.impact === 'down' ? 'arrow-down-outline' : 'remove-outline';
                  return (
                    <View
                      key={i}
                      style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}
                    >
                      <View style={{
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: dotColor + '1a',
                        alignItems: 'center', justifyContent: 'center', marginTop: 1,
                      }}>
                        <Ionicons name={arrowIcon as any} size={14} color={dotColor} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 18, paddingTop: 3 }}>
                        {reason.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

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
                  {selectedFishName.common_name}
                </Text>
              </View>
            )}
          </View>

          {loadingTrend ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.loadingText}>Loading Trend...</Text>
            </View>
          ) : trendError ? (
            <DataUnavailableCard
              message="Unable to load market trend data. Check your network connection."
              onRetry={() => { setTrendError(null); setTrendRetryKey(k => k + 1); }}
            />
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
            {[500, 1000, 1500, 2000, 9999].map(b => (
              <TouchableOpacity
                key={b}
                style={[styles.budgetBtn, budget === b && styles.budgetBtnActive]}
                onPress={() => setBudget(b)}
              >
                <Text style={[styles.budgetText, budget === b && styles.budgetTextActive]}>
                  {b === 9999 ? 'Rs. 2000+' : `Rs. ${b}`}
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
            <Text style={styles.timeText}>
                {recsLastUpdated ? `Last Updated: ${recsLastUpdated}` : 'Loading...'}
            </Text>
          </View>

          {loadingRecs ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 20 }} />
          ) : recsError ? (
            <DataUnavailableCard
              message="Unable to load fish recommendations. Check your network connection."
              onRetry={() => { setRecsError(null); setRecsRetryKey(k => k + 1); }}
            />
          ) : filteredRecs.length > 0 ? (
            filteredRecs.map((rec, index) => {
              const isFav = favIds.includes(rec.fish_id);
              // In popular tab, also show a "my favorite" badge
              const isPopularFav = preference === 'popular' && isFav;
              return (
                <View key={`${rec.fish_id}-${index}`} style={[
                  styles.recItem,
                  isPopularFav && { borderLeftWidth: 3, borderLeftColor: '#ec4899' },
                ]}>
                  <View style={styles.recItemHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recFishName}>
                        {rec.common_name}
                      </Text>
                      {isPopularFav && rec.date_added && (
                        <Text style={{ fontSize: 11, color: '#ec4899', marginTop: 2 }}>❤️ Favourite since: {rec.date_added}</Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <View style={styles.recPriceBadge}>
                          <Text style={styles.recPriceText}>{formatLKR(calculateLocalPrice(rec.predicted_price, userZone))}</Text>
                        </View>
                        {userDistrict ? (
                          <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{userDistrict}</Text>
                        ) : null}
                      </View>
                      <TouchableOpacity onPress={() => toggleFavorite(rec)}>
                        <Ionicons
                          name={isFav ? 'heart' : 'heart-outline'}
                          size={24}
                          color={isFav ? '#ec4899' : '#9ca3af'}
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
                      ? '💹 Lower price today — great value'
                      : rec.tag === 'Seasonal Fish'
                      ? `🌊 In season now — ${rec.season_name ?? 'Seasonal'}`
                      : rec.isFavorite
                      ? '❤️ Your favourite fish'
                      : '⭐ Popular fish — fair price'}
                  </Text>

                  <View style={styles.recActionRow}>
                    <TouchableOpacity
                      style={styles.recDetailsBtn}
                      onPress={() => router.push(`/(root)/(tabs)/fish/${rec.fish_id}` as any)}
                    >
                      <Text style={styles.recDetailsText}>Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.recBuyBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }]}
                      onPress={() => {
                        router.push({
                          pathname: '/(root)/(tabs)/fish-map' as any,
                          params: { district: userDistrict || 'Colombo', zone: userZone },
                        });
                      }}
                    >
                      <Ionicons name="location-outline" size={14} color="#ffffff" />
                      <Text style={styles.recBuyText}>Find Near Me</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.noRecsText}>
              {preference === 'seasonal' ? 'No seasonal fish available in this budget range.' :
               preference === 'popular' ? 'No popular / favourite fish in this budget range.' :
               preference === 'profitable' ? 'No profitable fish available in this budget range.' :
               'No fish available in this budget range.'}
            </Text>
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
            {loadingAlerts ? (
              <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 16 }} />
            ) : marketAlerts.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <Ionicons name="checkmark-circle-outline" size={36} color="#10b981" />
                <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                  No active market alerts right now
                </Text>
              </View>
            ) : (
              marketAlerts.map((alert, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                    backgroundColor: alert.color + '14',
                    borderLeftWidth: 3, borderLeftColor: alert.color,
                    padding: 12, borderRadius: 12,
                  }}
                >
                  <View style={{ backgroundColor: alert.color, padding: 8, borderRadius: 20, marginTop: 2 }}>
                    <Ionicons name={alert.icon as any} size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#1f2937', fontSize: 13 }}>{alert.title}</Text>
                    <Text style={{ fontSize: 12, color: '#4b5563', marginTop: 3, lineHeight: 17 }}>{alert.description}</Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{alert.age}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
              </>
            )}

            {/* ═══════════ MARKET INSIGHTS TAB ═══════════ */}
            {activeTab === 'insights' && (
              <>
                {/* Header */}
                <View style={styles.insightsHeaderCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="bulb-outline" size={22} color="#2563eb" />
                    <Text style={styles.insightsHeaderTitle}>  Market Insights</Text>
                  </View>
                  <Text style={styles.insightsHeaderSub}>
                    {selectedFishName
                      ? selectedFishName.common_name
                      : 'Please select a fish species'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Useful insights for buyers, fishermen and traders
                    {insightsData?.data_as_of ? ` · Data as of ${insightsData.data_as_of}` : ''}
                  </Text>
                </View>

                {loadingInsights ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Loading insights...</Text>
                  </View>
                ) : insightsError ? (
                  <View style={[styles.emptyState, { padding: 24 }]}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
                    <Text style={[styles.emptyText, { marginTop: 12, color: '#ef4444', fontWeight: '600' }]}>No Connection</Text>
                    <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
                      Could not connect to server. Check WiFi/network.
                    </Text>
                    <TouchableOpacity
                      style={{ marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
                      onPress={() => { setInsightsError(null); setInsightsRetryKey(k => k + 1); }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
                    </TouchableOpacity>
                  </View>
                ) : insightsData ? (
                  <>
                    {/* ── Quick Summary Strip ── */}
                    {(() => {
                      const e = insightsData.insights.current_elasticity;
                      const isHoliday = insightsData.insights.is_holiday_period;
                      // Use API-computed level (HIGH if > 90d avg + 0.5σ, LOW if < 90d avg − 0.5σ)
                      const fuelHigh = insightsData.insights.fuel_level === 'HIGH';
                      const priceTomorrow = insightsData.prediction_7_days[1] ?? insightsData.prediction_7_days[0];
                      const priceToday = insightsData.prediction_7_days[0];
                      const priceUp = priceTomorrow > priceToday;
                      return (
                        <View style={{ backgroundColor: '#eff6ff', borderRadius: 16, padding: 14, marginBottom: 12, gap: 8 }}>
                          <Text style={{ fontWeight: '700', color: '#1d4ed8', fontSize: 14, marginBottom: 2 }}>📋 Quick Summary</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                            <Text style={{ fontSize: 18 }}>{priceUp ? '📈' : '📉'}</Text>
                            <Text style={{ flex: 1, color: '#1f2937', fontSize: 13, lineHeight: 20 }}>
                              {"Tomorrow's"} price is expected to <Text style={{ fontWeight: '700', color: priceUp ? '#dc2626' : '#059669' }}>{priceUp ? 'rise' : 'fall'}</Text> — {priceUp ? 'buying today is more cost-effective' : 'waiting until tomorrow may save you money'}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                            <Text style={{ fontSize: 18 }}>⛽</Text>
                            <Text style={{ flex: 1, color: '#1f2937', fontSize: 13, lineHeight: 20 }}>
                              Fuel price is currently <Text style={{ fontWeight: '700' }}>{fuelHigh ? 'HIGH' : 'normal'}</Text> — may affect fish prices within {insightsData.insights.fuel_lag_weeks} weeks
                            </Text>
                          </View>
                          {isHoliday && (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                              <Text style={{ fontSize: 18 }}>🎉</Text>
                              <Text style={{ flex: 1, color: '#1f2937', fontSize: 13, lineHeight: 20 }}>
                                Holiday period — high demand may push prices <Text style={{ fontWeight: '700', color: '#dc2626' }}>+{insightsData.insights.holiday_lift}% higher</Text>
                              </Text>
                            </View>
                          )}
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                            <Text style={{ fontSize: 18 }}>{e <= -2 ? '🔴' : e <= -1.4 ? '🟡' : '🟢'}</Text>
                            <Text style={{ flex: 1, color: '#1f2937', fontSize: 13, lineHeight: 20 }}>
                              {e <= -2
                                ? 'Even a small price increase may cause buyers to switch to alternatives'
                                : e <= -1.4
                                ? 'Demand drops slightly when prices rise'
                                : 'Demand stays fairly stable even when prices rise — popular fish'}
                            </Text>
                          </View>
                        </View>
                      );
                    })()}

                    {/* ── 0. Market Demand Meter ── */}
                    {insightsData.demand_sentiment_7_days?.length > 0 && (
                      <MarketDemandMeter
                        days={insightsData.demand_sentiment_7_days}
                        spikeWarning={insightsData.price_spike_warning ?? false}
                        spikeDay={insightsData.price_spike_day ?? ''}
                      />
                    )}

                    {/* ── 1. Fuel Price Card (plain language) ── */}
                    <View style={styles.insightCard}>
                      <View style={styles.insightCardRow}>
                        <View style={[styles.insightIconWrap, { backgroundColor: '#fef3c7' }]}>
                          <Ionicons name="flame-outline" size={24} color="#d97706" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.insightCardTitle}>⛽ Fuel Price Impact on Fish</Text>
                          <Text style={styles.insightCardSub}>How fuel costs affect fish prices</Text>
                        </View>
                      </View>

                      {/* Plain stat row */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                        <View style={{ flex: 1, backgroundColor: '#fffbeb', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                          <Text style={{ fontSize: 22, fontWeight: '800', color: '#d97706' }}>
                            {formatLKR(insightsData.insights.current_lk_price)}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#92400e', textAlign: 'center', marginTop: 2 }}>
                            Current Kerosene{'\n'}Price per Litre
                          </Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: '#fffbeb', borderRadius: 12, padding: 10, alignItems: 'center' }}>
                          <Text style={{ fontSize: 22, fontWeight: '800', color: '#d97706' }}>
                            {insightsData.insights.fuel_lag_weeks} wks
                          </Text>
                          <Text style={{ fontSize: 11, color: '#92400e', textAlign: 'center', marginTop: 2 }}>
                            Lead Time
                          </Text>
                        </View>
                      </View>

                      {/* Explanation */}
                      <View style={{ backgroundColor: '#fef9c3', borderRadius: 10, padding: 10, marginTop: 10 }}>
                        <Text style={{ fontSize: 13, color: '#713f12', lineHeight: 20 }}>
                          💡 <Text style={{ fontWeight: '600' }}>What this means:</Text> When fuel prices rise today, fish prices may also rise within {insightsData.insights.fuel_lag_weeks} weeks. If fuel is cheap, expect lower fish prices ahead.
                        </Text>
                      </View>

                      {/* Audience tips */}
                      <View style={{ marginTop: 10, gap: 6 }}>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                          <Text style={{ fontSize: 13 }}>🧑‍🍳</Text>
                          <Text style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Buyer:</Text> If fuel prices are rising, consider stocking up for the next {insightsData.insights.fuel_lag_weeks} weeks.</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                          <Text style={{ fontSize: 13 }}>🎣</Text>
                          <Text style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Fisherman:</Text> Higher fuel costs justify raising your fishing fees.</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                          <Text style={{ fontSize: 13 }}>🏪</Text>
                          <Text style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Trader:</Text> When fuel prices rise, expect your purchase cost to increase within {insightsData.insights.fuel_lag_weeks} weeks.</Text>
                        </View>
                      </View>
                    </View>

                    {/* ── 2. Demand Sensitivity (plain) ── */}
                    {(() => {
                      const e = insightsData.insights.current_elasticity;
                      const level = e <= -2 ? 'high' : e <= -1.4 ? 'medium' : 'low';
                      const colors = {
                        high:   { bg: '#fee2e2', text: '#991b1b', badge: '#fca5a5', icon: '#dc2626' },
                        medium: { bg: '#fef3c7', text: '#92400e', badge: '#fcd34d', icon: '#d97706' },
                        low:    { bg: '#d1fae5', text: '#065f46', badge: '#6ee7b7', icon: '#10b981' },
                      }[level];
                      const sinhalaLabel = level === 'high' ? 'High Sensitivity 🔴' : level === 'medium' ? 'Medium Sensitivity 🟡' : 'Low Sensitivity 🟢';
                      const buyerTip =
                        level === 'high'
                          ? 'When prices rise, buyers tend to switch to cheaper alternatives. Look for stable prices.'
                          : level === 'medium'
                          ? 'Demand drops slightly when prices rise. Buying on special occasions is a good strategy.'
                          : 'Demand remains steady even when prices rise. This is a popular fish species.';
                      const sellerTip =
                        level === 'high'
                          ? 'Offering discounted deals can attract buyers. Keep fishing fees stable.'
                          : level === 'medium'
                          ? 'Targeted promotions can boost sales and improve margins.'
                          : 'Keeping prices stable will ensure steady reliable income.';
                      return (
                        <View style={[styles.insightCard, { borderLeftWidth: 4, borderLeftColor: colors.icon }]}>
                          <View style={styles.insightCardRow}>
                            <View style={[styles.insightIconWrap, { backgroundColor: colors.bg }]}>
                              <Ionicons name="people-outline" size={24} color={colors.icon} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.insightCardTitle}>👥 Demand Sensitivity</Text>
                              <Text style={styles.insightCardSub}>{insightsData.fish.common_name}</Text>
                            </View>
                            <View style={{ backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{sinhalaLabel}</Text>
                            </View>
                          </View>

                          {/* Visual scale */}
                          <View style={{ marginTop: 12, marginBottom: 6 }}>
                            <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                              <View style={{ flex: level === 'low' ? 1 : level === 'medium' ? 2 : 3, backgroundColor: colors.icon }} />
                              <View style={{ flex: level === 'low' ? 2 : level === 'medium' ? 1 : 0, backgroundColor: '#e5e7eb' }} />
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                              <Text style={{ fontSize: 10, color: '#6b7280' }}>Stable demand</Text>
                              <Text style={{ fontSize: 10, color: '#6b7280' }}>Very sensitive</Text>
                            </View>
                          </View>

                          <View style={{ backgroundColor: colors.bg, borderRadius: 10, padding: 10, marginTop: 4 }}>
                            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
                              💡 <Text style={{ fontWeight: '600' }}>In plain terms:</Text>{' '}
                              {level === 'high'
                                ? 'When this fish becomes more expensive, buyers quickly look for cheaper options.'
                                : level === 'medium'
                                ? 'A slight price increase causes a moderate drop in demand.'
                                : 'People keep buying this fish even when prices go up.'}
                            </Text>
                          </View>

                          <View style={{ marginTop: 10, gap: 6 }}>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                              <Text style={{ fontSize: 13 }}>🧑‍🍳</Text>
                              <Text style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Buyer:</Text> {buyerTip}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                              <Text style={{ fontSize: 13 }}>🏪</Text>
                              <Text style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Trader / Fisherman:</Text> {sellerTip}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })()}

                    {/* ── 2b. Elasticity Comparison Chart ── */}
                    {elasticityItems.length > 0 && (
                      <ElasticityChart
                        items={elasticityItems}
                        highlighted={elasticityHighlight}
                      />
                    )}

                    {/* ── 3. Season / Holiday / Weather ── */}
                    {(() => {
                      const isHoliday = insightsData.insights.is_holiday_period;
                      const weatherBad = insightsData.insights.weather_factor > 1.05;
                      const accentColor = isHoliday ? '#f59e0b' : weatherBad ? '#3b82f6' : '#10b981';
                      const bgColor    = isHoliday ? '#fffbeb' : weatherBad ? '#eff6ff' : '#f0fdf4';
                      const icon       = isHoliday ? '🎉' : weatherBad ? '⛈️' : '☀️';
                      return (
                        <View style={[styles.insightCard, { borderLeftWidth: 4, borderLeftColor: accentColor }]}>
                          <View style={styles.insightCardRow}>
                            <View style={[styles.insightIconWrap, { backgroundColor: bgColor }]}>
                              <Ionicons
                                name={isHoliday ? 'calendar-outline' : weatherBad ? 'thunderstorm-outline' : 'sunny-outline'}
                                size={24}
                                color={accentColor}
                              />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.insightCardTitle}>{icon} Season & Weather Impact</Text>
                              <Text style={styles.insightCardSub}>{insightsData.insights.current_season}</Text>
                            </View>
                            {isHoliday && (
                              <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                                <Text style={{ color: '#92400e', fontWeight: '700', fontSize: 12 }}>+{insightsData.insights.holiday_lift}% holiday</Text>
                              </View>
                            )}
                          </View>

                          <View style={{ gap: 8, marginTop: 12 }}>
                            {isHoliday && (
                              <View style={{ flexDirection: 'row', backgroundColor: '#fef3c7', borderRadius: 10, padding: 10, gap: 8, alignItems: 'flex-start' }}>
                                <Ionicons name="information-circle-outline" size={18} color="#d97706" />
                                <Text style={{ flex: 1, fontSize: 13, color: '#78350f', lineHeight: 20 }}>
                                  <Text style={{ fontWeight: '700' }}>Holiday period!</Text> Increased demand may push prices up by {insightsData.insights.holiday_lift}%. {insightsData.insights.season_alert}
                                </Text>
                              </View>
                            )}
                            <View style={{ flexDirection: 'row', backgroundColor: bgColor, borderRadius: 10, padding: 10, gap: 8, alignItems: 'flex-start' }}>
                              <Ionicons name={weatherBad ? 'thunderstorm-outline' : 'cloud-outline'} size={18} color={accentColor} />
                              <Text style={{ flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 }}>
                                <Text style={{ fontWeight: '700' }}>Weather: </Text>{insightsData.insights.weather_label}
                                {weatherBad
                                  ? ' — Poor weather may reduce fishing activity, making fish harder to obtain cheaply.'
                                  : ' — Good weather; fishing operations are running normally.'}
                              </Text>
                            </View>
                          </View>

                          <View style={{ marginTop: 10, gap: 6 }}>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                              <Text style={{ fontSize: 13 }}>🎣</Text>
                              <Text style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 }}>
                                <Text style={{ fontWeight: '700' }}>Fisherman:</Text>{' '}
                                {weatherBad ? 'Avoid going out in bad weather. Safety first.'
                                  : isHoliday ? 'Demand is high during holidays — landing early can be more profitable.'
                                  : 'Good weather — normal fishing operations expected.'}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                              <Text style={{ fontSize: 13 }}>🧑‍🍳</Text>
                              <Text style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 }}>
                                <Text style={{ fontWeight: '700' }}>Buyer:</Text>{' '}
                                {isHoliday ? 'Prices are higher during holidays — buy early to save money.'
                                  : weatherBad ? 'Poor weather may reduce supply — consider locking in a stable price.'
                                  : 'Normal demand. Prices should be at their standard level.'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })()}

                    {/* ── 4. Price Forecast Chart (plain) ── */}
                    <View style={styles.insightCard}>
                      <Text style={styles.insightCardTitle}>📊 7-Day Price Forecast</Text>
                      <Text style={[styles.insightCardSub, { marginBottom: 4 }]}>Next 7 Days Price Forecast</Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 18 }}>
                        🔵 Blue line — AI (computer) prediction{'\n'}
                        🟠 Orange line — Historical average price
                      </Text>

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
                              legend: ['AI Forecast', 'Historical Avg'],
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

                      <View style={styles.legendContainer}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                          <Text style={styles.legendText}>AI Forecast</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: '#d97706' }]} />
                          <Text style={styles.legendText}>Historical Avg</Text>
                        </View>
                      </View>

                      {/* Plain reading */}
                      {(() => {
                        const pred = insightsData.prediction_7_days;
                        const min = Math.min(...pred);
                        const max = Math.max(...pred);
                        const minDay = insightsData.labels[pred.indexOf(min)];
                        const maxDay = insightsData.labels[pred.indexOf(max)];
                        const trend = pred[pred.length - 1] > pred[0] ? 'upward' : 'downward';
                        const trendColor = trend === 'upward' ? '#dc2626' : '#059669';
                        return (
                          <View style={{ backgroundColor: '#f0f9ff', borderRadius: 12, padding: 12, marginTop: 12, gap: 6 }}>
                            <Text style={{ fontWeight: '700', color: '#0369a1', fontSize: 13, marginBottom: 2 }}>
                              📖 How to Read This Chart
                            </Text>
                            <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
                              • Cheapest day: <Text style={{ fontWeight: '700', color: '#059669' }}>{minDay} — {formatLKR(min)}</Text>
                            </Text>
                            <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
                              • Most expensive day: <Text style={{ fontWeight: '700', color: '#dc2626' }}>{maxDay} — {formatLKR(max)}</Text>
                            </Text>
                            <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
                              • Weekly trend: <Text style={{ fontWeight: '700', color: trendColor }}>{trend}</Text>
                            </Text>
                          </View>
                        );
                      })()}
                    </View>

                    {/* ── 5. Feature Importance ── */}
                    {featureImportance.length > 0 && (
                      <View style={styles.insightCard}>
                        <FeatureImportanceChart items={featureImportance} />
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="analytics-outline" size={48} color="#d1d5db" />
                    <Text style={[styles.emptyText, { marginTop: 12 }]}>No data found</Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
                      Please select a fish species above.
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
    fontSize: 20,
    fontWeight: '700',
    color: '#3b82f6',
    marginTop: 9,
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

