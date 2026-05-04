import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ExternalCostItemDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsIn(['manual', 'preference'])
  source?: 'manual' | 'preference';

  @IsOptional()
  @IsString()
  description?: string;
}
