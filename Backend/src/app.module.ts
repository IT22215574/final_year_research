import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AuthModule } from './auth/auth.module';
import { GradingModule } from './grading/grading.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import * as path from 'path';
import { TripsModule } from './trips/trips.module';
import { AnalyticsModule } from './trips_analytics/trips_analytics.module';
import { MlModule } from './tripml/tripml.module';
import { CostEngineModule } from './cost-engine/cost-engine.module';
import { CostPreferencesModule } from './cost-preferences/cost-preferences.module';
import { FavoriteFishModule } from './favorite-fish/favorite-fish.module';
import { FishCategoryModule } from './fish-category/fish-category.module';
import { FishMarketModule } from './fish-market/fish-market.module';
import { GradingRecordsModule } from './grading-records/grading-records.module';
import { FishZonesModule } from './fish-zones/fish-zones.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mongoUri =
          configService.get<string>('MONGO') ??
          configService.get<string>('MONGODB_URI') ??
          configService.get<string>('MONGO_URI');

        if (!mongoUri) {
          throw new Error(
            'Missing MongoDB connection string. Set MONGO (or MONGODB_URI) in Backend/.env',
          );
        }

        return { uri: mongoUri };
      },
      inject: [ConfigService],
    }),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
    AuthModule,
    GradingModule,
    UserModule,
    TripsModule,
    AnalyticsModule,
    MlModule,
    CostEngineModule,
    CostPreferencesModule,
    FavoriteFishModule,
    NotificationModule,
    FishCategoryModule,
    FishMarketModule,
    GradingRecordsModule,
    FishZonesModule,
  ],
})
export class AppModule {}
