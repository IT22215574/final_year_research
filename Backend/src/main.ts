import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  // ✅ Use NestExpressApplication so we can serve static files
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // =========================
  // MongoDB connection logging (keep your logic)
  // =========================
  const connection = app.get<Connection>(getConnectionToken());

  const checkConnection = () => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`MongoDB connection state: ${states[connection.readyState]}`);

    if (connection.readyState === 1) {
      console.log('MongoDB connected successfully');
      console.log(
        `Database: ${connection.db?.databaseName || 'connecting...'}`,
      );
    }
  };

  connection.on('connected', () => {
    console.log('MongoDB connected successfully');
    console.log(`Database: ${connection.db?.databaseName}`);
  });

  connection.on('error', (error) => {
    console.error('MongoDB connection error:', error.message);
  });

  connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
  });

  checkConnection();

  // =========================
  // ✅ Serve uploaded images publicly
  // URL: http://localhost:5000/uploads/boats/xxx.png
  // =========================
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // =========================
  // CORS
  // =========================
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',

      // ✅ Optional: add Expo dev URLs if you use them
      // 'http://localhost:19006',
      // 'exp://localhost:19000',
    ],
    credentials: true,
  });

  app.use(cookieParser());

  // =========================
  // Validation Pipe
  // =========================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );

  // =========================
  // Global API Prefix
  // =========================
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 5000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Uploads served at: http://localhost:${port}/uploads/`);
}

bootstrap();