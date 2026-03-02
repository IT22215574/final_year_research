import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDate,
  IsOptional,
  Min,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTripDto {
  // =========================
  // Trip Duration
  // =========================
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  departureTime: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  returnTime: Date;

  // =========================
  // Travel & Engine
  // =========================
  @IsOptional()
  @IsString()
  boatId?: string; // ✅ IMPORTANT for learning (and linking boat)

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  engineHorsePower?: number;

  @IsOptional()
  @IsString()
  boatType?: string;

  // =========================
  // Weather Factors
  // =========================
  @IsOptional()
  @IsNumber()
  @Min(0)
  windSpeed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  waveHeight?: number;

  @IsOptional()
  @IsString()
  weatherCondition?: string;

  // =========================
  // Fuel
  // =========================
  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelUsedLiters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelPricePerLiter?: number;

  // =========================
  // Operational Costs
  // =========================
  @IsOptional()
  @IsNumber()
  @Min(0)
  iceCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  crewCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  foodCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maintenanceCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCost?: number;

  // =========================
  // Trip Mode
  // =========================
  @IsOptional()
  @IsEnum(['island', 'international'])
  mode?: 'island' | 'international';

  // =========================
  // Prediction Fields (optional)
  // Put here ONLY if you want to allow creating trips with prediction data.
  // Otherwise keep them in UpdateTripDto only.
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