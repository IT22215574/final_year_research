import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { ModelRegistryService } from './model-registry.service';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('model-registry')
export class ModelRegistryController {
  constructor(private readonly registryService: ModelRegistryService) { }

  @Get('versions')
  getAllVersions() {
    return this.registryService.getAllVersions();
  }

  @Get('versions/job/:jobId')
  getVersionsByJob(@Param('jobId') jobId: string) {
    return this.registryService.getVersionsByJob(jobId);
  }

  @Get('active')
  getActiveModel() {
    return this.registryService.getActiveModel();
  }

  @Post('versions/:id/promote')
  promote(@Param('id') id: string, @Req() req: ExpressRequest) {
    const user = (req as any).user ?? {};
    const adminId = user?.userId || user?.id || 'unknown';
    return this.registryService.promote(id, adminId);
  }

  @Post('rollback')
  rollback(@Req() req: ExpressRequest) {
    const user = (req as any).user ?? {};
    const adminId = user?.userId || user?.id || 'unknown';
    return this.registryService.rollback(adminId);
  }
}
