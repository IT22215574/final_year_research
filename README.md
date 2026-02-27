# SMART FISHER LANKA


🚀 Quick Start
Local Development Setup
Continue to Installation for detailed setup instructions.

📥 Installation
Step 1: Clone the Repository
git clone https://github.com/FAITE-TECH/learnup-platform.git
cd learnup-platform
Step 2: Install Dependencies
The project uses pnpm workspaces. Install all dependencies from the root:

pnpm install
Note: If prompted to approve build scripts, select "Yes, approve all" (especially for @prisma/client, @nestjs/core, electron).

Step 3: Database Setup
Choose one of the following methods:

Method A: Local PostgreSQL
Create Database:

# Connect to PostgreSQL
psql -U postgres

# In psql:
CREATE DATABASE learnup_db;
CREATE USER learnup_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE learnup_db TO learnup_user;
\q
Configure Connection: Create .env file in apps/backend/:

cd apps/backend
cp .env.example .env
Update DATABASE_URL in .env:

DATABASE_URL="postgresql://learnup_user:your_secure_password@localhost:5432/learnup_db?schema=public"
Method B: Docker PostgreSQL
# Start only PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for containers to be ready (5-10 seconds)
The database URL is already configured in apps/backend/.env.example for Docker.

Step 4: Configure Environment Variables
cd apps/backend

# Copy example environment file
cp .env.example .env

# Edit .env and update the following CRITICAL variables:
Required Environment Variables:

# Database (update if using local PostgreSQL)
DATABASE_URL="postgresql://learnup_user:password@localhost:5432/learnup_db?schema=public"

# JWT Secrets (MUST CHANGE IN PRODUCTION)
JWT_SECRET="your-super-secure-jwt-secret-key-minimum-32-characters-long"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-key-minimum-32-characters"

# Application
NODE_ENV=development
PORT=5000

# CORS (add your frontend URLs)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
Step 5: Initialize Database
# From apps/backend directory
cd apps/backend

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Seed database with test data (optional but recommended)
pnpm run db:seed
After seeding, you'll have test accounts for all roles (details in Default Users section).

⚙️ Configuration
Backend Configuration
File: apps/backend/.env

# ==============================================
# DATABASE
# ==============================================
DATABASE_URL="postgresql://learnup_user:password@localhost:5432/learnup_db?schema=public"
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=learnup_user
DB_PASSWORD=your_password
DB_NAME=learnup_db

# ==============================================
# APPLICATION
# ==============================================
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000
WEB_URL=http://localhost:3000

# ==============================================
# JWT AUTHENTICATION (REQUIRED)
# ==============================================
JWT_SECRET="generate-a-secure-random-string-min-32-chars"
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET="generate-another-secure-random-string-min-32-chars"
JWT_REFRESH_EXPIRES_IN=7d

# ==============================================
# REDIS (Optional in development)
# ==============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ==============================================
# CORS (Add your frontend URLs)
# ==============================================
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006,capacitor://localhost

# ==============================================
# SECURITY
# ==============================================
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=your-session-secret-key

# ==============================================
# FILE UPLOADS
# ==============================================
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# ==============================================
# EMAIL (Notification System)
# ==============================================
# Set EMAIL_ENABLED=true to enable email notifications
EMAIL_ENABLED=false
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SECURE=false
EMAIL_FROM=noreply@learnup.com
EMAIL_FROM_NAME=LearnUp Platform

# See docs/EMAIL_SETUP.md for detailed configuration guide
Frontend Configuration
File: apps/frontend/.env.local

NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=LearnApp
Mobile Configuration
File: apps/mobile/application/app.config.ts

Update the apiUrl in the extra section:

export default {
  expo: {
    // ... other config
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api/v1",
    },
  },
};
Desktop Configuration
File: apps/mobile-desktop/src/lib/api-client.ts

Update the BASE_URL:

const BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";
🏃 Running Applications
Backend API
cd apps/backend

# Development mode (with hot reload)
pnpm run start:dev

# Debug mode
pnpm run start:debug

# Production mode
pnpm run build
pnpm run start:prod
Backend will be available at: http://localhost:5000
API Documentation: http://localhost:5000/api/docs

Frontend (Next.js)
cd apps/frontend

# Development mode
pnpm run dev

# Production build
pnpm run build
pnpm run start
Frontend will be available at: http://localhost:3000

🔔 Notification System
The platform includes a comprehensive real-time notification system with multiple delivery channels.

Features
✅ Real-Time WebSocket Notifications: Instant delivery to online users
✅ Email Notifications: Beautiful HTML emails with responsive design
✅ Database Persistence: All notifications stored and retrievable
✅ Multiple Notification Types: Exams, classes, system updates, announcements
✅ Unread Tracking: Badge counts and status management
✅ Mark as Read: Individual or bulk operations
🔄 Push Notifications: Coming soon (FCM/APNS)
🔄 Daily Digest Emails: Coming soon
Quick Setup
1. Enable Email Notifications (Optional)
# Edit apps/backend/.env
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=LearnUp Platform
For detailed email setup instructions, see docs/EMAIL_SETUP.md

2. Test Notifications
Start the backend: cd apps/backend && pnpm start:dev
Start the frontend: cd apps/frontend && pnpm dev
Login and trigger a notification event (e.g., approve a teacher)
Check:
Real-time notification appears in bell icon
Toast popup shows new notification
Email sent (if enabled)
Architecture
Event → NotificationsService → [Database + WebSocket + Email]
                                       ↓           ↓         ↓
                                   Prisma    Gateway  EmailService
                                       ↓           ↓         ↓
                                   Storage   Online Users  SMTP
Documentation
Email Configuration Guide - Complete SMTP setup
Implementation Summary - Technical details
Next Steps - Roadmap and future enhancements
🧪 Testing
Backend Tests
cd apps/backend

# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Run E2E tests
pnpm test:e2e
Test Coverage: 51 test cases covering authentication, notifications, and exam management.

Frontend Tests
cd apps/frontend

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test -- --coverage
Mobile (Expo)
cd apps/mobile/

# Start Expo dev server
pnpm start

# Run on Android
pnpm run android

# Run on iOS (macOS only)
pnpm run ios

# Run in web browser
pnpm run web
Desktop (Electron)
cd apps/mobile-desktop

# Development mode
pnpm run dev

# Build for production
pnpm run build:win      # Windows
pnpm run build:mac      # macOS
pnpm run build:linux    # Linux
🐳 Docker Deployment
Quick Start with Docker
The easiest way to get the LearnApp Platform running is with Docker:

# Clone the repository
git clone https://github.com/FAITE-TECH/learnup-platform.git
cd learnup-platform

# Start all services (first time setup)
docker-compose up -d

# Wait for services to initialize (30-60 seconds)
# Check logs
docker-compose logs -f backend

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# API Docs: http://localhost:5000/api/docs
Services Started
Service	Port	URL	Description
frontend	3000	http://localhost:3000	Next.js Web Application
backend	5000	http://localhost:5000	NestJS API Server
postgres	5432	localhost:5432	PostgreSQL Database
redis	6379	localhost:6379	Redis Cache
Database Initialization
The database is automatically initialized on first run:

✅ Migrations applied automatically
✅ Seed data loaded (test users and sample data)