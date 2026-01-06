import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExternalCostController } from './external-cost.controller';
import { ExternalCostService } from './external-cost.service';
import {
  ExternalCost,
  ExternalCostSchema,
} from '../schemas/external-cost.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExternalCost.name, schema: ExternalCostSchema },
    ]),
  ],
  controllers: [ExternalCostController],
  providers: [ExternalCostService],
  exports: [ExternalCostService],
})
export class ExternalCostModule {}
