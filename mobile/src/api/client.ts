import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:5000'; // Backend URL එක සකසන්න

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const fetchPricePredict = async () => {
  try {
    const response = await apiClient.get('/api/predictions');
    return response.data;
  } catch (error) {
    console.error('Error fetching predictions:', error);
    throw error;
  }
};

export const fetchHistoricalPrices = async () => {
  try {
    const response = await apiClient.get('/api/history');
    return response.data;
  } catch (error) {
    console.error('Error fetching history:', error);
    throw error;
  }
};

export const fetchWeatherData = async () => {
  try {
    const response = await apiClient.get('/api/weather');
    return response.data;
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
};

export const fetchModelMetrics = async () => {
  try {
    const response = await apiClient.get('/api/model-metrics');
    return response.data;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
};

export default apiClient;
