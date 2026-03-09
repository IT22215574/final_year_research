const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const api = {
  // Model Predictions (trained model output)
  getModelPredictions: async (fishName: string, days: number = 7) => {
    try {
      const response = await fetch(`${API_BASE_URL}/predict?fish=${encodeURIComponent(fishName)}&days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch predictions');
      return response.json();
    } catch (error) {
      console.error('Error fetching model predictions:', error);
      return { predictions: [], error: 'Failed to load predictions' };
    }
  },

  // Training Status & Metrics
  getModelStatus: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/model/status`);
      if (!response.ok) throw new Error('Failed to fetch model status');
      return response.json();
    } catch (error) {
      console.error('Error fetching model status:', error);
      return { trained: false, error: 'Failed to load model status' };
    }
  },

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
