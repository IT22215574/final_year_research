/**
 * ML Prediction Controller
 * REST API endpoints for trip cost prediction
 */

import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { MlPredictionService, TripPredictionInput } from './ml-prediction.service';

@Controller('api/ml-prediction')
export class MlPredictionController {
  constructor(private readonly mlPredictionService: MlPredictionService) {}

  /**
   * Health check endpoint
   * GET /api/ml-prediction/health
   */
  @Get('health')
  async checkHealth() {
    const health = await this.mlPredictionService.checkHealth();
    return {
      status: 'success',
      data: health,
    };
  }

  /**
   * Get model information
   * GET /api/ml-prediction/model-info
   */
  @Get('model-info')
  async getModelInfo() {
    const info = await this.mlPredictionService.getModelInfo();
    return {
      status: 'success',
      data: info,
    };
  }

  /**
   * Predict trip cost for a single trip
   * POST /api/ml-prediction/predict
   * 
   * Body example:
   * {
   *   "boat_type": "IMUL",
   *   "engine_hp": 75,
   *   "fuel_type": "Diesel",
   *   "crew_size": 3,
   *   "ice_capacity_kg": 200,
   *   "water_capacity_L": 100,
   *   "avg_speed_kmh": 12.0,
   *   "trip_days": 1,
   *   "trip_month": 3,
   *   "distance_km": 50,
   *   "wind_kph": 15,
   *   "wave_height_m": 1.0,
   *   "weather_factor": 1.0,
   *   "region": "West",
   *   "is_multi_day": false,
   *   "has_engine": true,
   *   "is_deep_sea": false
   * }
   */
  @Post('predict')
  @HttpCode(HttpStatus.OK)
  async predictTripCost(@Body() tripData: TripPredictionInput) {
    const prediction = await this.mlPredictionService.predictTripCost(tripData);
    return {
      status: 'success',
      data: prediction,
    };
  }

  /**
   * Predict trip costs for multiple trips (batch)
   * POST /api/ml-prediction/predict/batch
   * 
   * Body example:
   * {
   *   "trips": [
   *     { "boat_type": "IMUL", "trip_days": 1, ... },
   *     { "boat_type": "MDBT", "trip_days": 3, ... }
   *   ]
   * }
   */
  @Post('predict/batch')
  @HttpCode(HttpStatus.OK)
  async predictBatchTripCosts(@Body() data: { trips: TripPredictionInput[] }) {
    const predictions = await this.mlPredictionService.predictBatchTripCosts(data.trips);
    return {
      status: 'success',
      count: predictions.length,
      data: predictions,
    };
  }

  /**
   * Helper endpoint to predict from simplified input
   * POST /api/ml-prediction/predict-simple
   * 
   * Body example:
   * {
   *   "boatType": "IMUL",
   *   "tripDays": 1,
   *   "distanceKm": 50,
   *   "engineHp": 75,
   *   "crewSize": 3
   * }
   */
  @Post('predict-simple')
  @HttpCode(HttpStatus.OK)
  async predictSimple(@Body() tripDetails: any) {
    // Convert simplified input to full prediction input
    const predictionInput = this.mlPredictionService.createPredictionInput(tripDetails);
    
    // Make prediction
    const prediction = await this.mlPredictionService.predictTripCost(predictionInput);
    
    return {
      status: 'success',
      data: prediction,
    };
  }
}
