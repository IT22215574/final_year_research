import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { HealthController } from './health.controller';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // MongoDB connection to local installation
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mongoUri =
          configService.get<string>('MONGO') ??
          configService.get<string>('MONGODB_URI') ??
          configService.get<string>('MONGO_URI') ??
          'mongodb://localhost:27017/final_year_research';

        console.log('🔄 Connecting to local MongoDB...');
        console.log('📍 Database URI:', mongoUri);
        console.log('💾 Database: final_year_research');

        return { 
          uri: mongoUri,
          // Optimized settings for local MongoDB
          connectTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          serverSelectionTimeoutMS: 5000,
          maxPoolSize: 10,
        };
      },
      inject: [ConfigService],
    }),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
    AuthModule,
    UserModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
