import {
  IsEnum,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { BOAT_TYPES } from './create-boat.dto';

export class UpdateBoatDto {
  @IsOptional()
  @IsString()
  boatName?: string;

  @IsOptional()
  @IsString()
  @IsIn(BOAT_TYPES, { message: 'Invalid boatType' })
  boatType?: string;

  @IsOptional()
  @IsNumberString()
  engineHorsePower?: string;

  @IsOptional()
  @IsString()
  engineType?: string;

  @IsOptional()
  @IsNumberString()
  boatValue?: string;

  @IsOptional()
  @IsString()
  boatImage?: string;

  @IsOptional()
  @IsString()
  specifications?: string;

  @IsOptional()
  @IsNumberString()
  boatLength?: string;

  @IsOptional()
  @IsNumberString()
  boatWidth?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsNumberString()
  fuelEfficiencyFactor?: string;

  @IsOptional()
  @IsNumberString()
  engineDegradationFactor?: string;

  @IsOptional()
  @IsNumberString()
  averageFuelPredictionError?: string;

  @IsOptional()
  @IsEnum(['island', 'international'])
  mode?: 'island' | 'international';
}