# Setup Guide - React Native Fish Price Prediction App

## Overview

A complete React Native mobile application to visualize and analyze fish price predictions from your trained ML model.

## Key Features Implemented

✅ **Home Screen** - Dashboard with latest predictions and model metrics
✅ **Predictions Screen** - Detailed predictions with price trend charts
✅ **History Screen** - Historical data analysis with statistics
✅ **Settings Screen** - Comprehensive app configuration
✅ **Bilingual Support** - Full English and Sinhala interface
✅ **API Integration** - Ready for backend connection
✅ **Type Safety** - Full TypeScript support

## Project Structure

```
mobile/
├── src/
│   ├── api/
│   │   └── client.ts                 # Axios API client
│   ├── screens/
│   │   ├── HomeScreen.tsx            # Dashboard
│   │   ├── PredictionsScreen.tsx     # Price predictions with charts
│   │   ├── HistoryScreen.tsx         # Historical data & analytics
│   │   └── SettingsScreen.tsx        # Settings & configuration
│   └── types/
│       └── index.ts                  # TypeScript interfaces
├── App.tsx                           # Bottom Tab Navigation
├── index.js                          # Entry point
├── package.json                      # Dependencies
├── app.json                          # App configuration
├── metro.config.js                   # Metro bundler config
├── tsconfig.json                     # TypeScript config
├── jest.config.js                    # Testing config
├── .eslintrc.js                      # Linting rules
├── .gitignore                        # Git ignore rules
├── README.md                         # Full documentation
├── README_SI.md                      # Sinhala documentation
├── SETUP_GUIDE_SI.md                 # Sinhala setup guide
└── SETUP_GUIDE.md                    # This file
```

## Quick Start

### 1. Install Dependencies

```bash
# Navigate to mobile folder
cd mobile

# Install npm packages
npm install
```

### 2. Configure Backend API

Edit `src/api/client.ts` and update the API_BASE_URL:

```typescript
const API_BASE_URL = 'http://your-backend-url:5000';
```

### 3. Run the App

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

**Start Metro Server (Manual):**
```bash
npm start
```

## Screens Explained

### 1. **Home Screen**
- Displays latest price prediction
- Shows model performance metrics (accuracy, MSE, RMSE)
- Refresh control for updating data
- Quick stats overview

### 2. **Predictions Screen**
- Line chart showing price trends
- Detailed list of upcoming predictions
- Confidence levels for each prediction
- Fish name and prediction date
- Pull-to-refresh functionality

### 3. **History Screen**
- Historical price analysis
- Statistics cards (average, max, min prices)
- Detailed history with actual vs predicted prices
- Accuracy percentages
- Date-wise sorting

### 4. **Settings Screen**
- Notification toggles
- Auto-refresh settings
- Dark mode option
- Server configuration
- Cache management
- About section with version info

## Backend API Requirements

Your backend must provide these endpoints:

### GET /api/predictions
**Response:**
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
**Response:**
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
**Response:**
```json
{
  "accuracy": 0.92,
  "mse": 1234.56,
  "rmse": 35.12
}
```

### GET /api/weather
**Response:**
```json
{
  "temperature": 28.5,
  "humidity": 65,
  "wind_speed": 12.3,
  "condition": "Clear"
}
```

## Color Scheme

- **Primary Blue**: `#2E86AB` - Headers and primary actions
- **Success Green**: `#27AE60` - Positive indicators
- **Warning Red**: `#E74C3C` - Warnings and errors
- **Background**: `#F5F5F5` - Light gray background
- **White**: `#FFFFFF` - Cards and content areas

## Dependencies

Core packages installed:
- **react**: UI library
- **react-native**: Mobile framework
- **@react-navigation**: Navigation solution
- **axios**: HTTP client
- **react-native-chart-kit**: Chart visualization
- **react-native-vector-icons**: Icon library
- **TypeScript**: Type safety

## Development Commands

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Lint code
npm run lint

# Run tests
npm test
```

## Building for Release

### Android Release APK
```bash
cd android
./gradlew assembleRelease
```

### Android Release App Bundle
```bash
cd android
./gradlew bundleRelease
```

### iOS Release Build
```bash
cd ios
xcodebuild -workspace FishPricePredictorApp.xcworkspace \
  -scheme FishPricePredictorApp \
  -configuration Release \
  -derivedDataPath build
```

## Troubleshooting

### Metro Cache Issues
```bash
npm start -- --reset-cache
```

### Android Build Errors
```bash
cd android
./gradlew clean
./gradlew assembleDebug
cd ..
```

### iOS CocoaPods Issues
```bash
cd ios
rm -rf Pods
rm -rf Pods.lock
pod install --repo-update
cd ..
npm run ios
```

### Connection to Backend
- Ensure backend API is running
- Check firewall settings
- Verify API_BASE_URL in `src/api/client.ts`
- Test endpoint with curl/Postman first

## File Structure Details

### src/api/client.ts
Axios instance with base configuration. All API calls go through here.

### src/screens/
Each screen is a separate TypeScript React component with:
- State management with hooks
- API integration
- Error handling
- Loading states
- Pull-to-refresh support

### src/types/index.ts
TypeScript interfaces for:
- `PredictionData` - Single prediction object
- `HistoryData` - Historical price entry
- `ModelMetrics` - Model performance metrics
- `WeatherData` - Weather information
- `ApiResponse` - Generic API response wrapper

## Configuration Files

- **app.json** - App metadata and configuration
- **package.json** - Dependencies and scripts
- **tsconfig.json** - TypeScript compiler options
- **jest.config.js** - Testing framework setup
- **metro.config.js** - React Native bundler config
- **.eslintrc.js** - Code quality rules

## Performance Considerations

1. **Charts**: LineChart re-renders on data updates
2. **Lists**: Consider FlatList for large datasets
3. **API Calls**: Implement caching for better UX
4. **Images**: Optimize image sizes for mobile
5. **Bundle Size**: Monitor and optimize regularly

## Language Support

The app supports:
- **English** - Full interface
- **Sinhala** - Complete Sinhala translation

To add more languages, create new string files and implement i18n.

## Contributing

When contributing:
1. Follow TypeScript best practices
2. Use functional components with hooks
3. Add proper error handling
4. Include loading states
5. Test on both Android and iOS

## License

MIT License - See project LICENSE file

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure backend URL in `src/api/client.ts`
3. ✅ Run the app: `npm run android` or `npm run ios`
4. ✅ Build endpoints in your backend to match API specs
5. ✅ Test predictions and data flow
6. ✅ Customize colors/branding as needed
7. ✅ Build release version for deployment

---

**Created by:** Research Team
**Version:** 1.0.0
**Last Updated:** 2026-01-04
