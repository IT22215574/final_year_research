import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'NestJS Backend API',
      version: '1.0.0',
      database: 'MongoDB connection in progress...',
      message: 'API is running successfully! 🚀',
    };
  }

  @Get('database')
  getDatabaseStatus() {
    return {
      status: 'MongoDB connection configured',
      message: 'Database operations available when MongoDB is connected',
      fallback: 'API functions without database for basic operations',
    };
  }
}