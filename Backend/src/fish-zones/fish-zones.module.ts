import { Module } from '@nestjs/common';
import { FishZonesController } from './fish-zones.controller';
import { FishZonesService } from './fish-zones.service';

@Module({
  controllers: [FishZonesController],
  providers: [FishZonesService],
  exports: [FishZonesService],
})
export class FishZonesModule {}
