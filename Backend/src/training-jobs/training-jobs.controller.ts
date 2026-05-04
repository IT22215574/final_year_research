import { Controller, Post, Get, Req, Body, UseGuards } from '@nestjs/common';
import { TrainingJobsService } from './training-jobs.service';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
// 🛡️ Lock down the ENTIRE controller to Admins only
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('training-jobs')
export class TrainingJobsController {
  constructor(private readonly trainingJobsService: TrainingJobsService) {}
  @Post('trigger')
  triggerTraining(
    @Req() req: ExpressRequest,
    @Body() dto?: { scope?: 'GLOBAL' | 'BOAT_TYPE'; boatType?: string },
  ) {
    const user = (req as any).user ?? {};
    const userId = user?.userId || user?.id || 'unknown_admin';

    return this.trainingJobsService.triggerTraining(userId, dto);
  }
  @Get('history')
  getHistory() {
    return this.trainingJobsService.getRecentJobs();
  }

  @Get('analytics/boat-types')
  getBoatTypeAnalytics() {
    return this.trainingJobsService.getBoatTypeAnalytics();
  }
}
