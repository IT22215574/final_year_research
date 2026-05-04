import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { Boat, BoatSchema } from '../schemas/boat.schema';
import { BoatType, BoatTypeSchema } from '../schemas/boat-type.schema';
import { BoatService } from './boat.service';
import { BoatController } from './boat.controller';
import { AuthModule } from 'src/auth/auth.module';
import { Trip, TripSchema } from 'src/schemas/trip.schema';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Boat.name, schema: BoatSchema },
      { name: BoatType.name, schema: BoatTypeSchema },
      { name: Trip.name, schema: TripSchema },
    ]),
    AuthModule, // Makes JwtService available for AuthTokenGuard
    UserModule,
    HttpModule, // For calling Python ML service
  ],
  controllers: [BoatController],
  providers: [BoatService],
  exports: [BoatService], // important for cost-engine
})
export class BoatModule {}
