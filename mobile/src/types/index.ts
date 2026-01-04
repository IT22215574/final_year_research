// App type definitions

export interface PredictionData {
  id?: number;
  fish_name: string;
  predicted_price: number;
  confidence: number;
  date: string;
}

export interface HistoryData {
  id?: number;
  fish_name: string;
  actual_price: number;
  predicted_price?: number;
  accuracy?: number;
  date: string;
}

export interface ModelMetrics {
  accuracy: number;
  mse: number;
  rmse: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  wind_speed: number;
  condition: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}
