// Temporary MongoDB-less version for immediate testing
// Use this to run your NestJS app without MongoDB connection
// Replace src/app.module.ts with this temporarily if needed

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
// import { MongooseModule } from '@nestjs/mongoose'; // Disabled temporarily
import { AuthModule } from './auth/auth.module';
// import { UserModule } from './user/user.module'; // Disabled if it requires MongoDB
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // MongoDB disabled temporarily - uncomment when MongoDB is ready
    /*
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mongoUri =
          configService.get<string>('MONGO') ??
          configService.get<string>('MONGODB_URI') ??
          configService.get<string>('MONGO_URI');

        if (!mongoUri) {
          throw new Error(
            'Missing MongoDB connection string. Please set MONGO in Backend/.env file.',
          );
        }

        console.log('🔄 Connecting to MongoDB...');
        console.log('📍 Database URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

        return { 
          uri: mongoUri,
          connectTimeoutMS: 30000,
          socketTimeoutMS: 45000,
          serverSelectionTimeoutMS: 10000,
          maxPoolSize: 10,
          maxIdleTimeMS: 30000,
          heartbeatFrequencyMS: 10000,
        };
      },
      inject: [ConfigService],
    }),
    */
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
    // AuthModule, // Disabled if it requires MongoDB
    // UserModule, // Disabled if it requires MongoDB
  ],
})
export class AppModule {
  constructor() {
    console.log('🚀 NestJS started without MongoDB (temporary mode)');
    console.log('📝 To enable MongoDB: Set up database and uncomment MongoDB imports');
  }
}