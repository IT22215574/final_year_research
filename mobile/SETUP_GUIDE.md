# Mobile App Setup Guide

## පිටු සිංහල උපදෙස (Sinhala Guide)

මෙම පිටුව React Native Expo මිටුවලට උසස් ගිණුම් පිහිටුවීමට උපකරණ සපයන අතර, ඇතුළු ස්ක්‍රීනවල සිට ප්‍රබන්ධ කිරීම සිදු කරයි.

### පියවර 1: පරිසරය පිහිටුවීම

```bash
cd mobile
npm install
```

### පියවර 2: සරිවර ලිපිනය හඳුනා දීම

එක්ස්පෝ ගිණුමට පිවිසුම් විස්තර සඳහා, `.env` ගොනුවක් නිර්මාණ කරන්න:

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_ENV=development
```

### පියවර 3: සඉතිවෙන්න

```bash
npm start
```

ඉන්පසු:
- `a` - Android දිවයිනේ ක්‍රීඩා කිරීමට
- `i` - iOS දිවයිනේ ක්‍රීඩා කිරීමට
- `w` - Web ගිණුමට ක්‍රීඩා කිරීමට

---

## English Setup Guide

### Step 1: Environment Setup

```bash
cd mobile
npm install
```

### Step 2: Configure Backend URL

Create a `.env` file in the mobile directory:

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_ENV=development
```

### Step 3: Start Development

```bash
npm start
```

Then press:
- `a` - Run on Android
- `i` - Run on iOS
- `w` - Run on Web

### Step 4: Build for Production

#### Android APK
```bash
npx eas build --platform android --local
```

#### iOS App
```bash
npx eas build --platform ios --local
```

## Project Structure

```
mobile/
├── app/                    # App routing with Expo Router
├── src/
│   ├── api/
│   │   └── client.ts       # API client
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── PredictionsScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── types/
│   │   └── index.ts        # Type definitions
│   └── stores/
│       └── priceStore.ts   # Zustand store
├── components/             # Reusable components
│   └── PriceCard.tsx
└── constants/              # Constants
    └── index.tsx
```

## Features

✅ Real-time fish price predictions
✅ Multi-port data (Colombo, Negombo, Galle, etc.)
✅ Weather integration
✅ Festival impact analysis
✅ Historical trends
✅ Bilingual support (English/Sinhala)

## Technologies

- React Native 0.81
- Expo SDK 54
- TypeScript
- Zustand (State Management)
- Axios (HTTP Client)
- React Navigation

## Troubleshooting

### Module not found errors
```bash
npm install
npx expo start --clear
```

### API connection issues
1. Check `REACT_APP_API_URL` in `.env`
2. Ensure backend is running
3. Check network connectivity

### Build errors
```bash
npm cache clean --force
rm -rf node_modules
npm install
npm start
```

## Next Steps

1. Connect to backend API
2. Implement user authentication
3. Add push notifications
4. Implement offline functionality
5. Add advanced charts and analytics
