import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTripDto } from './create-trip.dto';

class PredictedExternalCostItemDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsEnum(['manual', 'preference'])
  source?: 'manual' | 'preference';

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTripDto extends PartialType(CreateTripDto) {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  predictedFuelLiters?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  predictedTotalCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  predictedDistanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weatherSeverityIndex?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  economicStressIndex?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  profitabilityProbability?: number;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  riskCategory?: 'low' | 'medium' | 'high';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carbonEmissionKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carbonPerKgCatch?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  predictedFuelCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  predictedCrewCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  predictedOperationalCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  predictedExternalCostTotal?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PredictedExternalCostItemDto)
  predictedExternalCosts?: PredictedExternalCostItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optimizationRecommendations?: string[];

  @IsOptional()
  @IsEnum(['planned', 'completed', 'cancelled'])
  status?: 'planned' | 'completed' | 'cancelled';

  @IsOptional()
  @IsEnum(['island', 'international'])
  mode?: 'island' | 'international';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marketPrice?: number;
}