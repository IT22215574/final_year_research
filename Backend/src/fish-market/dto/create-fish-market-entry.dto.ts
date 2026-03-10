import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFishMarketEntryDto {
  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsNotEmpty()
  @IsString()
  grade: string;

  /** Stored as FormData so strings need Type conversion */
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  wholesalePrice: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  numberOfKilos: number;

  @IsNotEmpty()
  @IsString()
  catchingAreaName: string;

  /**
   * ISO date string: YYYY-MM-DD
   * If omitted, defaults to today in the service layer.
   */
  @IsOptional()
  @IsDateString()
  marketDate?: string;

  // Images handled by upload interceptor
  @IsOptional()
  images?: string[];
}
