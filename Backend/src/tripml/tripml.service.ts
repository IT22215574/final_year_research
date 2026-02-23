import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MlService {
  // URL of your Python ML API (create this later)
  private readonly ML_API_URL = process.env.ML_API_URL || 'http://localhost:5000';

  // Predict fuel consumption
  async predictFuelConsumption(data: {
    distanceKm: number;
    engineHorsePower: number;
    windSpeed: number;
    waveHeight: number;
    tripDurationHours: number;
  }): Promise<{ predictedFuelLiters: number }> {
    try {
      const response = await axios.post(`${this.ML_API_URL}/predict/fuel`, data);
      return response.data;
    } catch (error) {
      throw new HttpException(
        'ML prediction service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // Predict total trip cost
  async predictTripCost(data: {
    distanceKm: number;
    engineHorsePower: number;
    windSpeed: number;
    waveHeight: number;
    tripDurationHours: number;
    fuelPricePerLiter: number;
  }): Promise<{ predictedCost: number }> {
    try {
      const response = await axios.post(`${this.ML_API_URL}/predict/cost`, data);
      return response.data;
    } catch (error) {
      throw new HttpException(
        'ML prediction service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // Get cost optimization recommendations
  async getOptimizationRecommendations(tripData: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.ML_API_URL}/optimize`,
        tripData,
      );
      return response.data;
    } catch (error) {
      // If ML service is down, return basic recommendation
      return {
        message: 'ML service unavailable. Using basic recommendations.',
        recommendations: [
          'Reduce trip distance when possible',
          'Monitor weather conditions before departure',
          'Regular engine maintenance reduces fuel consumption',
        ],
      };
    }
  }
}