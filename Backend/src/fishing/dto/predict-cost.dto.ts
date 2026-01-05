import { IsString, IsNumber, IsInt, Min, Max, IsIn, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExternalCostItemDto {
  @IsString()
  type: string; // e.g., 'crew', 'gear', 'food', 'other'

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class PredictCostDto {
  @IsString()
  @IsIn(['OFRP', 'NTRB', 'IMUL', 'MTRB', 'NBSB', 'IDAY'], {
    message: 'boat_type must be one of: OFRP, NTRB, IMUL, MTRB, NBSB, IDAY',
  })
  boat_type: string;

  @IsNumber()
  @Min(0)
  @Max(350)
  engine_hp: number;

  @IsInt()
  @Min(1)
  @Max(30)
  trip_days: number;

  @IsNumber()
  @Min(1)
  @Max(800)
  distance_km: number;

  @IsNumber()
  @Min(3)
  @Max(40)
  wind_kph: number;

  @IsNumber()
  @Min(0.2)
  @Max(4.0)
  wave_m: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsString()
  port_name: string;

  @IsNumber()
  @Min(0)
  diesel_price_LKR: number;

  @IsNumber()
  @Min(0)
  petrol_price_LKR: number;

  @IsNumber()
  @Min(0)
  kerosene_price_LKR: number;

  // Optional external costs array
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExternalCostItemDto)
  external_costs?: ExternalCostItemDto[];
}
