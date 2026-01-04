import { Module } from '@nestjs/common';
import { FishingController } from './fishing.controller';
import { FishingService } from './fishing.service';

@Module({
  controllers: [FishingController],
  providers: [FishingService],
  exports: [FishingService],
})
export class FishingModule {}
