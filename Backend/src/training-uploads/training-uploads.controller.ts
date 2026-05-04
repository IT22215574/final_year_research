import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TrainingUploadsService } from './training-uploads.service';
import { TrainingCandidatesService } from '../training-candidates/training-candidates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  UploadDatasetDto,
  ApproveUploadDto,
  RejectUploadDto,
} from './dto/upload-dataset.dto';

interface ExpressRequest extends Request {
  user?: any;
}

@Controller('training-uploads')
@UseGuards(JwtAuthGuard, AdminGuard)
export class TrainingUploadsController {
  constructor(
    private readonly uploadsService: TrainingUploadsService,
    private readonly candidatesService: TrainingCandidatesService,
  ) {}

  private getUserId(req: ExpressRequest) {
    const user = req.user;
    const userId = user?.userId || user?.id || user?.sub || user?._id;

    if (!userId) {
      throw new BadRequestException('User not found in token.');
    }

    return String(userId);
  }

  /**
   * Upload CSV or JSON dataset file
   * Admin only endpoint
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDataset(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDatasetDto,
    @Req() req: ExpressRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const userId = this.getUserId(req);
    const dataset = await this.uploadsService.uploadDataset(
      file,
      userId,
      dto.boatType,
    );

    return {
      message: 'Dataset uploaded successfully',
      dataset: {
        id: dataset._id,
        filename: dataset.filename,
        boatType: dataset.boatType,
        uploadSource: dataset.uploadSource,
        status: dataset.status,
        rowCount: dataset.rowCount,
        processedCount: dataset.processedCount,
        errorCount: dataset.errorCount,
        validationErrors: dataset.validationErrors,
        createdAt: dataset.createdAt,
      },
    };
  }

  /**
   * Get pending datasets for admin review
   */
  @Get('pending')
  async getPendingDatasets() {
    const datasets = await this.uploadsService.getPendingDatasets();

    return {
      count: datasets.length,
      datasets: datasets.map((d) => ({
        id: d._id,
        filename: d.filename,
        boatType: d.boatType,
        uploadSource: d.uploadSource,
        rowCount: d.rowCount,
        processedCount: d.processedCount,
        errorCount: d.errorCount,
        validationErrors: d.validationErrors,
        uploaderId: d.uploaderId,
        createdAt: d.createdAt,
      })),
    };
  }

  /**
   * Get approved/trained datasets
   */
  @Get('approved')
  async getApprovedDatasets() {
    const datasets = await this.uploadsService.getApprovedDatasets();

    return {
      count: datasets.length,
      datasets: datasets.map((d) => ({
        id: d._id,
        filename: d.filename,
        boatType: d.boatType,
        status: d.status,
        rowCount: d.rowCount,
        processedCount: d.processedCount,
        reviewedAt: d.reviewedAt,
        syncedAt: d.syncedAt,
      })),
    };
  }

  /**
   * Get all datasets for specific boat type
   */
  @Get('boat-type/:boatType')
  async getDatasetsByBoatType(@Param('boatType') boatType: string) {
    const datasets = await this.uploadsService.getAllDatasets(boatType);

    return {
      boatType,
      count: datasets.length,
      datasets: datasets.map((d) => ({
        id: d._id,
        filename: d.filename,
        status: d.status,
        rowCount: d.rowCount,
        processedCount: d.processedCount,
        errorCount: d.errorCount,
        createdAt: d.createdAt,
        reviewedAt: d.reviewedAt,
      })),
    };
  }

  /**
   * Get single dataset details with records
   */
  @Get(':id')
  async getDatasetById(@Param('id') id: string) {
    const dataset = await this.uploadsService.getDatasetById(id);

    return {
      id: dataset._id,
      filename: dataset.filename,
      boatType: dataset.boatType,
      uploadSource: dataset.uploadSource,
      status: dataset.status,
      rowCount: dataset.rowCount,
      processedCount: dataset.processedCount,
      errorCount: dataset.errorCount,
      validationErrors: dataset.validationErrors,
      records: dataset.records,
      uploaderId: dataset.uploaderId,
      reviewerId: dataset.reviewerId,
      reviewReason: dataset.reviewReason,
      createdAt: dataset.createdAt,
      reviewedAt: dataset.reviewedAt,
      syncedAt: dataset.syncedAt,
    };
  }

  /**
   * Approve dataset for training
   */
  @Post(':id/approve')
  async approveDataset(
    @Param('id') id: string,
    @Body() dto: ApproveUploadDto,
    @Req() req: ExpressRequest,
  ) {
    const userId = this.getUserId(req);
    const dataset = await this.uploadsService.approveDataset(
      id,
      userId,
      dto.reason,
    );

    // Sync dataset CSV files to include approved uploads
    await this.candidatesService.syncDatasetCsvArtifacts();

    return {
      message: 'Dataset approved successfully and synced to training files',
      dataset: {
        id: dataset._id,
        status: dataset.status,
        processedCount: dataset.processedCount,
        errorCount: dataset.errorCount,
        reviewedAt: dataset.reviewedAt,
      },
    };
  }

  /**
   * Reject dataset
   */
  @Post(':id/reject')
  async rejectDataset(
    @Param('id') id: string,
    @Body() dto: RejectUploadDto,
    @Req() req: ExpressRequest,
  ) {
    const userId = this.getUserId(req);
    const dataset = await this.uploadsService.rejectDataset(
      id,
      userId,
      dto.reason,
    );

    return {
      message: 'Dataset rejected',
      dataset: {
        id: dataset._id,
        status: dataset.status,
        reason: dataset.reviewReason,
        rejectedAt: dataset.reviewedAt,
      },
    };
  }

  /**
   * Get dataset statistics
   */
  @Get('stats/all')
  async getDatasetStats() {
    const stats = await this.uploadsService.getDatasetStats();
    return stats;
  }
}
