# Google Maps Setup Guide for Fishing Zone Map

## 🗺️ Overview

The fishing zone selector now uses an interactive Google Map to display:

- **🚢 Your port location** (green boat marker)
- **🐟 14 fishing zones** (blue fish markers)
- **📍 Visual route** from port to selected zone
- **📊 Distance tracking** with automatic calculation
- **💡 Zone information** with depth and fish types

## 📱 Features Implemented

### Interactive Map View

- Tap any fish marker to see zone details
- Route line shows distance from your port
- Color-coded markers:
  - 🟢 Green: Your departure port
  - 🔵 Blue: Available fishing zones
  - 🟠 Orange: Currently viewing zone info
  - 🟢 Green with scale: Selected destination

### Zone Information Card

When you tap a fishing zone marker:

- Zone name and region badge
- Distance from your port (auto-calculated)
- Water depth in meters
- Target fish species
- "Set as Destination" button

### Smart Distance Calculation

- Uses Haversine formula for accurate distances
- Auto-updates distance field when zone selected
- Shows dashed route line on map
- Real-time distance display

## 🔑 Google Maps API Setup (Required for Production)

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - **Maps SDK for Android**
   - **Maps SDK for iOS** (if supporting iOS)
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

### Step 2: Configure API Key

Replace in `app.json`:

```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_ACTUAL_API_KEY_HERE"
    }
  }
}
```

### Step 3: Restrict API Key (Security)

In Google Cloud Console:

1. Click on your API key
2. Under **Application restrictions**:
   - Select "Android apps"
   - Add package name: `com.adwx2001.battiadds`
   - Add SHA-1 certificate fingerprint
3. Under **API restrictions**:
   - Select "Restrict key"
   - Choose: Maps SDK for Android

### Step 4: Get SHA-1 Fingerprint

For development:

```bash
cd android
./gradlew signingReport
```

Look for `SHA1:` under `Variant: debug`

For production:

```bash
keytool -list -v -keystore your-release-key.keystore
```

## 🚀 Testing Without API Key

The app will work in development mode without a Google Maps API key, but:

- Map may show "For development purposes only" watermark
- Some features may be limited
- Production build requires valid API key

## 📍 Available Fishing Zones

### West Coast (4 zones)

- **WC1**: Colombo Deep Sea Zone - 800m, Tuna/Swordfish/Marlin
- **WC2**: Negombo Lagoon Zone - 450m, Skipjack/Yellowfin
- **WC3**: Chilaw Offshore Zone - 600m, Barracuda/Mackerel
- **WC4**: Kalpitiya Deep Waters - 950m, Tuna/Sailfish

### South Coast (3 zones)

- **SC1**: Galle Continental Shelf - 700m, Snapper/Grouper
- **SC2**: Matara Deep Zone - 850m, Tuna/Swordfish
- **SC3**: Tangalle Fishing Grounds - 600m, Kingfish/Barracuda

### East Coast (3 zones)

- **EC1**: Trincomalee Bay Zone - 500m, Trevally/Grouper
- **EC2**: Batticaloa Offshore - 650m, Tuna/Mackerel
- **EC3**: Kalmunai Deep Waters - 750m, Sailfish/Marlin

### North Coast (4 zones)

- **NC1**: Jaffna Peninsula Zone - 400m, Snapper/Trevally
- **NC2**: Mannar Gulf Zone - 550m, Barracuda/Kingfish
- **NC3**: Point Pedro Deep Sea - 800m, Tuna/Swordfish

## 🎨 Map Customization

### Adding More Zones

Edit `trip-cost-prediction.tsx`:

```typescript
const fishingZones: FishingZone[] = [
  {
    id: "CUSTOM1",
    name: "My Custom Zone",
    lat: 7.5,
    lon: 80.0,
    depth_m: 600,
    fish_types: ["Tuna", "Barracuda"],
    region: "South",
  },
  // ... add more zones
];
```

### Changing Map Style

In MapView component:

```typescript
<MapView
  mapType="satellite" // or "hybrid", "terrain"
  // ... other props
/>
```

## 🐛 Troubleshooting

### Map Not Showing

1. Check if `react-native-maps` is installed
2. Verify API key in `app.json`
3. Clear Metro cache: `npx expo start -c`

### Markers Not Clickable

- Ensure `onPress` handlers are properly bound
- Check if modal is blocking touches

### Distance Calculation Wrong

- Verify port coordinates are correct
- Check Haversine formula implementation
- Ensure lat/lon values are in decimal degrees

## 📦 Dependencies

```json
{
  "react-native-maps": "^1.18.0"
}
```

## 🔧 Future Enhancements

- [ ] Real-time GPS tracking
- [ ] Offline map caching
- [ ] Custom map tiles
- [ ] Heat maps for popular zones
- [ ] Multi-waypoint route planning
- [ ] Weather overlay on map
- [ ] Historical catch data per zone
- [ ] User-submitted zones

## 📞 Support

For issues related to:

- **Google Maps API**: [Google Maps Platform Support](https://developers.google.com/maps/support)
- **React Native Maps**: [GitHub Issues](https://github.com/react-native-maps/react-native-maps/issues)
- **App-specific issues**: Contact your dev team

---

**Note**: The map currently uses predefined coordinates. For live navigation, you'll need to integrate device GPS and navigation features.
