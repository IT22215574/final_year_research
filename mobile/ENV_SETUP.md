# Mobile App - Environment Configuration

## Setup

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your environment variables:**
   
   Edit `.env` and update the following based on your development setup:

### For iOS Simulator
```env
EXPO_PUBLIC_API_URL=http://localhost:5006
EXPO_PUBLIC_FISH_API_URL=http://localhost:8000
```

### For Android Emulator
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5006
EXPO_PUBLIC_FISH_API_URL=http://10.0.2.2:8000
```

### For Physical Device (same WiFi network)
```env
EXPO_PUBLIC_API_URL=http://YOUR_MACHINE_IP:5006
EXPO_PUBLIC_FISH_API_URL=http://YOUR_MACHINE_IP:8000
```

Replace `YOUR_MACHINE_IP` with your computer's local IP address (e.g., `192.168.1.100`).

## Finding Your Local IP Address

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

Look for your WiFi adapter's IPv4 address.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Main NestJS backend API (port 5006) | `http://localhost:5006` |
| `EXPO_PUBLIC_FISH_API_URL` | Fish quality grading FastAPI backend (port 8000) | `http://localhost:8000` |

## Backend Services

Make sure both backend services are running:

1. **NestJS Backend (port 5006):**
   ```bash
   cd ../Backend
   pnpm run start:dev
   ```

2. **FastAPI Backend (port 8000):**
   ```bash
   cd ../model
   python -m uvicorn main:app --reload --port 8000
   ```

## Starting the App

```bash
# Install dependencies
pnpm install

# Start Expo
npx expo start

# Or for web
npx expo start --web
```

## Troubleshooting

### Cannot connect to backend from physical device

1. Ensure your device is on the same WiFi network as your development machine
2. Check firewall settings allow connections on ports 5006 and 8000
3. Verify your `.env` file has your correct local IP address
4. Restart the Expo development server after changing `.env`

### Environment variables not updating

Expo caches environment variables. To force a refresh:
```bash
npx expo start --clear
```
