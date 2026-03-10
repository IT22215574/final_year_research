import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FavoriteFish,
  FavoriteFishSchema,
} from '../schemas/favorite-fish.schema';
import { FavoriteFishService } from './favorite-fish.service';
import { FavoriteFishController } from './favorite-fish.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FavoriteFish.name, schema: FavoriteFishSchema },
    ]),
    AuthModule,
  ],
  controllers: [FavoriteFishController],
  providers: [FavoriteFishService],
  exports: [FavoriteFishService],
})
export class FavoriteFishModule {}
