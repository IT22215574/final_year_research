import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get MongoDB connection
  const connection = app.get<Connection>(getConnectionToken());
  
  // Check current connection state
  const checkConnection = () => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`MongoDB connection state: ${states[connection.readyState]}`);
    
    if (connection.readyState === 1) {
      console.log('MongoDB connected successfully');
      console.log(`Database: ${connection.db?.databaseName || 'connecting...'}`);
    }
  };

  // Listen for connection events
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

  // Initial check
  checkConnection();

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = process.env.NESTJS_PORT || process.env.PORT || 5000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();