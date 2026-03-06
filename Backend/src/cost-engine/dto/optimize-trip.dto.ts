// Backend/src/cost-engine/dto/optimize-trip.dto.ts
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { OmitType } from '@nestjs/mapped-types';
import { PredictCostDto } from './predict-cost.dto';

// Take everything from PredictCostDto except speed
export class OptimizeTripDto extends OmitType(PredictCostDto, ['speed'] as const) {
  // Optional: optimizer can try multiple speeds
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  speed?: number;
}