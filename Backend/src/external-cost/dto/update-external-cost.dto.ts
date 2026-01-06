import { PartialType } from '@nestjs/mapped-types';
import { CreateExternalCostDto } from './create-external-cost.dto';

export class UpdateExternalCostDto extends PartialType(CreateExternalCostDto) {}
