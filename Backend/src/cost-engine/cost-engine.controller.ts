import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { CostEngineService } from './cost-engine.service';
import { PredictAndSaveDto } from './dto/predict-and-save.dto';
import { PredictCostDto } from './dto/predict-cost.dto';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { OptimizeTripDto } from './dto/optimize-trip.dto';

@Controller('cost-engine')
export class CostEngineController {
  constructor(private readonly costService: CostEngineService) {}

  @Post('predict')
  predict(@Body() dto: PredictCostDto) {
    return this.costService.predictTrip(dto);
  }

  @Post('optimize')
  optimize(@Body() dto: OptimizeTripDto) {
    return this.costService.optimizeTrip(dto);
  }

  @UseGuards(AuthTokenGuard)
  @Post('predict-and-save')
  predictAndSave(@Body() dto: PredictAndSaveDto, @Req() req: Request) {
    return this.costService.predictAndSave(dto, req);
  }
}
