import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';

import { CostEngineService } from './cost-engine.service';
import { PredictAndSaveDto } from './dto/predict-and-save.dto';
import { PredictCostDto } from './dto/predict-cost.dto';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { OptimizeTripDto } from './dto/optimize-trip.dto';

@Controller('cost-engine')
export class CostEngineController {
  constructor(private readonly costService: CostEngineService) {}

  private getUserId(req: Request): string {
    const user = (req as any)?.user ?? {};
    const userId = user?.userId || user?.id || user?.sub || user?._id;

    if (!userId) {
      throw new BadRequestException('User not found in token');
    }

    return String(userId);
  }

  @UseGuards(AuthTokenGuard)
  @Post('predict')
  predict(@Body() dto: PredictCostDto, @Req() req: Request) {
    const userId = this.getUserId(req);
    return this.costService.predictTrip(dto, userId);
  }

  @UseGuards(AuthTokenGuard)
  @Post('optimize')
  optimize(@Body() dto: OptimizeTripDto, @Req() req: Request) {
    const userId = this.getUserId(req);
    return this.costService.optimizeTrip(dto, userId);
  }

  @UseGuards(AuthTokenGuard)
  @Post('predict-and-save')
  predictAndSave(@Body() dto: PredictAndSaveDto, @Req() req: Request) {
    return this.costService.predictAndSave(dto, req);
  }

  @Post('assess-risk')
  async assessRisk(@Body() dto: any) {
    return this.costService.assessComprehensiveRisk(dto);
  }

  @Post('carbon-analysis')
  async analyzeCarbonImpact(@Body() dto: any) {
    try {
      const fuelConsumptionLiters = Number(dto?.fuelConsumptionLiters || 0);
      const expectedCatch = Number(dto?.expectedCatch || 100);

      const totalEmissionsKgCO2 = fuelConsumptionLiters * 2.68;

      return {
        carbonFootprint: {
          totalEmissionsKgCO2,
          carbonIntensity: {
            emissionsPerKgFish:
              expectedCatch > 0 ? totalEmissionsKgCO2 / expectedCatch : 0,
            intensityRating: 'good',
          },
        },
        offsetEconomics: {
          marketPricing: {
            voluntary: (totalEmissionsKgCO2 / 1000) * 15,
            compliance: (totalEmissionsKgCO2 / 1000) * 25,
          },
        },
        sustainabilityRating: {
          overallScore: 75,
          letter_rating: 'B+',
          description: 'Good sustainability performance',
        },
        source: 'calculated',
      };
    } catch (error) {
      return {
        error: 'Carbon analysis service unavailable',
        fallback: true,
        carbonFootprint: {
          totalEmissionsKgCO2: Number(dto?.fuelConsumptionLiters || 0) * 2.68,
        },
      };
    }
  }

  @Get('realtime-data')
  async getRealTimeData(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('species') species?: string,
  ) {
    try {
      const parsedLat = lat !== undefined ? Number(lat) : 7.8731;
      const parsedLon = lon !== undefined ? Number(lon) : 80.7718;

      const safeLat = Number.isFinite(parsedLat) ? parsedLat : 7.8731;
      const safeLon = Number.isFinite(parsedLon) ? parsedLon : 80.7718;

      const realtimeData = {
        timestamp: new Date().toISOString(),
        location: { lat: safeLat, lon: safeLon },
        fuelPricing: {
          pricePerLiter: 180.0,
          currency: 'LKR',
          source: 'fallback_static',
          reliability: 'medium',
        },
        weatherConditions: {
          temperature: 28,
          windSpeed: 15,
          waveHeight: 2.0,
          visibility: 10,
          source: 'fallback_static',
          reliability: 'medium',
        },
        marketPrices: {
          currentPrice:
            species === 'tuna' ? 800 : species === 'sardines' ? 250 : 400,
          currency: 'LKR',
          source: 'fallback_static',
          reliability: 'medium',
        },
        dataQuality: {
          overallQuality: 'medium',
          reliabilityScore: 0.6,
          recommendedConfidence: 'medium',
        },
        alerts: [],
      };

      return realtimeData;
    } catch (error) {
      return {
        error: 'Real-time data service unavailable',
        fallback: true,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('market-trends')
  async getMarketTrends(@Query('days') days?: string) {
    try {
      const parsedDays = days !== undefined ? Number(days) : 7;
      const safeDays =
        Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 7;

      return {
        period: `last_${safeDays}_days`,
        fuelPriceTrend: {
          averagePrice: 175.0,
          priceChange: '+2.5%',
          volatility: 'medium',
          trend: 'slightly_increasing',
        },
        weatherPattern: {
          averageWindSpeed: 18.0,
          averageWaveHeight: 2.2,
          stormDays: 1,
          goodFishingDays: 5,
        },
        marketPerformance: {
          priceVolatility: 'medium',
          demandTrend: 'stable',
          seasonalFactor: 1.05,
          peakPriceDays: ['Monday', 'Thursday'],
        },
      };
    } catch (error) {
      return {
        error: 'Market trends service unavailable',
        fallback: true,
      };
    }
  }
}
