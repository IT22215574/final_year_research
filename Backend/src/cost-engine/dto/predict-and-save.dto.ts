import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';
import { PredictCostDto } from './predict-cost.dto';

export class PredictAndSaveDto extends PredictCostDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  departureTime?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  returnTime?: Date;
}