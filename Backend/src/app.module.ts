import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AuthModule } from './auth/auth.module';
import { GradingModule } from './grading/grading.module';
import { UserModule } from './user/user.module';
import * as path from 'path';
import { TripsModule } from './trips/trips.module';
import { AnalyticsModule } from './trips_analytics/trips_analytics.module';
import { MlModule } from './tripml/tripml.module';
import { CostEngineModule } from './cost-engine/cost-engine.module';
import { CostPreferencesModule } from './cost-preferences/cost-preferences.module';
import { FishCategoryModule } from './fish-category/fish-category.module';
import { FishMarketModule } from './fish-market/fish-market.module';
import { GradingRecordsModule } from './grading-records/grading-records.module';
import { FishZonesModule } from './fish-zones/fish-zones.module';
import { TrainingCandidatesModule } from './training-candidates/training-candidates.module';
import { TrainingJobsModule } from './training-jobs/training-jobs.module';
import { ModelRegistryModule } from './model-registry/model-registry.module';
import { TrainingUploadsModule } from './training-uploads/training-uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO'),
      }),
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
    FishCategoryModule,
    FishMarketModule,
    GradingRecordsModule,
    FishZonesModule,
    TrainingCandidatesModule,
    TrainingJobsModule,
    ModelRegistryModule,
    TrainingUploadsModule,
  ],
})
export class AppModule {}
