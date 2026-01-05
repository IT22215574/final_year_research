/**
 * ML Prediction Module
 * Module for trip cost prediction using ML model
 */

import { Module } from '@nestjs/common';
import { MlPredictionController } from './ml-prediction.controller';
import { MlPredictionService } from './ml-prediction.service';

@Module({
  controllers: [MlPredictionController],
  providers: [MlPredictionService],
  exports: [MlPredictionService], // Export service so other modules can use it
})
export class MlPredictionModule {}
