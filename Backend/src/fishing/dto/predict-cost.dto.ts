import { IsString, IsNumber, IsInt, Min, Max } from 'class-validator';

export class PredictCostDto {
  @IsString()
  boat_type: string;

  @IsNumber()
  @Min(5)
  @Max(250)
  engine_hp: number;

  @IsInt()
  @Min(1)
  @Max(7)
  trip_days: number;

  @IsNumber()
  @Min(10)
  @Max(600)
  distance_km: number;

  @IsNumber()
  @Min(5)
  @Max(30)
  wind_kph: number;

  @IsNumber()
  @Min(0.5)
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
}
