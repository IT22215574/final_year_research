import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

// ✅ Sri Lankan Fishing Boat Type Codes
export const BOAT_TYPES = [
  'IMUI', // Indigenous Multi-Day Ultra Light
  'IDAT', // Indigenous Day Boats
  'OFRP', // Offshore Fishing Vessel
  'MTRP', // Multi-day Trawler/Boat
] as const;

// ✅ Boat-Type-Specific Fuel Consumption Baselines
//
// Keep the units explicit:
// - fuelPerKm is used for route/travel fuel.
// - fuelPerHpHour is used for fishing/idling engine-hour fuel.
//
// Do not replace fuelPerKm with L/HP/hour values such as 0.28. Those are
// different physical units and will make prediction explanations inconsistent.
export const BOAT_FUEL_BASELINES = {
  IMUI: {
    name: 'Indigenous Multi-Day Ultra Light',
    fuelPerKm: 2.25, // L/km baseline
    fuelPerHpHour: 0.28, // L/HP/hour baseline
    description: 'Small motorized boats for day/multi-day fishing',
  },

  IDAT: {
    name: 'Indigenous Day Boats',
    fuelPerKm: 2.0, // L/km baseline
    fuelPerHpHour: 0.3, // L/HP/hour baseline
    description: 'Traditional day fishing vessels',
  },

  OFRP: {
    name: 'Offshore Fishing Vessel',
    fuelPerKm: 0.62, // L/km baseline - Speed-adjusted
    fuelPerHpHour: 0.28, // L/HP/hour baseline
    description: 'Large offshore fishing trawlers',
  },

  MTRP: {
    name: 'Multi-day Trawler/Boat',
    fuelPerKm: 0.43, // L/km baseline
    fuelPerHpHour: 0.25, // L/HP/hour baseline
    description: 'Multi-day fishing vessels',
  },
} as const;

export class CreateBoatDto {
  @IsNotEmpty()
  @IsString()
  boatName: string;

  @IsNotEmpty()
  @IsString()
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
