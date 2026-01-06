// API Configuration for Mobile App
// Set these in your environment or use defaults

export const API_CONFIG = {
  // Fish Price Prediction API (Python/FastAPI)
  PREDICTION_API:
    process.env.EXPO_PUBLIC_PREDICTION_API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://192.168.8.100:8000',
  
  // User Authentication API (NestJS)
  AUTH_API:
    process.env.EXPO_PUBLIC_AUTH_URL ||
    process.env.EXPO_PUBLIC_API_KEY ||
    'http://192.168.8.100:5000',
};

export default API_CONFIG;
