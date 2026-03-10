import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  FishMarketEntry,
  FishMarketEntrySchema,
} from '../schemas/fish-market-entry.schema';
import { FishMarketService } from './fish-market.service';
import { FishMarketController } from './fish-market.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FishMarketEntry.name, schema: FishMarketEntrySchema },
    ]),
    AuthModule,
  ],
  controllers: [FishMarketController],
  providers: [FishMarketService],
  exports: [FishMarketService],
})
export class FishMarketModule {}
