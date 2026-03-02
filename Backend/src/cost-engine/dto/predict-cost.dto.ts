  import { Type } from 'class-transformer';
  import { IsNumber, IsMongoId, IsOptional, IsEnum, Min, Max } from 'class-validator';

  export class PredictCostDto {
    // ✅ prevents: Cast to ObjectId failed...
    @IsMongoId()
    boatId: string;

    // ✅ coordinate ranges + transform to number
    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    startLat: number;

    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    startLon: number;

    @Type(() => Number)
    @IsNumber()
    @Min(-90)
    @Max(90)
    endLat: number;

    @Type(() => Number)
    @IsNumber()
    @Min(-180)
    @Max(180)
    endLon: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0.1)
    speed: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    fishingHours: number;

    @Type(() => Number)
    @IsNumber()
    @Min(1)
    crewCount: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    windSpeed: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    waveHeight: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    fuelPrice: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    expectedCatch: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    marketPrice: number;

    @IsOptional()
    @IsEnum(['island', 'international'])
    mode?: 'island' | 'international';
  }