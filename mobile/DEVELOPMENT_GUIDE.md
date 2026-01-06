# Development Guide

## Quick Start

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Start Development Server
```bash
npm start
```

### 3. Run on Device/Emulator
- Press `a` for Android
- Press `i` for iOS
- Press `w` for Web

## Project Architecture

### Frontend Structure
```
src/
├── api/              # Backend API integration
├── screens/          # Main screen components
├── components/       # Reusable components
├── types/            # TypeScript interfaces
└── stores/           # Global state management
```

### State Management with Zustand

The app uses Zustand for state management. Example:

```typescript
// stores/priceStore.ts
import { create } from 'zustand';

interface PriceStore {
  prices: Array;
  setPrices: (prices: Array) => void;
}

const usePriceStore = create<PriceStore>((set) => ({
  prices: [],
  setPrices: (prices) => set({ prices }),
}));

export default usePriceStore;
```

### Using the Store in Components

```typescript
import usePriceStore from '../stores/priceStore';

export const HomeScreen = () => {
  const { prices, setPrices } = usePriceStore();
  
  // Your component logic
};
```

## API Integration

### Adding New API Endpoints

1. Add to `src/api/client.ts`:
```typescript
export const api = {
  // Existing endpoints...
  
  // New endpoint
  getFreshPrices: async (port: string) => {
    const response = await fetch(`${API_BASE_URL}/prices/fresh?port=${port}`);
    return response.json();
  },
};
```

2. Use in component:
```typescript
import { api } from '../api/client';

const prices = await api.getFreshPrices('Colombo');
```

## Adding New Screens

1. Create screen file: `src/screens/NewScreen.tsx`
2. Add navigation route
3. Connect to state management

Example:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const NewScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
```

## Creating Components

Example component:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MyComponentProps {
  title: string;
  value: number;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, value }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
```

## Styling

The app uses React Native StyleSheet:

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f4f6',
  },
  text: {
    fontSize: 16,
    color: '#1f2937',
  },
});
```

### Color Palette
- Primary: `#3b82f6` (Blue)
- Secondary: `#1e40af` (Dark Blue)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Amber)
- Danger: `#ef4444` (Red)
- Gray: `#6b7280`

## Type Safety

Use TypeScript interfaces for type safety:

```typescript
// types/index.ts
export interface FishPrice {
  id: string;
  fish_id: number;
  sinhala_name: string;
  common_name: string;
  price: number;
  date: string;
  port: string;
}
```

## Testing

### Run Tests
```bash
npm test
```

## Building

### Android APK
```bash
npx eas build --platform android --local
```

### iOS App
```bash
npx eas build --platform ios --local
```

## Debugging

### Enable Debug Mode
```bash
npm start -- --dev
```

### React DevTools
In development, shake the device to open the developer menu.

## Common Issues

### Module not found
```bash
npm install
npx expo start --clear
```

### Port already in use
```bash
npx expo start -c
```

### API not responding
- Check network connectivity
- Verify `REACT_APP_API_URL` in `.env`
- Ensure backend is running

## Performance Tips

1. Use React.memo for expensive components
2. Implement lazy loading for large lists
3. Optimize images and assets
4. Use FlatList instead of ScrollView for long lists

## Best Practices

1. Keep components small and focused
2. Use TypeScript for type safety
3. Maintain consistent naming conventions
4. Document complex logic
5. Use meaningful variable/function names
6. Keep styles co-located with components

## Resources

- [React Native Documentation](https://reactnative.dev)
- [Expo Documentation](https://docs.expo.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
