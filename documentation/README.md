# SMART FISHER LANKA

Monorepo containing:
- `Backend/` — NestJS + MongoDB API
- `web-app/` — Next.js admin/web frontend
- `mobile/` — Expo React Native mobile app
- `model/` — Python scripts for model training/inference

## Prerequisites

### Required
- Node.js 18+ (recommended)
- `pnpm` (recommended, because this repo includes `pnpm-lock.yaml` files)
- MongoDB (Atlas or local)

### Mobile development (only if running the Expo app)
- Expo Go app (quickest) OR Android Studio / Xcode for emulators

### Model scripts (only if running ML scripts)
- Python 3.10+ and `pip`

## Install dependencies

This repo has separate apps, so install dependencies per folder.

```bash
# Backend (NestJS)
pnpm install

# Web app (Next.js)
pnpm install

# Mobile app (Expo)
pnpm install
```

## Environment variables

### Backend (`Backend/.env`)

Create `Backend/.env`:

```env
# MongoDB connection string
MONGO=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# JWT secret used to sign tokens
JWT_SECRET=change-me

# Optional (defaults to 5000)
PORT=5000


# ==============================================
# JWT AUTHENTICATION (REQUIRED)
# ==============================================
JWT_SECRET="generate-a-secure-random-string-min-32-chars"
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET="generate-another-secure-random-string-min-32-chars"
JWT_REFRESH_EXPIRES_IN=7d
```

Notes:
- The backend sets a global prefix: `/api/v1`.
- By default it runs at `http://localhost:5000`.
- CORS is enabled for local dev origins (see `Backend/src/main.ts`).

### Web app (`web-app/.env.local`)

Create `web-app/.env.local`:

```env
# Base URL of the backend INCLUDING the /api/v1 prefix
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

If you do not set this, the app falls back to `http://localhost:5000/api/v1`.

### Mobile app (`mobile/.env`)

The mobile app reads the API base URL from `EXPO_PUBLIC_API_KEY` (name is a bit misleading, but that’s what the code uses).

Create `mobile/.env`:

```env
# For iOS simulator / Android emulator you can often use localhost.
# For a real device, use your computer's LAN IP (e.g. http://192.168.1.20:5000/api/v1)
EXPO_PUBLIC_API_KEY=http://localhost:5000/api/v1
```

## Run the applications

### 1) Start the backend API
From the repo root:

```bash
pnpm -C Backend start:dev
```

Or:

```bash
cd Backend
pnpm start:dev
```

Note: you must create `Backend/.env` (at minimum set `MONGO` and `JWT_SECRET`) or the server will fail to start.

Backend will log the URL (default `http://localhost:5000`).

Quick check:
- `GET http://localhost:5000/api/v1` (may 404 depending on routes, but the server should be reachable)

### 2) Start the web app

Frontend (Next.js)
cd web-app

# Development mode
pnpm run dev

Open the URL printed by Next.js (usually `http://localhost:3000`).

### 3) Start the mobile app

cd mobile

```bash
npx expo start
```

Then:
- press `i` for iOS simulator, `a` for Android emulator, or
- scan the QR code in Expo Go (make sure `EXPO_PUBLIC_API_KEY` points to a reachable IP from your phone).

## Model (Python) — training & prediction

The ML scripts live under `model/finding fish location/train/`.

### Install Python dependencies

There is no `requirements.txt` currently; a typical setup is:

```bash
python -m pip install -U pip
python -m pip install pandas numpy scikit-learn joblib global-land-mask
```

`global-land-mask` is used to filter land points in Sri Lanka (see `land_mask.py`).

### Train the model

```bash
python "model/finding fish location/train/train_random_forest.py" \
	--data "model/finding fish location/train/final_dataset_no_bathymetry.csv"
```

This writes a model artifact under:
- `model/finding fish location/train/models/rf_fish_zone_model.pkl`

### Predict fish presence (0/1)

```bash
python "model/finding fish location/train/predict_fish_zone.py" \
	--lat 7.2 --lon 80.6 --sst 28.0 --chlorophyll 0.3 --u 0.2 --v 0.1
```

## Useful scripts

### Backend
- Dev server: `pnpm -C Backend start:dev`
- Build: `pnpm -C Backend build`

### Web
- Dev server: `pnpm -C web-app dev`
- Production build: `pnpm -C web-app build`

### Mobile
- Expo dev server: `pnpm -C mobile start`
- Android: `pnpm -C mobile android`
- iOS: `pnpm -C mobile ios`

## Troubleshooting

- **Web/mobile can’t reach the backend**: confirm `NEXT_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_API_KEY` is correct and includes `/api/v1`.
- **Running on a real phone**: do not use `localhost`; use your computer’s LAN IP (same Wi‑Fi).
- **MongoDB connection errors**: verify `Backend/.env` has a valid `MONGO` connection string and that your IP is allowed in Atlas.


# ==============================================
# SECURITY
# ==============================================
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=your-session-secret-key

==============================================
# EMAIL (Notification System)
# ==============================================
# Set EMAIL_ENABLED=true to enable email notifications
EMAIL_ENABLED=false
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SECURE=false
EMAIL_FROM=noreply@Smartfisher.com
EMAIL_FROM_NAME=Smart fisher