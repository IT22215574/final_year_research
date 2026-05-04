import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MlService } from './tripml.service';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';

@Controller('ml')
@UseGuards(AuthTokenGuard)
export class MlController {
  constructor(private readonly mlService: MlService) {}

  @Post('predict-fuel')
  async predictFuel(
    @Body()
    data: {
      distanceKm: number;
      engineHorsePower: number;
      windSpeed: number;
      waveHeight: number;
      tripDurationHours: number;
    },
  ) {
    return await this.mlService.predictFuelConsumption(data);
  }

  @Post('predict-cost')
  async predictCost(
    @Body()
    data: {
      distanceKm: number;
      engineHorsePower: number;
      windSpeed: number;
      waveHeight: number;
      tripDurationHours: number;
      fuelPricePerLiter: number;
    },
  ) {
    return await this.mlService.predictTripCost(data);
  }

  @Post('optimize')
  async optimize(@Body() tripData: any) {
    return await this.mlService.getOptimizationRecommendations(tripData);
  }
}
