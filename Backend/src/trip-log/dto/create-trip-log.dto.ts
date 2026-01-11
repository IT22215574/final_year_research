import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateTripLogDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  tripDate: string;

  @IsNotEmpty()
  @IsString()
  departureTime: string;

  @IsNotEmpty()
  @IsString()
  returnDate: string;

  @IsNotEmpty()
  @IsString()
  returnTime: string;

  @IsNotEmpty()
  @IsString()
  destination: string;

  @IsOptional()
  @IsNumber()
  distance?: number;

  @IsOptional()
  @IsNumber()
  fuelUsed?: number;

  @IsOptional()
  @IsNumber()
  fuelCost?: number;

  @IsOptional()
  @IsNumber()
  crewSize?: number;

  @IsOptional()
  @IsNumber()
  catchWeight?: number;

  @IsOptional()
  @IsNumber()
  catchValue?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
