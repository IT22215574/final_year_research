import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Response,
  BadRequestException,
} from '@nestjs/common';
import { TrainingCandidatesService } from './training-candidates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('training-candidates')
export class TrainingCandidatesController {
  constructor(private readonly candidatesService: TrainingCandidatesService) {}

  // 🛡️ ADMIN ONLY - Requires JWT + Admin role
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('pending')
  getPending() {
    return this.candidatesService.getPendingCandidates();
  }

  // 🛡️ ADMIN ONLY - Requires JWT + Admin role
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/approve')
  approveCandidate(@Param('id') id: string) {
    return this.candidatesService.updateStatus(id, 'APPROVED');
  }

  // 🛡️ ADMIN ONLY - Requires JWT + Admin role
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/reject')
  rejectCandidate(@Param('id') id: string, @Body('reason') reason: string) {
    return this.candidatesService.updateStatus(id, 'REJECTED', reason);
  }

  // 🛡️ ADMIN ONLY - list dataset CSV files currently available for training
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('datasets/files')
  getDatasetFiles() {
    return this.candidatesService.listDatasetCsvFiles();
  }

  // 🛡️ ADMIN ONLY - view full CSV file content in-app for dataset audits
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('datasets/files/:filename/content')
  async getDatasetFileContent(@Param('filename') filename: string) {
    try {
      return await this.candidatesService.getDatasetCsvContent(filename);
    } catch (error: any) {
      throw new BadRequestException(
        error?.message || 'Could not read dataset file.',
      );
    }
  }

  // 🛡️ ADMIN ONLY - force rebuild all dataset CSV files
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('datasets/refresh')
  refreshAllDatasets() {
    return this.candidatesService.refreshDatasetCsvArtifacts();
  }

  // 🛡️ ADMIN ONLY - refresh selected boat-type dataset CSV file
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('datasets/refresh/:boatType')
  refreshBoatDataset(@Param('boatType') boatType: string) {
    return this.candidatesService.refreshDatasetCsvArtifacts(boatType);
  }

  // 📊 CSV EXPORT - Requires JWT only (not admin)
  @UseGuards(JwtAuthGuard)
  @Get('export/csv')
  async exportCsv(@Response() res: any) {
    const csvData = await this.candidatesService.exportApprovedAsCSV();
    res.header('Content-Type', 'text/csv');
    res.header(
      'Content-Disposition',
      'attachment; filename="training_data_export.csv"',
    );
    res.send(csvData);
  }

  // 📊 CSV EXPORT - Requires JWT only (not admin)
  @UseGuards(JwtAuthGuard)
  @Get('export/csv/:boatType')
  async exportCsvByBoatType(
    @Param('boatType') boatType: string,
    @Response() res: any,
  ) {
    const csvData = await this.candidatesService.exportApprovedAsCSV(boatType);
    res.header('Content-Type', 'text/csv');
    res.header(
      'Content-Disposition',
      `attachment; filename="training_data_${boatType}.csv"`,
    );
    res.send(csvData);
  }
}
