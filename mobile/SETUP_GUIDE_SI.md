# React Native Fish Price Prediction App - Setup Guide

## පිටුපස්ස

ඔබගේ trained ML model එක නියෝජනය කිරීමට React Native වලින් සම්පූර්ණ මොබයිල් ඇප්ලිකේෂනයක් හදා දී ඇත.

## ඉඩ දී ඇති ස්ක්‍රීන්

### 1. Home Screen (මුල් පිටුව)
- නවතම ඉතිරි පුරෝකථන දර්ශනය
- Model performance ප්‍රමාණ
- ස්පර්ශ සිකුරුවේ සාරාংශ

### 2. Predictions Screen (පුරෝකථන)
- ඉතිරි ඉතිරි දින සඳහා විස්තරිත පුරෝකථන
- LineChart භාවිතයෙන් මිල ශ්‍රිතිය
- ඒකිය අවශ්‍යතාවය සහ නිශ්චිතභාවය

### 3. History Screen (ඉතිහාසය)
- ඉතිරි අගයේ සත්‍ය ඉතිහාසය
- සාමාන්‍ය, උචතම සහ අවම මිල සිතුවම්
- පුරෝකථන නිරවද්‍යතාව සඳහා සැසඳුම්

### 4. Settings Screen (සැකසුම්)
- දැනුම්දීම් වින්‍යාස
- ස්වයංක්‍රිය යාවත්කාලීන සැකසුම්
- තිමිර මාතෘකා අඩවි
- කසුවක ඉවත්කිරීම
- සර්වරය සකසුම්

## ගිණුම්පත් ව්‍යුහය

```
mobile/
├── src/
│   ├── api/
│   │   └── client.ts               # Backend API integration
│   ├── screens/
│   │   ├── HomeScreen.tsx          # Dashboard
│   │   ├── PredictionsScreen.tsx   # Predictions with charts
│   │   ├── HistoryScreen.tsx       # Historical analysis
│   │   └── SettingsScreen.tsx      # App settings
│   └── types/
│       └── index.ts                # TypeScript interfaces
├── App.tsx                         # Main navigation
├── index.js                        # Entry point
├── package.json                    # Dependencies
├── app.json                        # App config
├── tsconfig.json                   # TypeScript config
├── jest.config.js                  # Test config
├── .eslintrc.js                    # Linting rules
├── metro.config.js                 # Metro bundler config
└── README.md                       # Documentation
```

## Backend API එක සම්බන්ධ කිරීම

ඔබගේ backend API එක සිටින ඇතුල් කරන්න `src/api/client.ts` එකේ:

```typescript
const API_BASE_URL = 'http://your-server-url:5000';
```

## අවශ්‍ය Backend Endpoints

### 1. GET /api/predictions
නවතම පුරෝකථන ලබා ගන්න

```json
{
  "data": [
    {
      "id": 1,
      "fish_name": "තිල්පියා",
      "predicted_price": 450.50,
      "confidence": 0.95,
      "date": "2024-01-04"
    }
  ]
}
```

### 2. GET /api/history
ඉතිරි අගයේ ඉතිහාසය ලබා ගන්න

```json
{
  "data": [
    {
      "id": 1,
      "fish_name": "තිල්පියා",
      "actual_price": 450.00,
      "predicted_price": 450.50,
      "accuracy": 0.95,
      "date": "2024-01-03"
    }
  ]
}
```

### 3. GET /api/model-metrics
ප්‍රමාණ සහ ගිණුම්පත් ලබා ගන්න

```json
{
  "data": {
    "accuracy": 0.92,
    "mse": 1234.56,
    "rmse": 35.12
  }
}
```

### 4. GET /api/weather
වර්තමාන කාලගුණ දත්ත ලබා ගන්න

```json
{
  "data": {
    "temperature": 28.5,
    "humidity": 65,
    "wind_speed": 12.3,
    "condition": "පිරිසිදු"
  }
}
```

## ස්ථාපනය සහ දිරි අරමුණු

```bash
# පරිකල්පිත බිම්බ ස්ථාපනය කරන්න
npm install

# හෝ yarn භාවිතා කරන්න
yarn install

# Android සඳහා දිරි අරමුණු කරන්න
npm run android

# iOS සඳහා දිරි අරමුණු කරන්න
npm run ios

# Developer සර්වරය ඉඩ දිරි අරමුණු කරන්න
npm start
```

## නිර්මාණ කරන්න

```bash
# Android Release
cd android
./gradlew assembleRelease

# iOS Release
cd ios
xcodebuild -workspace FishPricePredictorApp.xcworkspace -scheme FishPricePredictorApp -configuration Release
```

## වර්ණ සැකසුම්

앱에서 වර්ණ:
- ප්‍රමුඛ නිල: `#2E86AB`
- සෝයුම් හරිත: `#27AE60`
- අවවාද දඩ: `#E74C3C`
- පසුබිම: `#F5F5F5`
- සුදු: `#FFFFFF`

## Sinhala පෙළ නිවැරඩුම්

සිංහල අක්ෂර නිරිමි කිරීම සඳහා:

1. ඉතිරි සිංහල පෙළ සරිසරි සිංහල භාෂා සහ ඉතිරි අගයේ විශේෂයන් නිරිමි කරන ලද ඉතිරි අගයේ විශේෂ උपयোগ.

## Problems සඳහා නිවැරඩුම්

**ගිණුම්පත් ඉතාවුවා නොවිතින්**:
```bash
npm start -- --reset-cache
```

**Android දෝෂ**:
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

**iOS දෝෂ**:
```bash
cd ios && pod install --repo-update && cd ..
npm run ios
```

## Backend Flask සර්වරය දිරි අරමුණු කිරීම

ඔබගේ backend Python Flask සර්වරය සිටින්නම්:

```python
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/predictions', methods=['GET'])
def get_predictions():
    # ඔබගේ Model Prediction logic
    return jsonify({
        'data': [
            {
                'id': 1,
                'fish_name': 'Tilapia',
                'predicted_price': 450.50,
                'confidence': 0.95,
                'date': '2024-01-04'
            }
        ]
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

## නිවැරඩුම් සහ එකතු කිරීම

1. Fork ගිණුම්පත්
2. Feature branch සිටින්න
3. දෙවි commit කරන්න
4. Push සිටින්න
5. Pull Request සිටින්න

---

**සාධනිය:** ගවේෂණ කණ්ඩායම
**අනුවාදය:** 1.0.0
**නිර්මාණ දිනය:** 2026-01-04
