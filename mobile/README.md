# Fish Price Prediction Mobile App

A React Native mobile application for viewing and analyzing fish price predictions from the trained ML model.

## Features

✅ **Real-time Predictions** - View latest fish price predictions
✅ **Historical Data** - Analyze past predictions and actual prices
✅ **Price Charts** - Visual representation of price trends
✅ **Auto-refresh** - Keep data updated automatically
✅ **Bilingual UI** - Full English and Sinhala support
✅ **Offline Support** - Data caching capability

## Requirements

- Node.js 16+
- npm or yarn
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS)
- Backend API running

## Installation

```bash
# Install dependencies
npm install

# or use yarn
yarn install
```

## Running the App

### Android

```bash
npm run android
```

### iOS

```bash
npm run ios
```

### Start Metro Server

```bash
npm start
```

## Backend Configuration

Update the API base URL in `src/api/client.ts`:

```typescript
const API_BASE_URL = 'http://your-backend-url:5000';
```

## Project Structure

```
mobile/
├── src/
│   ├── api/
│   │   └── client.ts                # API client
│   ├── screens/
│   │   ├── HomeScreen.tsx           # Dashboard screen
│   │   ├── PredictionsScreen.tsx    # Predictions view
│   │   ├── HistoryScreen.tsx        # Historical data
│   │   └── SettingsScreen.tsx       # Settings
│   └── types/
│       └── index.ts                 # TypeScript types
├── App.tsx                          # Main app component
├── index.js                         # Entry point
├── package.json                     # Dependencies
├── app.json                         # App configuration
└── README.md                        # This file
```

## Required Backend Endpoints

The backend API should provide these endpoints:

### GET /api/predictions
Returns latest price predictions

```json
[
  {
    "id": 1,
    "fish_name": "Tilapia",
    "predicted_price": 450.50,
    "confidence": 0.95,
    "date": "2024-01-04"
  }
]
```

### GET /api/history
Returns historical prices

```json
[
  {
    "id": 1,
    "fish_name": "Tilapia",
    "actual_price": 450.00,
    "predicted_price": 450.50,
    "accuracy": 0.95,
    "date": "2024-01-03"
  }
]
```

### GET /api/model-metrics
Returns model performance metrics

```json
{
  "accuracy": 0.92,
  "mse": 1234.56,
  "rmse": 35.12
}
```

### GET /api/weather
Returns current weather data

```json
{
  "temperature": 28.5,
  "humidity": 65,
  "wind_speed": 12.3
}
```

## Available Screens

1. **Home Screen** - Dashboard with latest predictions and metrics
2. **Predictions Screen** - Detailed price predictions with charts
3. **History Screen** - Historical data and price trends
4. **Settings Screen** - Configuration and preferences

## Settings Options

- Enable/disable notifications
- Auto-refresh interval
- Dark mode
- Server configuration
- API key management
- Cache management

## Development

### Lint Check

```bash
npm run lint
```

### Run Tests

```bash
npm test
```

## Building for Production

### Android Release Build

```bash
cd android
./gradlew assembleRelease
```

### iOS Release Build

```bash
cd ios
xcodebuild -workspace FishPricePredictorApp.xcworkspace -scheme FishPricePredictorApp -configuration Release
```

## Troubleshooting

### Metro Server Issues
```bash
npm start -- --reset-cache
```

### Android Build Issues
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### iOS Pod Issues
```bash
cd ios
pod install --repo-update
cd ..
npm run ios
```

## Contributing

Pull requests are welcome. Please create an issue first to discuss changes.

## License

MIT License - see LICENSE file for details

## Support

For questions or issues, please open a GitHub issue.

---

**Built by:** Research Team
**Version:** 1.0.0
**Last Updated:** 2026-01-04
