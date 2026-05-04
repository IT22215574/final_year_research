import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

import { Trip, TripSchema } from '../schemas/trip.schema';
import { BoatModule } from '../boat/boat.module';
import { AuthModule } from '../auth/auth.module';
import { CostPreferencesModule } from '../cost-preferences/cost-preferences.module';

import { CostEngineController } from './cost-engine.controller';
import { CostEngineService } from './cost-engine.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: Trip.name, schema: TripSchema }]),
    BoatModule,
    AuthModule,
    CostPreferencesModule,
  ],
  controllers: [CostEngineController],
  providers: [CostEngineService],
  exports: [CostEngineService],
})
export class CostEngineModule {}
