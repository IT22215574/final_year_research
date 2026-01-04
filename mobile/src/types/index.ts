export interface FishPrice {
  id: string;
  date: string;
  fish_id: number;
  sinhala_name: string;
  common_name: string;
  price: number;
  stock: number;
  port: string;
}

export interface PricePrediction {
  fish_id: number;
  sinhala_name: string;
  common_name: string;
  date: string;
  predicted_price: number;
  confidence: number;
  port: string;
}

export interface WeatherData {
  date: string;
  temp_c_mean: number;
  humidity_mean: number;
  wind_speed_max: number;
  rainfall_sum: number;
  bad_weather_any: boolean;
  port: string;
}

export interface FestivalInfo {
  date: string;
  festival_name: string;
  is_festival_day: boolean;
  days_to_festival: number;
}

export interface HistoricalData {
  dates: string[];
  prices: number[];
  averages: number[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  token: string;
}
