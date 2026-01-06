import {
  IsString,
  IsNumber,
  IsOptional,
  IsMongoId,
  Min,
} from 'class-validator';

export class CreateExternalCostDto {
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsMongoId()
  tripId?: string;

  @IsString()
  costType: string;

  @IsString()
  unit: string;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(0)
  totalPrice: number;

  @IsOptional()
  @IsString()
  description?: string;
}
