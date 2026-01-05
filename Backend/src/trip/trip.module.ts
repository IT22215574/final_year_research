import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TripService } from './trip.service';
import { TripController } from './trip.controller';
import { Trip, TripSchema } from '../schemas/trip.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Trip.name, schema: TripSchema }]),
  ],
  controllers: [TripController],
  providers: [TripService],
  exports: [TripService],
})
export class TripModule {}
