import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

import {
  GradingRecord,
  GradingRecordDocument,
} from '../schemas/grading-record.schema';
import { CreateGradingRecordDto } from './dto/create-grading-record.dto';

@Injectable()
export class GradingRecordsService {
  constructor(
    @InjectModel(GradingRecord.name)
    private readonly model: Model<GradingRecordDocument>,
  ) {}

  /** Save a new grading result for the authenticated user */
  async create(
    userId: string,
    dto: CreateGradingRecordDto,
    imageFiles: Express.Multer.File[],
  ): Promise<GradingRecordDocument> {
    const imagePaths = imageFiles.map(
      (f) => `/uploads/grading-records/${f.filename}`,
    );

    const doc = new this.model({
      userId: new Types.ObjectId(userId),
      fishSpecies: dto.fishSpecies ?? '',
      fishName: dto.fishName ?? '',
      predictedGrade: dto.predictedGrade ?? '',
      gradeConfidence: dto.gradeConfidence,
      speciesConfidence: dto.speciesConfidence,
      imagePaths,
      notes: dto.notes ?? '',
      marketStatus: dto.marketStatus ?? 'saved',
      // ── Measurement & size classification fields ───────────────────────
      // These are stored for future reporting and analytics.
      // Old records without these fields remain valid (all optional in schema).
      measuredLengthCm: dto.measuredLengthCm,
      estimatedWeightKg: dto.estimatedWeightKg,
      estimatedWeightGrams: dto.estimatedWeightGrams,
      sizeCategory: dto.sizeCategory ?? null,
      measurementMethod: dto.measurementMethod ?? '',
      measurementConfidence: dto.measurementConfidence,
    });

    return doc.save();
  }

  /** Paginated history for the authenticated user — newest first */
  async findMyHistory(
    userId: string,
    limit = 20,
    skip = 0,
  ): Promise<GradingRecordDocument[]> {
    return this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  /** Get a single record — only the owner may read it */
  async findOne(id: string, userId: string): Promise<GradingRecordDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid grading record id');

    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Grading record not found');
    if (doc.userId.toString() !== userId)
      throw new ForbiddenException('Access denied');

    return doc;
  }

  /** Delete a record — only the owner may delete it */
  async remove(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const doc = await this.findOne(id, userId);

    // Clean up image files from disk
    for (const p of doc.imagePaths ?? []) {
      this.deleteFileIfExists(p);
    }

    await doc.deleteOne();
    return { success: true, message: 'Grading record deleted' };
  }

  // ── private ─────────────────────────────────────────────────────────────
  private deleteFileIfExists(urlPath: string) {
    try {
      const fsPath = path.join(process.cwd(), urlPath);
      if (fs.existsSync(fsPath)) fs.unlinkSync(fsPath);
    } catch {
      // non-critical
    }
  }
}
