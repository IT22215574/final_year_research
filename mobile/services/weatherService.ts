// services/weatherService.ts - OpenMeteo Weather Integration
export interface WeatherData {
  windSpeed: number; // km/h
  waveHeight: number; // meters
  temperature?: number; // °C
  timestamp: string;
  location: {
    lat: number;
    lon: number;
  };
}

export interface WeatherForecast {
  date: string;
  windSpeed: number;
  waveHeight: number;
  conditions: string;
}

// Get current marine weather from OpenMeteo API
export const getCurrentWeather = async (
  lat: number,
  lon: number,
): Promise<WeatherData | null> => {
  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wind_speed_10m,wind_direction_10m&timezone=Asia/Colombo&wind_speed_unit=kmh`;

    console.log(`🌊 Fetching weather for: ${lat}, ${lon}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      windSpeed: data.current?.wind_speed_10m || 10,
      waveHeight: data.current?.wave_height || 1.0,
      temperature: data.current?.temperature_2m,
      timestamp: data.current?.time || new Date().toISOString(),
      location: { lat, lon },
    };
  } catch (error) {
    console.error("Weather fetch error:", error);
    return null;
  }
};

// Get weather for multiple zones (fishing areas)
export const getWeatherForZones = async (
  zones: any[],
): Promise<WeatherData[]> => {
  const weatherPromises = zones.map((zone) => {
    const lat = zone.lat || zone.latitude || 7.8731; // Default to Colombo
    const lon = zone.lon || zone.longitude || 80.7718;
    return getCurrentWeather(lat, lon);
  });

  const results = await Promise.all(weatherPromises);
  return results.filter((weather) => weather !== null) as WeatherData[];
};

// Get average weather from multiple zones
export const getAverageWeather = (
  weatherDataArray: WeatherData[],
): { windSpeed: number; waveHeight: number } => {
  if (weatherDataArray.length === 0) {
    return { windSpeed: 10, waveHeight: 1.0 }; // Default values
  }

  const totalWind = weatherDataArray.reduce((sum, w) => sum + w.windSpeed, 0);
  const totalWave = weatherDataArray.reduce((sum, w) => sum + w.waveHeight, 0);

  return {
    windSpeed: Math.round(totalWind / weatherDataArray.length),
    waveHeight: Math.round((totalWave / weatherDataArray.length) * 10) / 10,
  };
};

// Get 3-day weather forecast
export const getWeatherForecast = async (
  lat: number,
  lon: number,
): Promise<WeatherForecast[]> => {
  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&daily=wave_height_max,wind_speed_10m_max&forecast_days=3&timezone=Asia/Colombo&wind_speed_unit=kmh`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Forecast API error: ${response.status}`);
    }

    const data = await response.json();

    const forecasts: WeatherForecast[] = [];

    if (data.daily?.time) {
      for (let i = 0; i < data.daily.time.length; i++) {
        forecasts.push({
          date: data.daily.time[i],
          windSpeed: data.daily.wind_speed_10m_max[i] || 10,
          waveHeight: data.daily.wave_height_max[i] || 1.0,
          conditions: getWeatherCondition(
            data.daily.wind_speed_10m_max[i],
            data.daily.wave_height_max[i],
          ),
        });
      }
    }

    return forecasts;
  } catch (error) {
    console.error("Forecast fetch error:", error);
    return [];
  }
};

// Helper: Get weather condition description
const getWeatherCondition = (windSpeed: number, waveHeight: number): string => {
  if (windSpeed > 35 || waveHeight > 3.0) return "Dangerous";
  if (windSpeed > 25 || waveHeight > 2.0) return "Rough";
  if (windSpeed > 15 || waveHeight > 1.5) return "Moderate";
  return "Calm";
};

// Helper: Check if weather is safe for fishing
export const isWeatherSafeForFishing = (weather: WeatherData): boolean => {
  return weather.windSpeed <= 30 && weather.waveHeight <= 2.5;
};

// Helper: Get weather emoji
export const getWeatherEmoji = (
  windSpeed: number,
  waveHeight: number,
): string => {
  if (windSpeed > 35 || waveHeight > 3.0) return "⛈️";
  if (windSpeed > 25 || waveHeight > 2.0) return "🌊";
  if (windSpeed > 15 || waveHeight > 1.5) return "💨";
  return "☀️";
};
