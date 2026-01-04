# React Native ඉතිරි අගය Prediction App

ඉතිරි අගය සිටින සිටින පුරෝකථන දෙස බැලීමට සහ විශ්ලේෂණ කිරීමට React Native වලින් හදන ලද මොබයිල් ඇප්ලිකේෂන.

## විශේෂතා

✅ **පුරෝකථන ප්‍රදර්ශනය** - නිතිපතා ඉතිරි අගයේ පුරෝකථන බලන්න
✅ **ඉතිහාස නිරීක්ෂණ** - පුරෝකථන ඉතිහාසය නිරීක්ෂණ කරන්න
✅ **ප්‍රස්තාර විශ්ලේෂණ** - අගයේ ප්‍රවර්තන ශ්‍රිතිය බිම්බ කරන්න
✅ **ස්වයංක්‍රිය යාවත්කාලීන** - සක්‍රිය දත්තවලින් පුරණ භාවය රැකෙන්න
✅ **සිංහල අතරුපුටු** - සිංහල භාෂාවට සම්පූර්ණ සහයෝගය

## පරිසර පිටිවෙතු

ඔබ අවශ්‍ය තිබුණුයේ:

- Node.js 16 හෝ ඊට ඉහළ
- npm හෝ yarn
- React Native CLI
- Android Studio (Android සඳහා)
- Xcode (iOS සඳහා)

## ස්ථාපනය

```bash
# නිර්ගමන නිර්දේශ ස්ථාපනය කරන්න
npm install

# හෝ yarn භාවිතා කරන්න
yarn install
```

## ඇයි දරන්නම්

### Android

```bash
npm run android
```

### iOS

```bash
npm run ios
```

### සර්වරය ඉදිරිපත් කරන්න

```bash
npm start
```

## Backend API එක සිටින්නම්

`src/api/client.ts` වලින් API Base URL සිටින්න:

```typescript
const API_BASE_URL = 'http://localhost:5000'; // ඔබගේ backend URL එක
```

## ගිණුම්පත් ව්‍යුහය

```
mobile/
├── src/
│   ├── api/
│   │   └── client.ts           # API ඒකාබද්ධ කිරීම
│   ├── screens/
│   │   ├── HomeScreen.tsx       # අගතම තිරය
│   │   ├── PredictionsScreen.tsx # පුරෝකථන තිරය
│   │   ├── HistoryScreen.tsx    # ඉතිහාස තිරය
│   │   └── SettingsScreen.tsx   # සැකසුම් තිරය
│   └── types/
│       └── index.ts             # TypeScript වර්ග නිර්වචන
├── App.tsx                      # ඇප්ලිකේෂන ඇතුලා එනුම්
├── index.js                     # ඇතුලා එනුමි ස්ථානය
├── package.json                 # පරිකල්පිත බිම්බ
├── app.json                     # ඇප්ලිකේෂන කර්න
├── tsconfig.json                # TypeScript ගිණුම්පත්
└── README.md                    # මෙම ලිපිනය
```

## API අවශ්‍යතා

Backend API එක පහත සඳහන් endpoints විතරින් සම්පූර්ණ විය යුතුයි:

### GET /api/predictions
නවතම පුරෝකථන ලබා ගන්න

```json
[
  {
    "id": 1,
    "fish_name": "තිල්පියා",
    "predicted_price": 450.50,
    "confidence": 0.95,
    "date": "2024-01-04"
  }
]
```

### GET /api/history
ඉතිරි අගයේ ඉතිහාසය ලබා ගන්න

```json
[
  {
    "id": 1,
    "fish_name": "තිල්පියා",
    "actual_price": 450.00,
    "predicted_price": 450.50,
    "accuracy": 0.95,
    "date": "2024-01-03"
  }
]
```

### GET /api/model-metrics
ප්‍රමාණ සහ ගිණුම්පත් ලබා ගන්න

```json
{
  "accuracy": 0.92,
  "mse": 1234.56,
  "rmse": 35.12
}
```

### GET /api/weather
වර්තමාන කාලගුණ දත්ත ලබා ගන්න

## සැකසුම් විකල්ප

ඔබ පසුව සැකසුම් තිරයෙන් පහත සිටින ලිපි සකස් කිරීමට ඉඩ දීමට පුළුවන:

- දැනුම්දීම් සක්‍රිය කිරීම
- ස්වයංක්‍රිය යාවත්කාලීන
- තිමිර මාතෘකා
- සර්වරය සකසුම්
- කසුවක ඉවත් කිරීම

## සම්නතවලට විශ්ලේෂණ

```bash
npm run lint
```

## පරීක්ෂාවලට දරන්න

```bash
npm test
```

## ප්‍රකාශන නිර්මාණය

### Android

```bash
cd android
./gradlew assembleRelease
```

### iOS

```bash
cd ios
xcodebuild -workspace FishPricePredictorApp.xcworkspace -scheme FishPricePredictorApp -configuration Release
```

## නිවැරඩුම් සහ ගැයුම්

ගැයුම් සහ නිවැරඩුම් සඳහා GitHub ප්‍රකාශන (Pull Requests) සිටින්න.

## බිම්බ කිරිමේ නිසි ඉඩ

MIT License - විස්තර සඳහා [LICENSE](LICENSE) බැලී බලන්න

## සම්බන්ධ කරන්න

ප්‍රශ්න හෝ අදහසක් තිබුණු විටින්, කරුණාකර issue එක සිටින්න.

---

**නිර්මාණ කරන ලද:** ගවේෂණ කණ්ඩායම
**අනුවාදය:** 1.0.0
**අවසාන සංස්කරණ:** 2026-01-04
