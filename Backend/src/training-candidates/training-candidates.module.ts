import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrainingCandidatesService } from './training-candidates.service';
import { TrainingCandidatesController } from './training-candidates.controller';
import { TrainingCandidate, TrainingCandidateSchema } from '../schemas/training-candidate.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TrainingCandidate.name, schema: TrainingCandidateSchema }])
  ],
  controllers: [TrainingCandidatesController],
  providers: [TrainingCandidatesService],
  exports: [TrainingCandidatesService] // Export it so we can use it in other modules later
})
export class TrainingCandidatesModule {}
