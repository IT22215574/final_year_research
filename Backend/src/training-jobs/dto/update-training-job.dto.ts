import { PartialType } from '@nestjs/mapped-types';
import { CreateTrainingJobDto } from './create-training-job.dto';

export class UpdateTrainingJobDto extends PartialType(CreateTrainingJobDto) {}
