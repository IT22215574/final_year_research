import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

// ✅ Sri Lankan Fishing Boat Type Codes
export const BOAT_TYPES = [
  'IMUL', // Indigenous Multi-Day Ultra Light
  'IDAY', // Indigenous Day Boats
  'OFRP', // Offshore Fishing Vessel
  'MTRB', // Multi-day Trawler/Boat
] as const;

// ✅ Boat-Type-Specific Fuel Consumption Baselines (L/km)
// Based on Sri Lankan fishing vessel fuel efficiency data
export const BOAT_FUEL_BASELINES = {
  IMUL: {
    name: 'Indigenous Multi-Day Ultra Light',
    fuelPerKm: 2.25, // L/km baseline
    description: 'Small motorized boats for day/multi-day fishing',
  },

  IDAY: {
    name: 'Indigenous Day Boats',
    fuelPerKm: 2.0, // L/km baseline
    description: 'Traditional day fishing vessels',
  },

  OFRP: {
    name: 'Offshore Fishing Vessel',
    fuelPerKm: 0.62, // L/km baseline - Speed-adjusted
    description: 'Large offshore fishing trawlers',
  },

  MTRB: {
    name: 'Multi-day Trawler/Boat',
    fuelPerKm: 0.43, // L/km baseline
    description: 'Multi-day fishing vessels',
  },
} as const;

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
