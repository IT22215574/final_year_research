import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { Boat, BoatSchema } from '../schemas/boat.schema';
import { BoatService } from './boat.service';
import { BoatController } from './boat.controller';
import { AuthModule } from 'src/auth/auth.module';
import { Trip, TripSchema } from 'src/schemas/trip.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Boat.name, schema: BoatSchema },
      { name: Trip.name, schema: TripSchema },
    ]),
    AuthModule, // Makes JwtService available for AuthTokenGuard
    HttpModule, // For calling Python ML service
  ],
  controllers: [BoatController],
  providers: [BoatService],
  exports: [BoatService], // important for cost-engine
})
export class BoatModule {}
