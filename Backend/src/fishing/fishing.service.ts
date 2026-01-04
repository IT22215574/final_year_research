import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { join } from 'path';
import { PredictCostDto } from './dto';

@Injectable()
export class FishingService {
  private readonly logger = new Logger(FishingService.name);
  private readonly pythonScriptPath: string;

  constructor() {
    // Path to the Python prediction script
    this.pythonScriptPath = join(
      process.cwd(),
      '..',
      'model_files',
      'predict_cost.py',
    );
  }

  async predictTripCost(
    dto: PredictCostDto,
  ): Promise<{ predicted_cost: number; currency: string }> {
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

      this.logger.log(`Predicting cost for: ${inputData}`);

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
          this.logger.log(`Prediction successful: ${result.predicted_cost}`);
          resolve({
            predicted_cost: parseFloat(result.predicted_cost),
            currency: 'LKR',
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
