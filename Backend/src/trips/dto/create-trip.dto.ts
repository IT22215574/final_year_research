import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDate,
  IsOptional,
  Min,
  IsEnum,
  IsArray,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class CreateTripDto {
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  departureTime: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  returnTime: Date;

  @IsOptional()
  @IsString()
  clientRequestId?: string;

  @IsOptional()
  @IsString()
  boatId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  engineHorsePower?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  engineHP?: number;

  @IsOptional()
  @IsString()
  boatType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  windSpeed?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  waveHeight?: number;

  @IsOptional()
  @IsString()
  weatherCondition?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fuelUsedLiters?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fuelPricePerLiter?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marketPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  iceCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  crewCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  foodCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maintenanceCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  startLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  startLon?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  endLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  endLon?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  speed?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  averageSpeed?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  crewCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fishingHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  numberOfDays?: number;

  @IsOptional()
  @IsEnum(['island', 'international'])
  mode?: 'island' | 'international';

  @IsOptional()
  @IsEnum(['planned', 'completed', 'cancelled'])
  status?: 'planned' | 'completed' | 'cancelled';

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
}