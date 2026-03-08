import {
  IsBooleanString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCostPreferenceDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  // FormData / frontend can send as string
  @IsNotEmpty()
  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsString()
  description?: string;

  // optional string booleans: "true" / "false"
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsBooleanString()
  autoApply?: string;
}