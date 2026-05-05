import { PartialType } from '@nestjs/mapped-types';
import { CreateTrainingCandidateDto } from './create-training-candidate.dto';

export class UpdateTrainingCandidateDto extends PartialType(CreateTrainingCandidateDto) {}
