import { IsNumber, Min } from 'class-validator';

export class LogActualDto {

  @IsNumber()
  @Min(0)
  actualFuelLiters: number;

  @IsNumber()
  @Min(0)
  actualCatchKg: number;
}