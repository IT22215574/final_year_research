# Fish Zone Visualization - Integration Guide

## 🗺️ Overview

This system displays predicted fish zones on interactive maps for both mobile (React Native) and web (Next.js) platforms. Fish zones are predicted daily by the ML model and visualized with probability-based coloring.

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Daily ML Pipeline (Python)                                 │
│  • Fetches environmental data                               │
│  • Runs fish zone predictions                               │
│  • Outputs: CSV, GeoJSON, PNG heatmap                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Backend API (NestJS)                                       │
│  • /fish-zones/latest - Get latest predictions              │
│  • /fish-zones/geojson - GeoJSON format                     │
│  • /fish-zones/summary - Statistics                         │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ↓                         ↓
┌─────────────────┐      ┌─────────────────┐
│  Mobile App     │      │  Web App        │
│  (React Native) │      │  (Next.js)      │
│  • react-native │      │  • Leaflet      │
│    -maps        │      │  • react-leaflet│
└─────────────────┘      └─────────────────┘
```

## 🚀 Features

### Backend API

#### Endpoints

1. **GET /fish-zones/latest**
   - Returns latest fish zone predictions
   - Query params: `minProbability` (0-1)
   - Response includes data + metadata

2. **GET /fish-zones/geojson**
   - GeoJSON format for mapping
   - Compatible with all major mapping libraries

3. **GET /fish-zones/summary**
   - Text summary with statistics

4. **GET /fish-zones/date/:date**
   - Get predictions for specific date (YYYY-MM-DD)

5. **GET /fish-zones/statistics**
   - Available dates and stats

#### Example Response

```json
{
  "data": [
    {
      "lat": 7.5,
      "lon": 80.2,
      "sst": 28.5,
      "chlor_a": 0.15,
      "water_u": 0.12,
      "water_v": -0.08,
      "fish_zone": 1,
      "fish_probability": 0.85
    }
  ],
  "metadata": {
    "total": 1247,
    "fishZones": 423,
    "highProbabilityZones": 156,
    "date": "2026-03-10"
  }
}
```

### Mobile App Features

- **Interactive Map** with react-native-maps
- **Color-coded zones** based on fish probability
  - 🔴 Red: Very High (80%+)
  - 🟠 Orange: High (60-80%)
  - 🟡 Yellow: Medium (40-60%)
  - 🟢 Green: Low (<40%)
- **Circle overlays** showing zone areas
- **Detailed zone information** on marker tap
- **Probability filtering** (All, 30%, 50%, 70%)
- **Real-time refresh** capability
- **Environmental data** display (SST, chlorophyll, currents)

### Web App Features

- **Leaflet.js map** with tile layers
- **Circle markers** with dynamic sizing
- **Interactive popups** with zone details
- **Filtering controls** for minimum probability
- **Legend** for color coding
- **Statistics dashboard** in sidebar
- **Responsive design**

## 📱 Mobile Setup

### 1. Environment Configuration

Add to `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=http://your-backend-url:3000
```

### 2. Navigation

Add to your tab navigator or stack:

```typescript
import FishZoneMap from './(tabs)/FishZoneMap';

// In your navigator:
<Tab.Screen
  name="FishZoneMap"
  component={FishZoneMap}
  options={{
    title: 'Fish Zones',
    tabBarLabel: 'Fish Zones',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="fish" size={size} color={color} />
    ),
  }}
/>
```

### 3. Permissions

Ensure location permissions in `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to access your location."
        }
      ]
    ]
  }
}
```

## 🌐 Web Setup

### 1. Environment Configuration

Add to `web-app/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://your-backend-url:3000
```

### 2. Navigation

The page is available at `/fish-zones`

Add to your navigation menu:

```tsx
<Link href="/fish-zones" className="nav-link">
  Fish Zone Map
</Link>
```

### 3. Leaflet CSS

Already included in `FishZoneMapView.tsx`:
```typescript
import "leaflet/dist/leaflet.css";
```

## 🔧 Backend Setup

### 1. Install Dependencies

The backend uses Node.js built-in modules (`fs`, `path`) and csv-parser:

```bash
cd Backend
pnpm add csv-parser
pnpm add -D @types/csv-parser
```

### 2. Configuration

The service automatically looks for prediction files in:
```
../model/fish_zone_predictions/
```

Ensure this path is correct relative to your backend `dist` folder after build.

### 3. Start Backend

```bash
cd Backend
pnpm run start:dev
```

API will be available at `http://localhost:3000`

## 📊 Data Flow

### Daily Workflow

1. **Cron job runs** (e.g., 6 AM daily)
   ```bash
   cd model
   ./run_daily_pipeline.sh
   ```

2. **Pipeline generates**:
   - `fish_zones_YYYY-MM-DD.csv`
   - `fish_zones_YYYY-MM-DD.geojson`
   - `fish_zones_heatmap_YYYY-MM-DD.png`
   - `summary_YYYY-MM-DD.txt`

3. **Backend API reads** latest files automatically

4. **Apps fetch** updated data via API

## 🎨 Color Scheme

```typescript
// Probability → Color mapping
const getMarkerColor = (probability: number) => {
  if (probability >= 0.8) return "#DC2626"; // red-600
  if (probability >= 0.6) return "#EA580C"; // orange-600
  if (probability >= 0.4) return "#F59E0B"; // amber-500
  return "#10B981"; // green-500
};
```

## 🔒 Security Considerations

### Backend

1. **CORS Configuration**: Update in `main.ts`
   ```typescript
   app.enableCors({
     origin: [
       'http://localhost:19006', // Expo web
       'http://localhost:3001',  // Web app
       'your-production-domain'
     ],
   });
   ```

2. **Rate Limiting**: Consider adding for production
   ```bash
   pnpm add @nestjs/throttler
   ```

### Mobile

1. **API Key Protection**: Store in secure storage
2. **HTTPS Only**: In production, use SSL

### Web

1. **Environment Variables**: Never expose API keys in client
2. **CSP Headers**: Configure in `next.config.ts`

## 📈 Performance Optimization

### Backend

- **Caching**: Consider Redis for frequently accessed predictions
- **Compression**: Enable gzip for large JSON responses
- **File limits**: Automatically clean old prediction files

### Mobile

- **Marker clustering**: For many zones (>100)
- **Lazy loading**: Load zones in viewport only
- **Image caching**: Cache map tiles

### Web

- **SSR Disabled**: Map component uses `dynamic` import with `ssr: false`
- **Marker virtualization**: Leaflet handles efficiently up to 1000 markers

## 🧪 Testing

### Backend

```bash
# Test API endpoints
curl http://localhost:3000/fish-zones/latest

curl http://localhost:3000/fish-zones/statistics

curl "http://localhost:3000/fish-zones/latest?minProbability=0.7"
```

### Mobile

```bash
# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

### Web

```bash
cd web-app
pnpm run dev

# Open http://localhost:3001/fish-zones
```

## 🐛 Troubleshooting

### Issue: "No fish zone predictions available"

**Solution**: 
1. Check if prediction pipeline has run:
   ```bash
   ls -la model/fish_zone_predictions/
   ```
2. Run pipeline manually:
   ```bash
   cd model
   ./run_daily_pipeline.sh
   ```

### Issue: Mobile map not loading

**Solution**:
1. Check API_URL in `.env`
2. Ensure backend is running
3. Check console logs for errors
4. Verify network connectivity

### Issue: Web map tiles not showing

**Solution**:
1. Check internet connection (uses OpenStreetMap)
2. Try alternative tile provider:
   ```typescript
   <TileLayer
     url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
   />
   ```

### Issue: CORS errors

**Solution**: Update backend CORS config:
```typescript
app.enableCors({
  origin: '*', // For development only!
  credentials: true,
});
```

## 📝 API Usage Examples

### JavaScript/TypeScript

```typescript
// Fetch latest high-probability zones
const response = await fetch(
  'http://localhost:3000/fish-zones/latest?minProbability=0.7'
);
const { data, metadata } = await response.json();

console.log(`Found ${metadata.fishZones} fish zones on ${metadata.date}`);
data.forEach(zone => {
  console.log(
    `Zone at ${zone.lat}, ${zone.lon}: ${(zone.fish_probability * 100).toFixed(1)}%`
  );
});
```

### Python

```python
import requests

response = requests.get('http://localhost:3000/fish-zones/latest', 
                       params={'minProbability': 0.6})
data = response.json()

print(f"Found {len(data['data'])} fish zones")
for zone in data['data']:
    print(f"Location: {zone['lat']:.3f}°N, {zone['lon']:.3f}°E")
    print(f"Probability: {zone['fish_probability']*100:.1f}%")
```

## 🔄 Integration with Existing Features

### Trip Planner Integration

Add to trip cost calculator:

```typescript
import fishZoneApi from '@/services/fishZoneApi';

// Get zones near trip location
const nearbyZones = await fishZoneApi.getZonesNear(tripLat, tripLon, radius);

// Calculate expected catch based on zone probabilities
const expectedCatch = calculateExpectedCatch(nearbyZones);
```

### Notification Integration

Alert users when new high-probability zones appear:

```typescript
const checkNewZones = async () => {
  const { data, metadata } = await fetch('/fish-zones/latest?minProbability=0.8').then(r => r.json());
  
  if (metadata.highProbabilityZones > threshold) {
    sendNotification({
      title: '🐟 High Fish Activity Detected!',
      body: `${metadata.highProbabilityZones} high-probability zones found`
    });
  }
};
```

## 🎯 Future Enhancements

- [ ] Real-time zone updates via WebSocket
- [ ] Historical zone comparison
- [ ] Route optimization to maximize catch
- [ ] Weather overlay integration
- [ ] Offline map caching
- [ ] Custom zone bookmarking
- [ ] Social features (share zones)
- [ ] AR navigation to fish zones

## 📞 Support

For issues or questions:
1. Check logs: `Backend/logs/` and `model/daily_pipeline.log`
2. Verify data files exist in `model/fish_zone_predictions/`
3. Test backend endpoints directly with curl
4. Check mobile/web console for client-side errors

## 📄 License

Part of the Final Year Research Project - Marine Fisheries Prediction System

---

**Last Updated**: March 2026  
**Integration Version**: 1.0.0

# Just download data (secure method)
cd model
# Copy the example .env and fill your credentials locally (do NOT commit):
# cp .env.example .env
# Edit `.env` and add your Copernicus credentials, then run:
python3 fetch_copernicus_daily.py

# Alternatively, use the example wrapper (makes cron usage easier):
# cp run_fetch.sh.example run_fetch.sh
# chmod +x run_fetch.sh
# ./run_fetch.sh

# Then run predictions
python3 predict_daily_fish_zones.py
