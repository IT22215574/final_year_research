// ==========================================================
// SMART FISHER LANKA - NESTJS SERVICE INTEGRATION
// TypeScript Service for ML Model Integration
// ==========================================================

import { Injectable, BadRequestException } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';

// DTO for prediction request
export class PredictBaseCostDto {
  boat_type: string;
  fuel_type: string;
  trip_days: number;
  current_location?: { lat: number; lon: number };
  target_location?: { lat: number; lon: number };
  distance_km?: number;
  weather_conditions?: { wind_kph: number; wave_height_m: number };
  month?: number;
  engine_hp?: number;
  crew_size?: number;
  ice_capacity_kg?: number;
  water_capacity_L?: number;
  avg_speed_kmh?: number;
  region?: string;
}

// Response interface
export interface PredictionResponse {
  success: boolean;
  distance_km?: number;
  predictions?: {
    fuel_cost_lkr: number;
    ice_cost_lkr: number;
    water_cost_lkr: number;
    total_base_cost_lkr: number;
  };
  breakdown?: {
    fuel: { cost: number; type: string; price_per_liter: number };
    ice: { cost: number; price_per_kg: number };
    water: { cost: number; price_per_liter: number };
  };
  confidence?: {
    total_cost: number;
    lower_bound: number;
    upper_bound: number;
    margin_percent: number;
    range: string;
  };
  metadata?: any;
  error?: string;
}

@Injectable()
export class TripCostMLService {
  private pythonScriptPath: string;
  private modelPath: string;

  constructor() {
    // Configure paths - adjust these based on your deployment
    this.pythonScriptPath = path.join(__dirname, '..', '..', 'ml', 'nestjs_integration.py');
    this.modelPath = path.join(__dirname, '..', '..', 'ml', 'production_model');
  }

  /**
   * Predict base cost for a fishing trip using ML model
   */
  async predictBaseCost(dto: PredictBaseCostDto): Promise<PredictionResponse> {
    return new Promise((resolve, reject) => {
      // Prepare input data
      const inputData = JSON.stringify({
        action: 'predict',
        data: dto
      });

      // Spawn Python process
      const pythonProcess = spawn('python', [this.pythonScriptPath]);

      let outputData = '';
      let errorData = '';

      // Collect output
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      // Collect errors
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      // Handle completion
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new BadRequestException(`Python process failed: ${errorData}`));
          return;
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (error) {
          reject(new BadRequestException(`Failed to parse ML output: ${error.message}`));
        }
      });

      // Send input data
      pythonProcess.stdin.write(inputData);
      pythonProcess.stdin.end();

      // Handle errors
      pythonProcess.on('error', (error) => {
        reject(new BadRequestException(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  /**
   * Get model information
   */
  async getModelInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      const inputData = JSON.stringify({
        action: 'info'
      });

      const pythonProcess = spawn('python', [this.pythonScriptPath]);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new BadRequestException(`Python process failed: ${errorData}`));
          return;
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (error) {
          reject(new BadRequestException(`Failed to parse ML output: ${error.message}`));
        }
      });

      pythonProcess.stdin.write(inputData);
      pythonProcess.stdin.end();

      pythonProcess.on('error', (error) => {
        reject(new BadRequestException(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  /**
   * Update price configuration
   */
  async updatePrices(newPrices: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const inputData = JSON.stringify({
        action: 'update_prices',
        data: newPrices
      });

      const pythonProcess = spawn('python', [this.pythonScriptPath]);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new BadRequestException(`Python process failed: ${errorData}`));
          return;
        }

        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (error) {
          reject(new BadRequestException(`Failed to parse ML output: ${error.message}`));
        }
      });

      pythonProcess.stdin.write(inputData);
      pythonProcess.stdin.end();

      pythonProcess.on('error', (error) => {
        reject(new BadRequestException(`Failed to start Python process: ${error.message}`));
      });
    });
  }
}

// ==========================================================
// CONTROLLER EXAMPLE
// ==========================================================

import { Controller, Post, Get, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Trip Cost Prediction')
@Controller('trips')
export class TripCostController {
  constructor(private readonly mlService: TripCostMLService) {}

  @Post('predict-base-cost')
  @ApiOperation({ summary: 'Predict base cost for a fishing trip' })
  @ApiResponse({ status: 200, description: 'Prediction successful' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async predictBaseCost(@Body() dto: PredictBaseCostDto): Promise<PredictionResponse> {
    return this.mlService.predictBaseCost(dto);
  }

  @Get('model-info')
  @ApiOperation({ summary: 'Get ML model information' })
  async getModelInfo() {
    return this.mlService.getModelInfo();
  }

  @Patch('prices')
  @ApiOperation({ summary: 'Update price configuration' })
  async updatePrices(@Body() newPrices: any) {
    return this.mlService.updatePrices(newPrices);
  }
}

// ==========================================================
// MODULE EXAMPLE
// ==========================================================

import { Module } from '@nestjs/common';

@Module({
  controllers: [TripCostController],
  providers: [TripCostMLService],
  exports: [TripCostMLService],
})
export class TripCostMLModule {}

// ==========================================================
// USAGE IN OTHER SERVICES
// ==========================================================

/*
// In your fishing service:
import { Injectable } from '@nestjs/common';
import { TripCostMLService } from './trip-cost-ml.service';

@Injectable()
export class FishingService {
  constructor(private mlService: TripCostMLService) {}

  async planTrip(tripData: any) {
    // Get ML prediction for base costs
    const mlPrediction = await this.mlService.predictBaseCost({
      boat_type: tripData.boat_type,
      fuel_type: tripData.fuel_type,
      trip_days: tripData.trip_days,
      current_location: tripData.current_location,
      target_location: tripData.target_location,
      month: new Date().getMonth() + 1,
      engine_hp: tripData.engine_hp,
      crew_size: tripData.crew_size,
      ice_capacity_kg: tripData.ice_capacity_kg,
      water_capacity_L: tripData.water_capacity_L,
    });

    // Add additional costs (crew, gear, etc.)
    const crewCost = this.calculateCrewCost(tripData);
    const gearCost = this.calculateGearCost(tripData);

    // Total trip cost
    const totalCost = 
      mlPrediction.predictions.total_base_cost_lkr +
      crewCost +
      gearCost;

    return {
      base_cost: mlPrediction.predictions.total_base_cost_lkr,
      breakdown: {
        fuel: mlPrediction.predictions.fuel_cost_lkr,
        ice: mlPrediction.predictions.ice_cost_lkr,
        water: mlPrediction.predictions.water_cost_lkr,
        crew: crewCost,
        gear: gearCost,
      },
      total_cost: totalCost,
      confidence: mlPrediction.confidence,
      distance: mlPrediction.distance_km,
    };
  }

  private calculateCrewCost(tripData: any): number {
    // Your crew cost logic
    return tripData.crew_size * tripData.trip_days * 2000; // Example
  }

  private calculateGearCost(tripData: any): number {
    // Your gear cost logic
    return 5000; // Example
  }
}
*/
