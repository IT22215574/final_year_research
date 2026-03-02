import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { Trip, TripSchema } from '../schemas/trip.schema';
import { AuthModule } from 'src/auth/auth.module';
import { Boat, BoatSchema } from 'src/schemas/boat.schema';
import {
  TripCoefficient,
  TripCoefficientSchema,
} from 'src/schemas/trip-coefficient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Trip.name, schema: TripSchema },
      { name: TripCoefficient.name, schema: TripCoefficientSchema },
      { name: Boat.name, schema: BoatSchema },
    ]),
    AuthModule, // ✅ Add this so JwtService is available for AuthTokenGuard12,
    TripsModule
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
