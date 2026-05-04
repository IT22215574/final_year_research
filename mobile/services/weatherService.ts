// services/weatherService.ts - OpenMeteo Weather Integration
export interface WeatherData {
  windSpeed: number; // km/h
  waveHeight: number; // meters
  rainMmPerHour?: number; // mm/hour
  temperature?: number; // °C
  routeWeightKm?: number;
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
  rainMmPerHour?: number;
  conditions: string;
}

const numberOrDefault = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Get current route weather from Open-Meteo.
// Forecast API provides wind/precipitation; Marine API provides wave height.
export const getCurrentWeather = async (
  lat: number,
  lon: number,
): Promise<WeatherData | null> => {
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,precipitation,temperature_2m&timezone=Asia/Colombo&wind_speed_unit=kmh&precipitation_unit=mm`;
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height&timezone=Asia/Colombo`;

    console.log(`🌊 Fetching weather for: ${lat}, ${lon}`);

    const [weatherResponse, marineResponse] = await Promise.all([
      fetch(weatherUrl),
      fetch(marineUrl),
    ]);

    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }
    if (!marineResponse.ok) {
      throw new Error(`Marine API error: ${marineResponse.status}`);
    }

    const [weatherData, marineData] = await Promise.all([
      weatherResponse.json(),
      marineResponse.json(),
    ]);

    return {
      windSpeed: numberOrDefault(weatherData.current?.wind_speed_10m, 10),
      waveHeight: numberOrDefault(marineData.current?.wave_height, 1.0),
      rainMmPerHour: numberOrDefault(weatherData.current?.precipitation, 0),
      temperature: numberOrDefault(weatherData.current?.temperature_2m, 28),
      timestamp:
        weatherData.current?.time ||
        marineData.current?.time ||
        new Date().toISOString(),
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
  const weatherPromises = zones.map(async (zone) => {
    const lat = zone.lat || zone.latitude || 7.8731; // Default to Colombo
    const lon = zone.lon || zone.longitude || 80.7718;
    const weather = await getCurrentWeather(lat, lon);
    if (!weather) return null;

    const routeWeightKm = numberOrDefault(zone.distance, 1);
    return {
      ...weather,
      routeWeightKm: routeWeightKm > 0 ? routeWeightKm : 1,
    };
  });

  const results = await Promise.all(weatherPromises);
  return results.filter((weather) => weather !== null) as WeatherData[];
};

// Get route-level weather from multiple zones.
// Uses average + max so one rough route segment still influences cost/risk.
export const getAverageWeather = (
  weatherDataArray: WeatherData[],
): { windSpeed: number; waveHeight: number; rainMmPerHour: number } => {
  if (weatherDataArray.length === 0) {
    return { windSpeed: 10, waveHeight: 1.0, rainMmPerHour: 0 }; // Default values
  }

  const weights = weatherDataArray.map((w) => w.routeWeightKm || 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;

  const weightedAvg = (getValue: (weather: WeatherData) => number) =>
    weatherDataArray.reduce(
      (sum, weather, index) => sum + getValue(weather) * weights[index],
      0,
    ) / totalWeight;

  const windValues = weatherDataArray.map((w) => w.windSpeed);
  const waveValues = weatherDataArray.map((w) => w.waveHeight);
  const rainValues = weatherDataArray.map((w) => w.rainMmPerHour || 0);

  const routeWind =
    weightedAvg((weather) => weather.windSpeed) * 0.7 +
    Math.max(...windValues) * 0.3;
  const routeWave =
    weightedAvg((weather) => weather.waveHeight) * 0.7 +
    Math.max(...waveValues) * 0.3;
  const routeRain =
    weightedAvg((weather) => weather.rainMmPerHour || 0) * 0.7 +
    Math.max(...rainValues) * 0.3;

  return {
    windSpeed: Math.round(routeWind),
    waveHeight: Math.round(routeWave * 10) / 10,
    rainMmPerHour: Math.round(routeRain * 10) / 10,
  };
};

// Get 3-day weather forecast
export const getWeatherForecast = async (
  lat: number,
  lon: number,
): Promise<WeatherForecast[]> => {
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=wind_speed_10m_max,precipitation_sum&forecast_days=3&timezone=Asia/Colombo&wind_speed_unit=kmh&precipitation_unit=mm`;
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&daily=wave_height_max&forecast_days=3&timezone=Asia/Colombo`;

    const [weatherResponse, marineResponse] = await Promise.all([
      fetch(weatherUrl),
      fetch(marineUrl),
    ]);

    if (!weatherResponse.ok) throw new Error(`Forecast API error: ${weatherResponse.status}`);
    if (!marineResponse.ok) throw new Error(`Marine forecast API error: ${marineResponse.status}`);

    const [weatherData, marineData] = await Promise.all([
      weatherResponse.json(),
      marineResponse.json(),
    ]);

    const forecasts: WeatherForecast[] = [];

    if (weatherData.daily?.time) {
      for (let i = 0; i < weatherData.daily.time.length; i++) {
        const windSpeed = numberOrDefault(
          weatherData.daily.wind_speed_10m_max?.[i],
          10,
        );
        const waveHeight = numberOrDefault(
          marineData.daily?.wave_height_max?.[i],
          1.0,
        );
        const rainMmPerHour =
          numberOrDefault(weatherData.daily.precipitation_sum?.[i], 0) / 24;

        forecasts.push({
          date: weatherData.daily.time[i],
          windSpeed,
          waveHeight,
          rainMmPerHour,
          conditions: getWeatherCondition(windSpeed, waveHeight),
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
