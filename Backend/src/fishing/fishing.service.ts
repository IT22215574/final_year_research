import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { join } from 'path';
import { PredictCostDto } from './dto';

@Injectable()
export class FishingService {
  private readonly logger = new Logger(FishingService.name);
  private readonly pythonScriptPath: string;

  constructor() {
    // Path to the NEW Python prediction script (uses production_predictor)
    this.pythonScriptPath = join(
      process.cwd(),
      '..',
      'model_files',
      'predict_trip_cost.py',
    );
  }

  async predictTripCost(dto: PredictCostDto): Promise<{
    base_cost: number;
    fuel_cost_estimate: number;
    ice_cost_estimate: number;
    external_costs: Array<{
      type: string;
      amount: number;
      description?: string;
    }>;
    external_costs_total: number;
    total_trip_cost: number;
    currency: string;
    breakdown: {
      base_cost_percentage: number;
      external_costs_percentage: number;
    };
  }> {
    return new Promise((resolve, reject) => {
      const inputData = JSON.stringify({
        boat_type: dto.boat_type,
        engine_hp: dto.engine_hp,
        trip_days: dto.trip_days,
        distance_km: dto.distance_km,
        wind_kph: dto.wind_kph,
        wave_m: dto.wave_m,
        month: dto.month,
        port_name: dto.port_name,
        diesel_price_LKR: dto.diesel_price_LKR,
        petrol_price_LKR: dto.petrol_price_LKR,
        kerosene_price_LKR: dto.kerosene_price_LKR,
      });

      this.logger.log(`Predicting BASE cost (fuel+ice) for: ${inputData}`);

      // Spawn Python process
      const pythonProcess = spawn('python', [this.pythonScriptPath, inputData]);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        this.logger.error(`Python stderr: ${data}`);
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`Python process exited with code ${code}`);
          this.logger.error(`Error output: ${errorData}`);
          reject(
            new Error(`Prediction failed: ${errorData || 'Unknown error'}`),
          );
          return;
        }

        try {
          const result = JSON.parse(outputData);
          this.logger.log(`Python output: ${JSON.stringify(result)}`);

          let baseCost: number;
          let fuelEstimate: number;
          let iceEstimate: number;

          // Handle both new format (base_cost) and old format (predicted_cost)
          if (result.base_cost !== undefined) {
            // New format - model trained on base_cost_LKR
            baseCost = parseFloat(result.base_cost);
            fuelEstimate = parseFloat(result.fuel_cost_estimate);
            iceEstimate = parseFloat(result.ice_cost_estimate);
          } else if (result.predicted_cost !== undefined) {
            // Old format (backward compatibility) - model still trained on total_cost_LKR
            // Treat predicted_cost as base_cost for now
            baseCost = parseFloat(result.predicted_cost);
            fuelEstimate = baseCost * 0.962; // Approximate 96.2% is fuel
            iceEstimate = baseCost * 0.038; // Approximate 3.8% is ice
            this.logger.warn(
              '⚠️ Using OLD model format (predicted_cost). Please retrain model with base_cost_LKR target.',
            );
          } else {
            throw new Error('Invalid response format from Python script');
          }

          // Process external costs
          const externalCosts = dto.external_costs || [];
          const externalCostsTotal = externalCosts.reduce(
            (sum, item) => sum + item.amount,
            0,
          );
          const totalTripCost = baseCost + externalCostsTotal;

          this.logger.log(
            `Prediction successful - Base: ${baseCost}, External: ${externalCostsTotal}, Total: ${totalTripCost}`,
          );

          resolve({
            base_cost: baseCost,
            fuel_cost_estimate: fuelEstimate,
            ice_cost_estimate: iceEstimate,
            external_costs: externalCosts,
            external_costs_total: externalCostsTotal,
            total_trip_cost: totalTripCost,
            currency: 'LKR',
            breakdown: {
              base_cost_percentage:
                totalTripCost > 0 ? (baseCost / totalTripCost) * 100 : 100,
              external_costs_percentage:
                totalTripCost > 0
                  ? (externalCostsTotal / totalTripCost) * 100
                  : 0,
            },
          });
        } catch (error) {
          this.logger.error(`Failed to parse Python output: ${outputData}`);
          reject(new Error('Failed to parse prediction result'));
        }
      });

      pythonProcess.on('error', (error) => {
        this.logger.error(`Failed to start Python process: ${error.message}`);
        reject(new Error('Failed to start prediction service'));
      });
    });
  }
}
