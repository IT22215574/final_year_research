// utils/api.ts
import * as SecureStore from 'expo-secure-store';

// Use EXPO_PUBLIC_API_URL from .env file
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from SecureStore
  const accessToken = await SecureStore.getItemAsync("access_token");

  const isFormDataBody =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  
  const headers: Record<string, string> = {
    ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
    'x-client-type': 'mobile',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }), // CRITICAL: Add token
    ...(options.headers as Record<string, string>),
  };

  console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
  console.log(`📨 Headers:`, Object.keys(headers)); // Debug headers
  console.log(`🔐 Token Present:`, !!accessToken);
  
  try {
    const response = await fetch(url, { 
      headers,
      credentials: 'include',
      ...options 
    });
    
    console.log(`📡 Response: ${response.status} for ${endpoint}`);
    
    return response;
  } catch (error) {
    console.error(`❌ API Error for ${endpoint}:`, error);
    throw error;
  }
};