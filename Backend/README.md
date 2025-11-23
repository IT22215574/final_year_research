# LearnUp Admin Panel - NestJS Backend

A complete NestJS backend for the LearnUp Admin Panel, migrated from Express.js with MongoDB integration.

## Features

- **NestJS Framework** - Modern, modular architecture
- **MongoDB** with Mongoose ORM
- **JWT Authentication** - Secure token-based auth
- **Input Validation** - Using class-validator
- **File Upload** - Multer integration
- **Email & SMS** - OTP verification via email and Twilio
- **Error Handling** - Global exception filter
- **CORS** - Configured for frontend integration

## Prerequisites

- Node.js 18+
- MongoDB Atlas account or local MongoDB
- Twilio account (for SMS/WhatsApp OTP)

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGO=mongodb+srv://your-connection-string

# JWT
JWT_SECRET=your-secret-key

# Server
PORT=3000

# Twilio (for OTP)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
WHATSAPP_SANDBOX_NUMBER=your_whatsapp_number
WHATSAPP_SANDBOX_PHRASE=your_sandbox_phrase
```

## Running the Application

### Development Mode

```bash
npm run start:dev
```

The server will run on `http://localhost:3000`

### Production Build

```bash
npm run build
npm run start:prod
```

## API Endpoints

### Authentication (`/api/auth`)

- `POST /signin` - Sign in with email and password
- `POST /signout` - Sign out user
- `POST /request-mobile-verification` - Request OTP for mobile
- `POST /verify-mobile-otp` - Verify mobile OTP
- `POST /complete-signup` - Complete user registration
- `POST /check-account` - Check if account exists
- `POST /send-password-reset-otp` - Send password reset OTP
- `POST /verify-password-reset-otp` - Verify password reset OTP
- `POST /reset-password` - Reset user password

### Users (`/api/users`)

- `GET /` - Get all users
- `GET /search?q={query}` - Search users
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user

## Project Structure

```
nestjs-backend/
├── src/
│   ├── auth/                 # Authentication module
│   │   ├── dto/             # Data transfer objects
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── user/                # User management module
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── user.module.ts
│   ├── schemas/             # Mongoose schemas
│   │   ├── user.schema.ts
│   │   ├── package.schema.ts
│   │   └── advertisement.schema.ts
│   ├── common/              # Shared utilities
│   │   └── filters/
│   │       └── http-exception.filter.ts
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry point
├── uploads/                 # File upload directory
├── .env                     # Environment variables
├── nest-cli.json           # NestJS CLI configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies
```

## Modules

### Auth Module
Handles all authentication-related operations:
- User sign in/sign out
- Mobile verification with OTP
- Email verification
- Password reset flow
- JWT token generation

### User Module
Manages user CRUD operations:
- Get all users
- Search users
- Update user profile
- Delete users

## Database Schemas

### User Schema
- Basic auth fields (email, mobile, password, username)
- Personal information (fullName, dob)
- User type (Internal Student, External Student, Teacher)
- Academic information (district, zone, grade, school, medium, institution)
- Verification fields (isVerified, isAdmin, otp, otpExpires)

### Package Schema
- Package information (name, type, description)
- Pricing (price, duration, maxAds)
- Features and status
- Popularity indicators

### Advertisement Schema
- User reference
- Category and details
- Contact information
- Location data
- Status and approval flow
- View tracking

## Migration from Express

This NestJS backend replaces the Express.js backend with:

1. **Modular Structure** - Better code organization
2. **Type Safety** - Full TypeScript support with decorators
3. **Dependency Injection** - Built-in DI container
4. **Validation** - Automatic request validation
5. **Documentation** - Better maintainability

## Key Differences from Express Version

- Uses NestJS decorators instead of Express middleware
- Modular architecture with separate modules for each feature
- Built-in validation with class-validator
- Better error handling with exception filters
- Improved code organization and maintainability

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Notes

- All routes are prefixed with `/api`
- CORS is configured for `localhost:5173` and `localhost:3001`
- Cookies are used for JWT storage (HTTP-only)
- File uploads are stored in the `uploads/` directory
- MongoDB connection uses Mongoose with automatic reconnection
