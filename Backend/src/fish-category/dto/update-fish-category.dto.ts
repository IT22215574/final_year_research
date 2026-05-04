import { PartialType } from '@nestjs/mapped-types';
import { CreateFishCategoryDto } from './create-fish-category.dto';

export class UpdateFishCategoryDto extends PartialType(CreateFishCategoryDto) {}
