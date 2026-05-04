import { PartialType } from '@nestjs/mapped-types';
import { CreateModelRegistryDto } from './create-model-registry.dto';

export class UpdateModelRegistryDto extends PartialType(CreateModelRegistryDto) {}
