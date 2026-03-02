import { IsNumber, IsString } from 'class-validator';

export class OptimizeTripDto {

  @IsString()
  boatId: string;

  @IsNumber()
  predictedFuel: number;

  @IsNumber()
  predictedCost: number;

  @IsNumber()
  weatherSeverityIndex: number;

  @IsNumber()
  profitabilityProbability: number;
}