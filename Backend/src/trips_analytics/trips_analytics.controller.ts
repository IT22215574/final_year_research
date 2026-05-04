import { Controller, Get, UseGuards, Response } from '@nestjs/common';
import { AnalyticsService } from './trips_analytics.service';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { Response as ExpressResponse } from 'express';

@Controller('analytics')
@UseGuards(AuthTokenGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Export trips as CSV
  @Get('export-csv')
  async exportCSV(@Response() res: ExpressResponse) {
    try {
      const csv = await this.analyticsService.exportTripsToCSV();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=trips_export.csv',
      );

      res.send(csv);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // ✅ Export ML training dataset
  @Get('export-fuel-training-csv')
  async exportFuelTrainingCSV(@Response() res: ExpressResponse) {
    try {
      const csv = await this.analyticsService.exportFuelTrainingCSV();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=fuel_training_export.csv',
      );

      res.send(csv);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // Get overall analytics
  @Get('overview')
  async getOverview() {
    return this.analyticsService.getOverallAnalytics();
  }
}
