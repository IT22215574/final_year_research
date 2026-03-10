import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';

import { GradingRecordsController } from './grading-records.controller';
import { GradingRecordsService } from './grading-records.service';
import {
  GradingRecord,
  GradingRecordSchema,
} from '../schemas/grading-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GradingRecord.name, schema: GradingRecordSchema },
    ]),
    AuthModule, // Provides JwtService for AuthTokenGuard
  ],
  controllers: [GradingRecordsController],
  providers: [GradingRecordsService],
})
export class GradingRecordsModule {}
