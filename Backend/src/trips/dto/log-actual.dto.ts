import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class ActualExternalCostItemDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class LogActualDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualFuelLiters: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualCatchKg: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualFuelCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualOperationalCost?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActualExternalCostItemDto)
  actualExternalCosts?: ActualExternalCostItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualRevenue?: number;

  @IsOptional()
  @IsString()
  actualNotes?: string;
}
