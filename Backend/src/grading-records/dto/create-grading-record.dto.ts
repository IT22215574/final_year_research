import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGradingRecordDto {
  /** Model species label e.g. "tuna" / "makerel" */
  @IsOptional()
  @IsString()
  fishSpecies?: string;

  /** Display name e.g. "Skipjack Tuna" */
  @IsOptional()
  @IsString()
  fishName?: string;

  /** Grade returned by the model */
  @IsOptional()
  @IsString()
  predictedGrade?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  gradeConfidence?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  speciesConfidence?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['saved', 'used_in_market'])
  marketStatus?: 'saved' | 'used_in_market';
}
