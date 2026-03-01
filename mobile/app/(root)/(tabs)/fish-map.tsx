import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import useAuthStore from '@/stores/authStore';

/** Resolve district/zone name from string | object */
const resolveName = (d: { name?: string } | string | undefined): string => {
  if (!d) return '';
  if (typeof d === 'string') return d;
  return d.name ?? '';
};

/**
 * Pick the best location for Google Maps search.
 *
 * In registration:
 *   district = broad admin district  (e.g. "Hambantota")
 *   zone     = specific town/city    (e.g. "Tangalle", "Matara", "Dambulla")
 *
 * The zone is always more specific → use it first for map search.
 */
const resolveSearchLocation = (
  zoneParam: string | undefined,
  districtParam: string | undefined,
  storeZone: string | undefined,
  storeDistrict: { name?: string } | string | undefined,
): string => {
  // 1. Zone (specific town) from navigation params
  if (zoneParam) return zoneParam;
  // 2. Zone from auth store
  if (storeZone) return storeZone;
  // 3. District param as fallback
  if (districtParam) return districtParam;
  // 4. District from auth store as last fallback
  const dist = resolveName(storeDistrict);
  if (dist) return dist;
  return 'Colombo';
};

export default function FishMarketsMapScreen() {
  const router      = useRouter();
  const params      = useLocalSearchParams<{ district?: string; zone?: string }>();
  const currentUser = useAuthStore(s => s.currentUser);

  const searchLocation = resolveSearchLocation(
    params.zone, params.district,
    currentUser?.zone, currentUser?.district,
  );
  // town = specific registered city/town (e.g. "Tangalle", "Matara", "Dambulla")
  const town     = params.zone || currentUser?.zone || '';
  // district = broad admin area (e.g. "Hambantota")
  const district = params.district || resolveName(currentUser?.district) || '';
  // Subtitle: show "Tangalle, Hambantota" or just "Tangalle" if no district
  const locationLabel = town && district && town !== district
    ? `${town}, ${district}`
    : town || district || searchLocation;

  const [opening, setOpening] = useState(false);

  const query    = encodeURIComponent(`fish market in ${searchLocation} Sri Lanka`);
  const mapUrl   = `https://www.google.com/maps/search/?api=1&query=${query}`;

  const openMap = useCallback(async () => {
    setOpening(true);
    try {
      await WebBrowser.openBrowserAsync(mapUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: '#0057FF',
        controlsColor: '#ffffff',
        createTask: false,
      });
    } catch {
      Linking.openURL(mapUrl);
    } finally {
      setOpening(false);
    }
  }, [mapUrl]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Sub-header card */}
      <View style={styles.headerCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1f2937" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Fish Markets Near You</Text>
            <Text style={styles.subtitle}>
              {locationLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Location info card */}
      <View style={styles.zoneCard}>
        <Text style={styles.zoneEmoji}>📍</Text>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.zoneName}>{town || searchLocation}</Text>
          {district && district !== town && (
            <Text style={styles.zoneDesc}>{district} District</Text>
          )}
          <View style={styles.adjBadge}>
            <Text style={styles.adjText}>Searching fish markets near {searchLocation}</Text>
          </View>
        </View>
      </View>

      {/* Map launch button */}
      <TouchableOpacity
        style={[styles.mapBtn, opening && { opacity: 0.7 }]}
        onPress={openMap}
        activeOpacity={0.85}
        disabled={opening}
      >
        {opening ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="map" size={24} color="#fff" />
        )}
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.mapBtnTitle}>
            {opening ? 'Opening…' : 'View Fish Markets on Map'}
          </Text>
          <Text style={styles.mapBtnSub}>Searching near {searchLocation}</Text>
        </View>
        {!opening && (
          <Ionicons
            name="chevron-forward"
            size={18}
            color="rgba(255,255,255,0.8)"
          />
        )}
      </TouchableOpacity>

      {/* How it works */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 How this works</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoStep}>1</Text>
          <Text style={styles.infoText}>
            Tap the button above to see fish markets near {searchLocation}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoStep}>2</Text>
          <Text style={styles.infoText}>
            Google Maps opens inside the app — browse nearby stalls and prices
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoStep}>3</Text>
          <Text style={styles.infoText}>
            Prices shown in the predictions screen are already adjusted for your zone
          </Text>
        </View>
      </View>

      {/* Tip */}
      <View style={styles.tipCard}>
        <Ionicons name="information-circle-outline" size={16} color="#0369a1" />
        <Text style={styles.tipText}>
          Your district and zone are set from your registration profile.
          Update them in Profile → Edit to get prices for a different area.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content:   { padding: 16, gap: 14 },

  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  backBtn:  { padding: 4 },
  title:    { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  zoneCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderLeftWidth: 4, borderLeftColor: '#2563eb',
  },
  zoneEmoji: { fontSize: 28, marginTop: 2 },
  zoneName:  { fontSize: 14, fontWeight: '700', color: '#1d4ed8' },
  zoneDesc:  { fontSize: 12, color: '#3730a3', lineHeight: 18 },
  adjBadge: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: '#dbeafe', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  adjText: { fontSize: 11, color: '#1d4ed8', fontWeight: '600' },

  mapBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  mapBtnTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  mapBtnSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14, padding: 16,
    gap: 10,
  },
  infoTitle: { fontWeight: '700', color: '#1f2937', fontSize: 14, marginBottom: 2 },
  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoStep: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#2563eb', textAlign: 'center',
    color: '#fff', fontWeight: '700', fontSize: 12,
    lineHeight: 22,
  },
  infoText: { flex: 1, fontSize: 13, color: '#4b5563', lineHeight: 19 },

  tipCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  tipText: { flex: 1, fontSize: 12, color: '#0c4a6e', lineHeight: 18 },
});
