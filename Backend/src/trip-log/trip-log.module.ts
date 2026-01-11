import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TripLogService } from './trip-log.service';
import { TripLogController } from './trip-log.controller';
import { TripLog, TripLogSchema } from '../schemas/trip-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TripLog.name, schema: TripLogSchema }]),
  ],
  controllers: [TripLogController],
  providers: [TripLogService],
  exports: [TripLogService],
})
export class TripLogModule {}
