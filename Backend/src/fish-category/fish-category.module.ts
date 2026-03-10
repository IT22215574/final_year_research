import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  FishCategory,
  FishCategorySchema,
} from '../schemas/fish-category.schema';
import { FishCategoryService } from './fish-category.service';
import { FishCategoryController } from './fish-category.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FishCategory.name, schema: FishCategorySchema },
    ]),
    AuthModule, // Provides JwtService for AuthTokenGuard
  ],
  controllers: [FishCategoryController],
  providers: [FishCategoryService],
  exports: [FishCategoryService],
})
export class FishCategoryModule {}
