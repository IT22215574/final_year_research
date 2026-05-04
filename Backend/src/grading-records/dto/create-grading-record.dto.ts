import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
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

  // ── Measurement & size classification fields ──────────────────────────────
  // Stored for future reporting and analytics.
  // Old records without these fields remain valid (all optional).

  /** Measured fish length in centimetres */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  measuredLengthCm?: number;

  /** Estimated weight in kilograms */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedWeightKg?: number;

  /** Estimated weight in grams */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedWeightGrams?: number;

  /**
   * Size category — only for Skipjack Tuna.
   * Categories based on estimated weight thresholds:
   * >3 kg → large, 1–3 kg → medium, <1 kg → small.
   */
  @IsOptional()
  @IsString()
  @IsIn(['small', 'medium', 'large'])
  sizeCategory?: 'small' | 'medium' | 'large';

  /** Weight estimation method (e.g. "research-length-weight") */
  @IsOptional()
  @IsString()
  measurementMethod?: string;

  /** Measurement confidence (0–1) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  measurementConfidence?: number;
}
