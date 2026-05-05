import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { TripMetricsService } from './services/trip-metrics.service';
import { BoatTypeCoefficientService } from './services/boat-type-coefficients.service';
import { Trip, TripSchema } from '../schemas/trip.schema';
import { AuthModule } from 'src/auth/auth.module';
import { Boat, BoatSchema } from 'src/schemas/boat.schema';
import {
  TripCoefficient,
  TripCoefficientSchema,
} from 'src/schemas/trip-coefficient.schema';
import { TrainingCandidate, TrainingCandidateSchema } from '../schemas/training-candidate.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Trip.name, schema: TripSchema },
      { name: TripCoefficient.name, schema: TripCoefficientSchema },
      { name: Boat.name, schema: BoatSchema },
      { name: TrainingCandidate.name, schema: TrainingCandidateSchema }
    ]),
    AuthModule, // Makes JwtService available for AuthTokenGuard
    HttpModule, // For calling Python ML service
  ],
  controllers: [TripsController],
  providers: [TripsService, TripMetricsService, BoatTypeCoefficientService],
  exports: [TripsService, TripMetricsService, BoatTypeCoefficientService],
})
export class TripsModule { }
