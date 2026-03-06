import aiohttp
import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
import math

class RealTimeDataEngine:
    """Real-time data integration engine for live market and environmental data"""
    
    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self.data_cache_path = os.path.join(model_dir, "realtime_cache.json")
        self.config_path = os.path.join(model_dir, "realtime_config.json")
        self._initialize_config()
        self.session = None
        
    def _initialize_config(self):
        """Initialize real-time data source configurations"""
        if not os.path.exists(self.config_path):
            default_config = {
                "dataSources": {
                    "fuelPrices": {
                        "enabled": True,
                        "updateIntervalMinutes": 60,
                        "apiEndpoints": {
                            "primary": "https://api.fuel-prices.com/v1/sri-lanka/marine",
                            "fallback": "https://api.marine-fuel.org/prices/lk"
                        },
                        "apiKey": "your_fuel_api_key",
                        "fallbackValue": 180.0  # LKR per liter
                    },
                    "weatherData": {
                        "enabled": True,
                        "updateIntervalMinutes": 30,
                        "apiEndpoints": {
                            "primary": "https://api.openweathermap.org/data/2.5/forecast",
                            "fallback": "https://api.weatherapi.com/v1/marine.json"
                        },
                        "apiKey": "your_weather_api_key",
                        "fallbackData": {
                            "windSpeed": 15,
                            "waveHeight": 2.0,
                            "temperature": 28,
                            "humidity": 80
                        }
                    },
                    "marketPrices": {
                        "enabled": True,
                        "updateIntervalMinutes": 120,
                        "apiEndpoints": {
                            "fishMarket": "https://api.fishmarket.lk/v1/current-prices",
                            "wholesale": "https://api.wholesale-fish.com/prices"
                        },
                        "fallbackPrices": {
                            "tuna": 800,
                            "sardines": 250,
                            "mackerel": 300,
                            "prawns": 1200,
                            "general": 400
                        }
                    },
                    "oceanConditions": {
                        "enabled": True,
                        "updateIntervalMinutes": 45,
                        "apiEndpoints": {
                            "marine": "https://api.marine-forecast.org/conditions",
                            "noaa": "https://api.noaa.gov/marine/sri-lanka"
                        },
                        "fallbackConditions": {
                            "seaState": 3,
                            "visibility": 10,
                            "currentSpeed": 1.5,
                            "waterTemperature": 28
                        }
                    },
                    "currencyRates": {
                        "enabled": True,
                        "updateIntervalMinutes": 180,
                        "apiEndpoints": {
                            "primary": "https://api.exchangerate.host/latest?base=USD&symbols=LKR",
                            "fallback": "https://api.fixer.io/latest?base=USD&symbols=LKR"
                        },
                        "fallbackRate": 320.0  # USD to LKR
                    }
                },
                "cacheSettings": {
                    "maxCacheAgeMinutes": 360,  # 6 hours
                    "enableCompression": true,
                    "maxCacheSizeMB": 10
                },
                "alertThresholds": {
                    "fuelPriceChangePercent": 5.0,     # Alert if fuel price changes >5%
                    "weatherDeteriorationIndex": 0.7,  # Alert if weather worsens significantly
                    "marketPriceChangePercent": 15.0   # Alert if fish prices change >15%
                }
            }
            with open(self.config_path, "w") as f:
                json.dump(default_config, f, indent=2)
    
    async def get_comprehensive_realtime_data(self, location: Dict[str, float], 
                                            species: str = "general") -> Dict:
        """Get comprehensive real-time data for trip planning"""
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        try:
            # Fetch all real-time data concurrently
            fuel_data, weather_data, market_data, ocean_data, currency_data = await asyncio.gather(
                self._fetch_fuel_prices(),
                self._fetch_weather_data(location),
                self._fetch_market_prices(species),
                self._fetch_ocean_conditions(location),
                self._fetch_currency_rates(),
                return_exceptions=True
            )
            
            # Process results and handle exceptions
            processed_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "location": location,
                "fuelPricing": self._process_fuel_data(fuel_data),
                "weatherConditions": self._process_weather_data(weather_data),
                "marketPrices": self._process_market_data(market_data, species),
                "oceanConditions": self._process_ocean_data(ocean_data),
                "currencyRates": self._process_currency_data(currency_data),
                "dataQuality": self._assess_data_quality(fuel_data, weather_data, market_data),
                "alerts": await self._generate_alerts(fuel_data, weather_data, market_data)
            }
            
            # Cache the data
            await self._cache_data(processed_data)
            
            return processed_data
            
        except Exception as e:
            print(f"Error fetching real-time data: {e}")
            return await self._get_fallback_data(location, species)
    
    async def _fetch_fuel_prices(self) -> Dict:
        """Fetch current marine fuel prices"""
        
        with open(self.config_path, "r") as f:
            config = json.load(f)
        
        fuel_config = config["dataSources"]["fuelPrices"]
        
        if not fuel_config["enabled"]:
            return {"source": "disabled", "pricePerLiterLKR": fuel_config["fallbackValue"]}
        
        try:
            # Try primary endpoint
            url = fuel_config["apiEndpoints"]["primary"]
            headers = {"X-API-Key": fuel_config["apiKey"]} if fuel_config["apiKey"] != "your_fuel_api_key" else {}
            
            async with self.session.get(url, headers=headers, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "source": "primary_api",
                        "pricePerLiterLKR": data.get("marine_diesel_price", fuel_config["fallbackValue"]),
                        "lastUpdated": data.get("timestamp", datetime.utcnow().isoformat()),
                        "currency": "LKR",
                        "priceChangePercent": data.get("daily_change_percent", 0)
                    }
                else:
                    raise aiohttp.ClientResponseError(None, None, status=response.status)
                    
        except Exception as e:
            print(f"Primary fuel API failed: {e}")
            
            try:
                # Try fallback endpoint
                url = fuel_config["apiEndpoints"]["fallback"]
                async with self.session.get(url, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "source": "fallback_api",
                            "pricePerLiterLKR": data.get("price", fuel_config["fallbackValue"]),
                            "lastUpdated": datetime.utcnow().isoformat(),
                            "currency": "LKR",
                            "priceChangePercent": 0
                        }
            except Exception as e2:
                print(f"Fallback fuel API failed: {e2}")
        
        # Use fallback value
        return {
            "source": "fallback_static",
            "pricePerLiterLKR": fuel_config["fallbackValue"],
            "lastUpdated": datetime.utcnow().isoformat(),
            "currency": "LKR",
            "priceChangePercent": 0
        }
    
    async def _fetch_weather_data(self, location: Dict[str, float]) -> Dict:
        """Fetch current and forecast weather data"""
        
        with open(self.config_path, "r") as f:
            config = json.load(f)
        
        weather_config = config["dataSources"]["weatherData"]
        
        if not weather_config["enabled"]:
            return {"source": "disabled", **weather_config["fallbackData"]}
        
        try:
            # OpenWeatherMap style API call
            lat, lon = location.get("lat", 7.8731), location.get("lon", 80.7718)  # Default to Colombo
            url = f"{weather_config['apiEndpoints']['primary']}?lat={lat}&lon={lon}&appid={weather_config['apiKey']}&units=metric"
            
            async with self.session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Extract current conditions
                    current = data.get("list", [{}])[0] if data.get("list") else {}
                    main = current.get("main", {})
                    wind = current.get("wind", {})
                    
                    return {
                        "source": "primary_api",
                        "currentConditions": {
                            "temperature": main.get("temp", 28),
                            "humidity": main.get("humidity", 80),
                            "pressure": main.get("pressure", 1013),
                            "windSpeed": wind.get("speed", 15),
                            "windDirection": wind.get("deg", 180),
                            "visibility": current.get("visibility", 10000) / 1000  # Convert to km
                        },
                        "forecast": self._extract_weather_forecast(data),
                        "marineConditions": {
                            "waveHeight": self._estimate_wave_height(wind.get("speed", 15)),
                            "seaState": self._calculate_sea_state(wind.get("speed", 15))
                        },
                        "lastUpdated": datetime.utcnow().isoformat()
                    }
                else:
                    raise aiohttp.ClientResponseError(None, None, status=response.status)
                    
        except Exception as e:
            print(f"Weather API failed: {e}")
            
            # Return fallback data
            fallback = weather_config["fallbackData"]
            return {
                "source": "fallback_static",
                "currentConditions": {
                    "temperature": fallback["temperature"],
                    "humidity": fallback["humidity"],
                    "pressure": 1013,
                    "windSpeed": fallback["windSpeed"],
                    "windDirection": 180,
                    "visibility": 10
                },
                "marineConditions": {
                    "waveHeight": fallback["waveHeight"],
                    "seaState": 3
                },
                "lastUpdated": datetime.utcnow().isoformat()
            }
    
    async def _fetch_market_prices(self, species: str) -> Dict:
        """Fetch current fish market prices"""
        
        with open(self.config_path, "r") as f:
            config = json.load(f)
        
        market_config = config["dataSources"]["marketPrices"]
        
        if not market_config["enabled"]:
            return {"source": "disabled", "prices": market_config["fallbackPrices"]}
        
        try:
            # Try fish market API
            url = market_config["apiEndpoints"]["fishMarket"]
            async with self.session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "source": "market_api",
                        "prices": data.get("prices", market_config["fallbackPrices"]),
                        "marketTrends": data.get("trends", {}),
                        "demandIndicators": data.get("demand", {}),
                        "lastUpdated": data.get("timestamp", datetime.utcnow().isoformat()),
                        "currency": "LKR"
                    }
                else:
                    raise aiohttp.ClientResponseError(None, None, status=response.status)
                    
        except Exception as e:
            print(f"Market API failed: {e}")
            
            # Return fallback prices with some randomness to simulate market fluctuations
            fallback_prices = market_config["fallbackPrices"].copy()
            
            # Add small random variation (±5%) to simulate market changes
            import random
            for species_name, price in fallback_prices.items():
                variation = random.uniform(-0.05, 0.05)
                fallback_prices[species_name] = round(price * (1 + variation), 2)
            
            return {
                "source": "fallback_static",
                "prices": fallback_prices,
                "marketTrends": {"trend": "stable"},
                "demandIndicators": {"demand_level": "medium"},
                "lastUpdated": datetime.utcnow().isoformat(),
                "currency": "LKR"
            }
    
    async def _fetch_ocean_conditions(self, location: Dict[str, float]) -> Dict:
        """Fetch ocean and marine conditions"""
        
        with open(self.config_path, "r") as f:
            config = json.load(f)
        
        ocean_config = config["dataSources"]["oceanConditions"]
        
        if not ocean_config["enabled"]:
            return {"source": "disabled", **ocean_config["fallbackConditions"]}
        
        try:
            # Simulate marine conditions API call
            lat, lon = location.get("lat", 7.8731), location.get("lon", 80.7718)
            url = f"{ocean_config['apiEndpoints']['marine']}?lat={lat}&lon={lon}"
            
            async with self.session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "source": "marine_api",
                        "seaState": data.get("sea_state", 3),
                        "waveHeight": data.get("significant_wave_height", 2.0),
                        "wavePeriod": data.get("wave_period", 8),
                        "swellDirection": data.get("swell_direction", 225),
                        "currentSpeed": data.get("current_speed", 1.5),
                        "currentDirection": data.get("current_direction", 180),
                        "waterTemperature": data.get("sea_surface_temperature", 28),
                        "visibility": data.get("visibility", 10),
                        "tideInfo": data.get("tide", {}),
                        "lastUpdated": datetime.utcnow().isoformat()
                    }
                else:
                    raise aiohttp.ClientResponseError(None, None, status=response.status)
                    
        except Exception as e:
            print(f"Ocean conditions API failed: {e}")
            
            # Return fallback conditions
            fallback = ocean_config["fallbackConditions"]
            return {
                "source": "fallback_static",
                "seaState": fallback["seaState"],
                "waveHeight": 2.0,
                "wavePeriod": 8,
                "swellDirection": 225,
                "currentSpeed": fallback["currentSpeed"],
                "currentDirection": 180,
                "waterTemperature": fallback["waterTemperature"],
                "visibility": fallback["visibility"],
                "lastUpdated": datetime.utcnow().isoformat()
            }
    
    async def _fetch_currency_rates(self) -> Dict:
        """Fetch current currency exchange rates"""
        
        with open(self.config_path, "r") as f:
            config = json.load(f)
        
        currency_config = config["dataSources"]["currencyRates"]
        
        if not currency_config["enabled"]:
            return {"source": "disabled", "usdToLkr": currency_config["fallbackRate"]}
        
        try:
            url = currency_config["apiEndpoints"]["primary"]
            async with self.session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    rates = data.get("rates", {})
                    return {
                        "source": "rates_api",
                        "usdToLkr": rates.get("LKR", currency_config["fallbackRate"]),
                        "baseCurrency": data.get("base", "USD"),
                        "lastUpdated": data.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
                        "rateChangePercent": 0  # Could be enhanced with historical comparison
                    }
                else:
                    raise aiohttp.ClientResponseError(None, None, status=response.status)
                    
        except Exception as e:
            print(f"Currency API failed: {e}")
            return {
                "source": "fallback_static",
                "usdToLkr": currency_config["fallbackRate"],
                "baseCurrency": "USD",
                "lastUpdated": datetime.utcnow().strftime("%Y-%m-%d"),
                "rateChangePercent": 0
            }
    
    def _extract_weather_forecast(self, weather_data: Dict) -> List[Dict]:
        """Extract weather forecast from API response"""
        
        forecast_list = weather_data.get("list", [])
        forecast = []
        
        for item in forecast_list[:8]:  # Next 24 hours (3-hour intervals)
            dt = datetime.fromtimestamp(item.get("dt", 0))
            main = item.get("main", {})
            wind = item.get("wind", {})
            
            forecast.append({
                "datetime": dt.isoformat(),
                "temperature": main.get("temp", 28),
                "windSpeed": wind.get("speed", 15),
                "windDirection": wind.get("deg", 180),
                "humidity": main.get("humidity", 80),
                "pressure": main.get("pressure", 1013)
            })
        
        return forecast
    
    def _estimate_wave_height(self, wind_speed: float) -> float:
        """Estimate wave height based on wind speed using simplified Beaufort scale"""
        
        if wind_speed < 5:
            return 0.1
        elif wind_speed < 10:
            return 0.5
        elif wind_speed < 15:
            return 1.0
        elif wind_speed < 20:
            return 1.8
        elif wind_speed < 25:
            return 2.5
        elif wind_speed < 30:
            return 3.5
        else:
            return min(wind_speed * 0.15, 6.0)  # Cap at 6m
    
    def _calculate_sea_state(self, wind_speed: float) -> int:
        """Calculate sea state (0-9 scale) based on wind speed"""
        
        if wind_speed < 1:
            return 0  # Calm
        elif wind_speed < 4:
            return 1  # Smooth
        elif wind_speed < 7:
            return 2  # Slight
        elif wind_speed < 11:
            return 3  # Moderate
        elif wind_speed < 16:
            return 4  # Rough
        elif wind_speed < 22:
            return 5  # Very rough
        elif wind_speed < 28:
            return 6  # High
        elif wind_speed < 34:
            return 7  # Very high
        else:
            return 8  # Phenomenal
    
    def _process_fuel_data(self, fuel_data: Union[Dict, Exception]) -> Dict:
        """Process and validate fuel price data"""
        
        if isinstance(fuel_data, Exception):
            return {
                "pricePerLiter": 180.0,
                "currency": "LKR",
                "source": "error_fallback",
                "reliability": "low",
                "lastUpdated": datetime.utcnow().isoformat()
            }
        
        return {
            "pricePerLiter": fuel_data.get("pricePerLiterLKR", 180.0),
            "currency": fuel_data.get("currency", "LKR"),
            "source": fuel_data.get("source", "unknown"),
            "reliability": "high" if "api" in fuel_data.get("source", "") else "medium",
            "priceChangePercent": fuel_data.get("priceChangePercent", 0),
            "lastUpdated": fuel_data.get("lastUpdated", datetime.utcnow().isoformat())
        }
    
    def _process_weather_data(self, weather_data: Union[Dict, Exception]) -> Dict:
        """Process and validate weather data"""
        
        if isinstance(weather_data, Exception):
            return {
                "temperature": 28,
                "windSpeed": 15,
                "waveHeight": 2.0,
                "visibility": 10,
                "source": "error_fallback",
                "reliability": "low"
            }
        
        current = weather_data.get("currentConditions", {})
        marine = weather_data.get("marineConditions", {})
        
        return {
            "temperature": current.get("temperature", 28),
            "humidity": current.get("humidity", 80),
            "pressure": current.get("pressure", 1013),
            "windSpeed": current.get("windSpeed", 15),
            "windDirection": current.get("windDirection", 180),
            "visibility": current.get("visibility", 10),
            "waveHeight": marine.get("waveHeight", 2.0),
            "seaState": marine.get("seaState", 3),
            "forecast": weather_data.get("forecast", []),
            "source": weather_data.get("source", "unknown"),
            "reliability": "high" if "api" in weather_data.get("source", "") else "medium",
            "lastUpdated": weather_data.get("lastUpdated", datetime.utcnow().isoformat())
        }
    
    def _process_market_data(self, market_data: Union[Dict, Exception], species: str) -> Dict:
        """Process and validate market price data"""
        
        if isinstance(market_data, Exception):
            fallback_prices = {"tuna": 800, "sardines": 250, "general": 400}
            return {
                "currentPrice": fallback_prices.get(species, 400),
                "pricePerKg": fallback_prices.get(species, 400),
                "currency": "LKR",
                "source": "error_fallback",
                "reliability": "low"
            }
        
        prices = market_data.get("prices", {})
        current_price = prices.get(species, prices.get("general", 400))
        
        return {
            "currentPrice": current_price,
            "pricePerKg": current_price,
            "currency": market_data.get("currency", "LKR"),
            "allPrices": prices,
            "marketTrends": market_data.get("marketTrends", {}),
            "demandIndicators": market_data.get("demandIndicators", {}),
            "source": market_data.get("source", "unknown"),
            "reliability": "high" if "api" in market_data.get("source", "") else "medium",
            "lastUpdated": market_data.get("lastUpdated", datetime.utcnow().isoformat())
        }
    
    def _process_ocean_data(self, ocean_data: Union[Dict, Exception]) -> Dict:
        """Process and validate ocean conditions data"""
        
        if isinstance(ocean_data, Exception):
            return {
                "seaState": 3,
                "currentSpeed": 1.5,
                "waterTemperature": 28,
                "visibility": 10,
                "source": "error_fallback",
                "reliability": "low"
            }
        
        return {
            "seaState": ocean_data.get("seaState", 3),
            "waveHeight": ocean_data.get("waveHeight", 2.0),
            "wavePeriod": ocean_data.get("wavePeriod", 8),
            "currentSpeed": ocean_data.get("currentSpeed", 1.5),
            "currentDirection": ocean_data.get("currentDirection", 180),
            "waterTemperature": ocean_data.get("waterTemperature", 28),
            "visibility": ocean_data.get("visibility", 10),
            "tideInfo": ocean_data.get("tideInfo", {}),
            "source": ocean_data.get("source", "unknown"),
            "reliability": "high" if "api" in ocean_data.get("source", "") else "medium",
            "lastUpdated": ocean_data.get("lastUpdated", datetime.utcnow().isoformat())
        }
    
    def _process_currency_data(self, currency_data: Union[Dict, Exception]) -> Dict:
        """Process and validate currency rate data"""
        
        if isinstance(currency_data, Exception):
            return {
                "usdToLkr": 320.0,
                "source": "error_fallback",
                "reliability": "low"
            }
        
        return {
            "usdToLkr": currency_data.get("usdToLkr", 320.0),
            "baseCurrency": currency_data.get("baseCurrency", "USD"),
            "rateChangePercent": currency_data.get("rateChangePercent", 0),
            "source": currency_data.get("source", "unknown"),
            "reliability": "high" if "api" in currency_data.get("source", "") else "medium",
            "lastUpdated": currency_data.get("lastUpdated", datetime.utcnow().strftime("%Y-%m-%d"))
        }
    
    def _assess_data_quality(self, fuel_data, weather_data, market_data) -> Dict:
        """Assess overall data quality and reliability"""
        
        sources = [fuel_data, weather_data, market_data]
        api_sources = sum(1 for data in sources if not isinstance(data, Exception) and "api" in data.get("source", ""))
        total_sources = len(sources)
        
        reliability_score = api_sources / total_sources
        
        if reliability_score >= 0.8:
            quality_level = "high"
        elif reliability_score >= 0.5:
            quality_level = "medium"
        else:
            quality_level = "low"
        
        return {
            "overallQuality": quality_level,
            "reliabilityScore": round(reliability_score, 2),
            "apiSourcesAvailable": api_sources,
            "totalSources": total_sources,
            "recommendedConfidence": "high" if quality_level == "high" else "medium" if quality_level == "medium" else "low"
        }
    
    async def _generate_alerts(self, fuel_data, weather_data, market_data) -> List[Dict]:
        """Generate alerts based on significant changes or conditions"""
        
        alerts = []
        
        # Fuel price alerts
        if not isinstance(fuel_data, Exception):
            price_change = fuel_data.get("priceChangePercent", 0)
            if abs(price_change) > 5:
                alerts.append({
                    "type": "fuel_price_change",
                    "severity": "high" if abs(price_change) > 10 else "medium",
                    "message": f"Fuel price changed by {price_change:+.1f}%",
                    "recommendation": "Consider adjusting trip economics based on fuel cost change"
                })
        
        # Weather deterioration alerts
        if not isinstance(weather_data, Exception):
            wind_speed = weather_data.get("currentConditions", {}).get("windSpeed", 15)
            if wind_speed > 25:
                alerts.append({
                    "type": "weather_warning",
                    "severity": "high" if wind_speed > 35 else "medium",
                    "message": f"High wind speed detected: {wind_speed} knots",
                    "recommendation": "Consider postponing trip or choosing sheltered areas"
                })
        
        # Market opportunity alerts
        if not isinstance(market_data, Exception):
            trends = market_data.get("marketTrends", {})
            if trends.get("trend") == "rising":
                alerts.append({
                    "type": "market_opportunity",
                    "severity": "info",
                    "message": "Fish prices showing upward trend",
                    "recommendation": "Good timing for fishing trip to maximize revenue"
                })
        
        return alerts
    
    async def _cache_data(self, data: Dict):
        """Cache real-time data for offline access"""
        
        try:
            cache_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "data": data
            }
            
            with open(self.data_cache_path, "w") as f:
                json.dump(cache_data, f, indent=2)
                
        except Exception as e:
            print(f"Failed to cache data: {e}")
    
    async def _get_fallback_data(self, location: Dict[str, float], species: str) -> Dict:
        """Get fallback data when all APIs fail"""
        
        # Try to load from cache first
        try:
            if os.path.exists(self.data_cache_path):
                with open(self.data_cache_path, "r") as f:
                    cache_data = json.load(f)
                
                # Check if cache is not too old (6 hours)
                cache_time = datetime.fromisoformat(cache_data["timestamp"])
                if (datetime.utcnow() - cache_time).total_seconds() < 21600:  # 6 hours
                    cache_data["data"]["source"] = "cached_data"
                    return cache_data["data"]
        except Exception as e:
            print(f"Failed to load cache: {e}")
        
        # Use static fallback data
        with open(self.config_path, "r") as f:
            config = json.load(f)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "location": location,
            "fuelPricing": {
                "pricePerLiter": config["dataSources"]["fuelPrices"]["fallbackValue"],
                "currency": "LKR",
                "source": "static_fallback",
                "reliability": "low"
            },
            "weatherConditions": {
                **config["dataSources"]["weatherData"]["fallbackData"],
                "source": "static_fallback",
                "reliability": "low"
            },
            "marketPrices": {
                "currentPrice": config["dataSources"]["marketPrices"]["fallbackPrices"].get(species, 400),
                "currency": "LKR",
                "allPrices": config["dataSources"]["marketPrices"]["fallbackPrices"],
                "source": "static_fallback",
                "reliability": "low"
            },
            "oceanConditions": {
                **config["dataSources"]["oceanConditions"]["fallbackConditions"],
                "source": "static_fallback",
                "reliability": "low"
            },
            "currencyRates": {
                "usdToLkr": config["dataSources"]["currencyRates"]["fallbackRate"],
                "source": "static_fallback",
                "reliability": "low"
            },
            "dataQuality": {
                "overallQuality": "low",
                "reliabilityScore": 0.0,
                "recommendedConfidence": "low"
            },
            "alerts": [
                {
                    "type": "data_unavailable",
                    "severity": "medium",
                    "message": "Real-time data unavailable, using fallback values",
                    "recommendation": "Proceed with enhanced caution due to outdated information"
                }
            ]
        }
    
    async def get_historical_trends(self, days: int = 7) -> Dict:
        """Get historical trends for market analysis"""
        
        # This would typically integrate with historical data APIs
        # For now, provide simulated trend data
        
        return {
            "period": f"last_{days}_days",
            "fuelPriceTrend": {
                "averagePrice": 175.0,
                "priceChange": "+2.5%",
                "volatility": "medium",
                "trend": "slightly_increasing"
            },
            "weatherPattern": {
                "averageWindSpeed": 18.0,
                "averageWaveHeight": 2.2,
                "stormDays": 1,
                "goodFishingDays": 5
            },
            "marketPerformance": {
                "priceVolatility": "medium",
                "demandTrend": "stable",
                "seasonalFactor": 1.05,
                "peakPriceDays": ["Monday", "Thursday"]
            }
        }
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()