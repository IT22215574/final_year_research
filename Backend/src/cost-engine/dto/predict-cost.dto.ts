import { Type } from 'class-transformer';
import {
  IsNumber,
  IsMongoId,
  IsOptional,
  IsIn,
  Min,
  Max,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { ExternalCostItemDto } from './external-cost-item.dto';

export class PredictCostDto {
  @IsMongoId()
  boatId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  startLat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  startLon: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  endLat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  endLon: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  speed: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fishingHours: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  crewCount: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  windSpeed: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  waveHeight: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fuelPrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  expectedCatch: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marketPrice: number;

  @IsOptional()
  @IsIn(['island', 'international'])
  mode?: 'island' | 'international';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalCostItemDto)
  manualExternalCosts?: ExternalCostItemDto[];
}