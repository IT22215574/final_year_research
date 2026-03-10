import { PartialType } from '@nestjs/mapped-types';
import { CreateFishMarketEntryDto } from './create-fish-market-entry.dto';

export class UpdateFishMarketEntryDto extends PartialType(
  CreateFishMarketEntryDto,
) {}
