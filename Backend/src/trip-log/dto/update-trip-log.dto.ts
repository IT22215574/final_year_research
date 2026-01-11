import { PartialType } from '@nestjs/mapped-types';
import { CreateTripLogDto } from './create-trip-log.dto';

export class UpdateTripLogDto extends PartialType(CreateTripLogDto) {}
