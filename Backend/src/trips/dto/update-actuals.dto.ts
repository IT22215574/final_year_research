import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateActualsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelUsedLiters?: number;
}