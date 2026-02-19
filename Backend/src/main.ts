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
    origin: true, // Allow all origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-client-type'],
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // Bind to all interfaces
  console.log(`Application is running on: http://0.0.0.0:${port}`);
  console.log(`Local access: http://localhost:${port}`);
  console.log(`Network access: http://172.28.22.68:${port}`);
}

bootstrap();