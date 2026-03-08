export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000/api/v1",
} as const;
