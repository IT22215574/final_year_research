import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class ExternalCostDto {
  @IsString()
  type: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateTripDto {
  @IsString()
  userId: string;

  // Trip Details
  @IsString()
  boatType: string;

  @IsNumber()
  @Min(0)
  engineHp: number;

  @IsNumber()
  @Min(1)
  tripDays: number;

  @IsNumber()
  @Min(0)
  distanceKm: number;

  @IsNumber()
  @Min(0)
  windKph: number;

  @IsNumber()
  @Min(0)
  waveM: number;

  @IsNumber()
  @Min(1)
  month: number;

  @IsString()
  portName: string;

  @IsOptional()
  @IsString()
  fishingZone?: string;

  @IsOptional()
  @IsString()
  fishingZoneId?: string;

  // Fuel Prices
  @IsNumber()
  @Min(0)
  dieselPriceLKR: number;

  @IsNumber()
  @Min(0)
  petrolPriceLKR: number;

  @IsNumber()
  @Min(0)
  kerosenePriceLKR: number;

  // Base Costs
  @IsNumber()
  @Min(0)
  baseCost: number;

  @IsNumber()
  @Min(0)
  fuelCostEstimate: number;

  @IsNumber()
  @Min(0)
  iceCostEstimate: number;

  // External Costs
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalCostDto)
  externalCosts?: ExternalCostDto[];

  @IsNumber()
  @Min(0)
  externalCostsTotal: number;

  @IsNumber()
  @Min(0)
  totalTripCost: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  breakdown?: {
    baseCostPercentage: number;
    externalCostsPercentage: number;
  };

  @IsOptional()
  @IsEnum(['planned', 'ongoing', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;
}
