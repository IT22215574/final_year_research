import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateTripDto } from './create-trip.dto';

export class UpdateTripDto extends PartialType(CreateTripDto) {
  // =========================
  // Prediction Fields (optional)
  // =========================

  @IsOptional()
  @IsNumber()
  predictedFuelLiters?: number;

  @IsOptional()
  @IsNumber()
  predictedTotalCost?: number;

  @IsOptional()
  @IsNumber()
  predictedDistanceKm?: number;

  @IsOptional()
  @IsNumber()
  weatherSeverityIndex?: number;

  @IsOptional()
  @IsNumber()
  economicStressIndex?: number;

  @IsOptional()
  @IsNumber()
  profitabilityProbability?: number;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  riskCategory?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsNumber()
  carbonEmissionKg?: number;

  @IsOptional()
  @IsNumber()
  carbonPerKgCatch?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optimizationRecommendations?: string[];
}