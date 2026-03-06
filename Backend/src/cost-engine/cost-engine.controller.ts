import { Body, Controller, Post, Req, UseGuards, Get, Param, Query } from '@nestjs/common';
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

  @Post('assess-risk')
  async assessRisk(@Body() dto: any) {
    return this.costService.assessComprehensiveRisk(dto);
  }

  @Post('carbon-analysis')
  async analyzeCarbonImpact(@Body() dto: any) {
    try {
      // Call ML service for carbon analysis (placeholder for integration)
      const carbonAnalysis = {
        carbonFootprint: {
          totalEmissionsKgCO2: dto.fuelConsumptionLiters * 2.68,
          carbonIntensity: {
            emissionsPerKgFish: (dto.fuelConsumptionLiters * 2.68) / (dto.expectedCatch || 100),
            intensityRating: 'good'
          }
        },
        offsetEconomics: {
          marketPricing: {
            voluntary: ((dto.fuelConsumptionLiters * 2.68) / 1000) * 15,
            compliance: ((dto.fuelConsumptionLiters * 2.68) / 1000) * 25
          }
        },
        sustainabilityRating: {
          overallScore: 75,
          letter_rating: 'B+',
          description: 'Good sustainability performance'
        },
        source: 'calculated'
      };

      return carbonAnalysis;
    } catch (error) {
      return {
        error: 'Carbon analysis service unavailable',
        fallback: true,
        carbonFootprint: { totalEmissionsKgCO2: dto.fuelConsumptionLiters * 2.68 }
      };
    }
  }

  @Get('realtime-data')
  async getRealTimeData(
    @Query('lat') lat?: number,
    @Query('lon') lon?: number,
    @Query('species') species?: string
  ) {
    try {
      // Call ML service for real-time data (placeholder for integration)
      const realtimeData = {
        timestamp: new Date().toISOString(),
        location: { lat: lat || 7.8731, lon: lon || 80.7718 },
        fuelPricing: {
          pricePerLiter: 180.0,
          currency: 'LKR',
          source: 'fallback_static',
          reliability: 'medium'
        },
        weatherConditions: {
          temperature: 28,
          windSpeed: 15,
          waveHeight: 2.0,
          visibility: 10,
          source: 'fallback_static',
          reliability: 'medium'
        },
        marketPrices: {
          currentPrice: species === 'tuna' ? 800 : species === 'sardines' ? 250 : 400,
          currency: 'LKR',
          source: 'fallback_static',
          reliability: 'medium'
        },
        dataQuality: {
          overallQuality: 'medium',
          reliabilityScore: 0.6,
          recommendedConfidence: 'medium'
        },
        alerts: []
      };

      return realtimeData;
    } catch (error) {
      return {
        error: 'Real-time data service unavailable',
        fallback: true,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('market-trends')
  async getMarketTrends(@Query('days') days?: number) {
    try {
      const trendData = {
        period: `last_${days || 7}_days`,
        fuelPriceTrend: {
          averagePrice: 175.0,
          priceChange: '+2.5%',
          volatility: 'medium',
          trend: 'slightly_increasing'
        },
        weatherPattern: {
          averageWindSpeed: 18.0,
          averageWaveHeight: 2.2,
          stormDays: 1,
          goodFishingDays: 5
        },
        marketPerformance: {
          priceVolatility: 'medium',
          demandTrend: 'stable',
          seasonalFactor: 1.05,
          peakPriceDays: ['Monday', 'Thursday']
        }
      };

      return trendData;
    } catch (error) {
      return {
        error: 'Market trends service unavailable',
        fallback: true
      };
    }
  }
}
