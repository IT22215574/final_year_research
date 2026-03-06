import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Trip, TripSchema } from '../schemas/trip.schema';
import { BoatModule } from '../boat/boat.module';
import { CostEngineController } from './cost-engine.controller';
import { CostEngineService } from './cost-engine.service';
import { AuthModule } from 'src/auth/auth.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule, // import to use HttpService for ML API calls
    MongooseModule.forFeature([
      { name: Trip.name, schema: TripSchema }
    ]),
    BoatModule, // import to use BoatService,
    AuthModule, // import to use AuthTokenGuard
    
  ],
  controllers: [CostEngineController],
  providers: [CostEngineService],
})
export class CostEngineModule {}