import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export const BOAT_TYPES = [
  'One Day Fishing Boat (30ft)',
  'Flat Bottom Boat (18-19ft)',
  'Canoe',
  '55 Feet Long-line Fishing Trawler',
  'Multi-day Fishing Vessel',
  'Traditional Fishing Boat',
] as const;

export class CreateBoatDto {
  @IsNotEmpty()
  @IsString()
  boatName: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(BOAT_TYPES, { message: 'Invalid boatType' })
  boatType: string;

  // FormData sends numbers as strings
  @IsNotEmpty()
  @IsNumberString()
  engineHorsePower: string;

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
  @IsEnum(['island', 'international'])
  mode?: 'island' | 'international';
}
