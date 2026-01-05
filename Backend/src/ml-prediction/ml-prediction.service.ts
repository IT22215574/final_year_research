/**
 * ML Prediction Service for NestJS Backend
 * Integrates with Python ML Service for Trip Cost Prediction
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

// DTO Interfaces
export interface TripPredictionInput {
  boat_type: string;
  engine_hp: number;
  fuel_type: string;
  crew_size: number;
  ice_capacity_kg: number;
  water_capacity_L: number;
  avg_speed_kmh: number;
  trip_days: number;
  trip_month: number;
  distance_km: number;
  wind_kph: number;
  wave_height_m: number;
  weather_factor: number;
  region: string;
  is_multi_day: boolean;
  has_engine: boolean;
  is_deep_sea: boolean;
}

export interface CostPredictions {
  fuel_cost_lkr: number;
  ice_cost_lkr: number;
  water_cost_lkr: number;
  total_base_cost_lkr: number;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence_level: number;
}

export interface PredictionResult {
  predictions: CostPredictions;
  confidence_intervals?: Record<string, ConfidenceInterval>;
  input_summary: {
    boat_type: string;
    trip_days: number;
    distance_km: number;
    engine_hp: number;
  };
  model_info: {
    model_name: string;
    model_r2: number;
    model_smape: number;
    version: string;
  };
}

@Injectable()
export class MlPredictionService {
  private readonly logger = new Logger(MlPredictionService.name);
  private readonly mlServiceUrl: string;
  private readonly httpClient: AxiosInstance;

  constructor() {
    // ML Service URL (Flask service running on port 5000)
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
    
    // Create axios instance with timeout
    this.httpClient = axios.create({
      baseURL: this.mlServiceUrl,
      timeout: 10000, // 10 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`ML Service URL: ${this.mlServiceUrl}`);
  }

  /**
   * Check if ML service is healthy
   */
  async checkHealth(): Promise<{ status: string; service: string; version: string }> {
    try {
      const response = await this.httpClient.get('/health');
      return response.data;
    } catch (error) {
      this.logger.error('ML Service health check failed:', error.message);
      throw new HttpException(
        'ML Service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get ML model information
   */
  async getModelInfo(): Promise<any> {
    try {
      const response = await this.httpClient.get('/model/info');
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error('Failed to get model info');
      }
    } catch (error) {
      this.logger.error('Failed to get model info:', error.message);
      throw new HttpException(
        'Failed to retrieve model information',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Predict trip costs for a single trip
   */
  async predictTripCost(
    tripData: TripPredictionInput,
  ): Promise<PredictionResult> {
    try {
      this.logger.log(`Predicting cost for trip: ${JSON.stringify(tripData.boat_type)}`);
      
      const response = await this.httpClient.post('/predict', tripData);
      
      if (response.data.status === 'success') {
        this.logger.log('Prediction successful');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Prediction failed');
      }
    } catch (error) {
      this.logger.error('Prediction failed:', error.message);
      
      if (error.response) {
        // ML service returned an error
        throw new HttpException(
          error.response.data.error || 'Prediction failed',
          error.response.status,
        );
      } else if (error.request) {
        // No response from ML service
        throw new HttpException(
          'ML Service is not responding',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else {
        // Other error
        throw new HttpException(
          'Failed to predict trip cost',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  /**
   * Predict trip costs for multiple trips (batch)
   */
  async predictBatchTripCosts(
    tripsData: TripPredictionInput[],
  ): Promise<PredictionResult[]> {
    try {
      this.logger.log(`Predicting costs for ${tripsData.length} trips`);
      
      const response = await this.httpClient.post('/predict/batch', {
        trips: tripsData,
      });
      
      if (response.data.status === 'success') {
        this.logger.log(`Batch prediction successful: ${response.data.count} predictions`);
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Batch prediction failed');
      }
    } catch (error) {
      this.logger.error('Batch prediction failed:', error.message);
      
      if (error.response) {
        throw new HttpException(
          error.response.data.error || 'Batch prediction failed',
          error.response.status,
        );
      } else if (error.request) {
        throw new HttpException(
          'ML Service is not responding',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else {
        throw new HttpException(
          'Failed to predict batch trip costs',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  /**
   * Create trip prediction input from user data
   * Helper method to map user/trip data to ML input format
   */
  createPredictionInput(tripDetails: any): TripPredictionInput {
    return {
      boat_type: tripDetails.boatType || 'IMUL',
      engine_hp: tripDetails.engineHp || 75,
      fuel_type: tripDetails.fuelType || 'Diesel',
      crew_size: tripDetails.crewSize || 3,
      ice_capacity_kg: tripDetails.iceCapacityKg || 200,
      water_capacity_L: tripDetails.waterCapacityL || 100,
      avg_speed_kmh: tripDetails.avgSpeedKmh || 12.0,
      trip_days: tripDetails.tripDays || 1,
      trip_month: tripDetails.tripMonth || new Date().getMonth() + 1,
      distance_km: tripDetails.distanceKm || 50,
      wind_kph: tripDetails.windKph || 15,
      wave_height_m: tripDetails.waveHeightM || 1.0,
      weather_factor: tripDetails.weatherFactor || 1.0,
      region: tripDetails.region || 'West',
      is_multi_day: tripDetails.isMultiDay || false,
      has_engine: tripDetails.hasEngine !== false,
      is_deep_sea: tripDetails.isDeepSea || false,
    };
  }
}
