import { Controller, Post, Body, Logger } from '@nestjs/common';
import { FishingService } from './fishing.service';
import { PredictCostDto } from './dto';

@Controller('fishing')
export class FishingController {
  private readonly logger = new Logger(FishingController.name);

  constructor(private readonly fishingService: FishingService) {}

  @Post('predict-cost')
  async predictCost(@Body() dto: PredictCostDto) {
    this.logger.log('Received prediction request');
    try {
      const result = await this.fishingService.predictTripCost(dto);
      return result;
    } catch (error) {
      this.logger.error('Prediction failed:', error);
      throw error;
    }
  }
}
