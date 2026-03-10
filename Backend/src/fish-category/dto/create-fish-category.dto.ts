import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateFishCategoryDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;
}
