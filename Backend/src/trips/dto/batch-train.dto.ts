import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsBoolean } from 'class-validator';

export class BatchTrainDto {
  @IsArray()
  @Type(() => String)
  tripIds: string[];

  @IsOptional()
  @IsString()
  boatId?: string;

  @IsOptional()
  @IsBoolean()
  forceRetrain?: boolean;
}
