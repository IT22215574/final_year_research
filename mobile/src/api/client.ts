const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const api = {
  // Price Predictions
  getPredictions: async (fishId: number, port: string) => {
    const response = await fetch(`${API_BASE_URL}/predictions/${fishId}?port=${port}`);
    return response.json();
  },

  // Historical Data
  getHistoricalPrices: async (fishId: number, days: number = 30) => {
    const response = await fetch(`${API_BASE_URL}/prices/historical/${fishId}?days=${days}`);
    return response.json();
  },

  // Fish List
  getFishes: async () => {
    const response = await fetch(`${API_BASE_URL}/fish`);
    return response.json();
  },

  // Weather Data
  getWeather: async (port: string) => {
    const response = await fetch(`${API_BASE_URL}/weather/${port}`);
    return response.json();
  },

  // Festival Info
  getFestivals: async (startDate: string, endDate: string) => {
    const response = await fetch(`${API_BASE_URL}/festivals?start=${startDate}&end=${endDate}`);
    return response.json();
  },

  // Current Prices
  getCurrentPrices: async (port: string) => {
    const response = await fetch(`${API_BASE_URL}/prices/current?port=${port}`);
    return response.json();
  },

  // Port List
  getPorts: async () => {
    const response = await fetch(`${API_BASE_URL}/ports`);
    return response.json();
  },
};
