import { IsNotEmpty, IsNumber, IsString, IsDate, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTripDto {
  // Trip Duration
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  departureTime: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  returnTime: Date;

  // Travel & Engine
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

  // Weather Factors
  @IsOptional()
  @IsNumber()
  windSpeed?: number;

  @IsOptional()
  @IsNumber()
  waveHeight?: number;

  @IsOptional()
  @IsString()
  weatherCondition?: string;

  // Fuel
  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelUsedLiters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelPricePerLiter?: number;

  // Operational Costs
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
}