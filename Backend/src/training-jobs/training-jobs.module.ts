import { Module } from '@nestjs/common';
import { TrainingJobsService } from './training-jobs.service';
import { TrainingJobsController } from './training-jobs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { TrainingJob, TrainingJobSchema } from '../schemas/training-job.schema';
import {
  TrainingCandidate,
  TrainingCandidateSchema,
} from '../schemas/training-candidate.schema';
import { BoatType, BoatTypeSchema } from '../schemas/boat-type.schema';
import { ModelRegistryModule } from '../model-registry/model-registry.module';
import { TrainingCandidatesModule } from '../training-candidates/training-candidates.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TrainingJob.name, schema: TrainingJobSchema },
      { name: TrainingCandidate.name, schema: TrainingCandidateSchema },
      { name: BoatType.name, schema: BoatTypeSchema },
    ]),
    HttpModule,
    ModelRegistryModule,
    TrainingCandidatesModule,
  ],
  controllers: [TrainingJobsController],
  providers: [TrainingJobsService],
})
export class TrainingJobsModule {}
