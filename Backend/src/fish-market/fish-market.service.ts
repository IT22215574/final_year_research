import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

import {
  FishMarketEntry,
  FishMarketEntryDocument,
} from '../schemas/fish-market-entry.schema';
import { CreateFishMarketEntryDto } from './dto/create-fish-market-entry.dto';
import { UpdateFishMarketEntryDto } from './dto/update-fish-market-entry.dto';

/** Returns UTC midnight for a given YYYY-MM-DD string or today. */
function toUtcMidnight(dateStr?: string): Date {
  if (dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Returns the UTC end-of-day (23:59:59.999) for comparison. */
function toUtcEndOfDay(date: Date): Date {
  return new Date(date.getTime() + 86_400_000 - 1);
}

@Injectable()
export class FishMarketService {
  constructor(
    @InjectModel(FishMarketEntry.name)
    private readonly model: Model<FishMarketEntryDocument>,
  ) {}

  // ─── CREATE ────────────────────────────────────────────────────────────────
  async create(
    dto: CreateFishMarketEntryDto,
    imageFiles: Express.Multer.File[],
  ): Promise<FishMarketEntryDocument> {
    if (!Types.ObjectId.isValid(dto.categoryId)) {
      throw new BadRequestException('Invalid categoryId');
    }

    const images = imageFiles.map((f) => `/uploads/fish-market/${f.filename}`);

    const marketDate = toUtcMidnight(dto.marketDate);

    const doc = new this.model({
      categoryId: new Types.ObjectId(dto.categoryId),
      grade: dto.grade.trim(),
      wholesalePrice: dto.wholesalePrice,
      price: dto.price,
      numberOfKilos: dto.numberOfKilos,
      catchingAreaName: dto.catchingAreaName.trim(),
      images,
      marketDate,
    });

    return (await doc.save()).populate('categoryId', 'name');
  }

  // ─── GET ALL (date-wise filtering) ─────────────────────────────────────────
  /**
   * Returns entries grouped by date.
   * `date`  → filter by exact YYYY-MM-DD
   * `from`/`to` → range filter
   * `categoryId` → filter by category
   */
  async findAll(filters: {
    date?: string;
    from?: string;
    to?: string;
    categoryId?: string;
  }): Promise<FishMarketEntryDocument[]> {
    const query: Record<string, any> = {};

    if (filters.date) {
      const start = toUtcMidnight(filters.date);
      query.marketDate = { $gte: start, $lte: toUtcEndOfDay(start) };
    } else if (filters.from || filters.to) {
      query.marketDate = {};
      if (filters.from) query.marketDate.$gte = toUtcMidnight(filters.from);
      if (filters.to)
        query.marketDate.$lte = toUtcEndOfDay(toUtcMidnight(filters.to));
    }

    if (filters.categoryId && Types.ObjectId.isValid(filters.categoryId)) {
      query.categoryId = new Types.ObjectId(filters.categoryId);
    }

    return this.model
      .find(query)
      .populate('categoryId', 'name')
      .sort({ marketDate: -1, createdAt: -1 })
      .exec();
  }

  // ─── GET AVAILABLE DATES ───────────────────────────────────────────────────
  /** Returns distinct marketDate values (sorted desc) — used for date navigation. */
  async getAvailableDates(): Promise<string[]> {
    const dates = await this.model.distinct('marketDate').exec();
    return (dates as Date[])
      .sort((a, b) => b.getTime() - a.getTime())
      .map((d) => (d as Date).toISOString().split('T')[0]);
  }

  // ─── GET ONE ───────────────────────────────────────────────────────────────
  async findOne(id: string): Promise<FishMarketEntryDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid entry id');
    }
    const doc = await this.model
      .findById(id)
      .populate('categoryId', 'name')
      .exec();
    if (!doc) throw new NotFoundException('Fish market entry not found');
    return doc;
  }

  // ─── UPDATE ────────────────────────────────────────────────────────────────
  async update(
    id: string,
    dto: UpdateFishMarketEntryDto,
    imageFiles: Express.Multer.File[],
    replaceImages: boolean,
  ): Promise<FishMarketEntryDocument> {
    const doc = await this.findOne(id);

    if (dto.categoryId !== undefined) {
      if (!Types.ObjectId.isValid(dto.categoryId))
        throw new BadRequestException('Invalid categoryId');
      doc.categoryId = new Types.ObjectId(dto.categoryId) as any;
    }
    if (dto.grade !== undefined) doc.grade = dto.grade.trim();
    if (dto.wholesalePrice !== undefined)
      doc.wholesalePrice = dto.wholesalePrice;
    if (dto.price !== undefined) doc.price = dto.price;
    if (dto.numberOfKilos !== undefined) doc.numberOfKilos = dto.numberOfKilos;
    if (dto.catchingAreaName !== undefined)
      doc.catchingAreaName = dto.catchingAreaName.trim();
    if (dto.marketDate !== undefined)
      doc.marketDate = toUtcMidnight(dto.marketDate);

    if (imageFiles.length > 0) {
      const newPaths = imageFiles.map(
        (f) => `/uploads/fish-market/${f.filename}`,
      );
      if (replaceImages) {
        doc.images.forEach((p) => this.deleteFile(p));
        doc.images = newPaths;
      } else {
        doc.images = [...doc.images, ...newPaths];
      }
    }

    await doc.save();
    return doc.populate('categoryId', 'name');
  }

  // ─── DELETE ────────────────────────────────────────────────────────────────
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const doc = await this.findOne(id);
    doc.images.forEach((p) => this.deleteFile(p));
    await doc.deleteOne();
    return { success: true, message: 'Fish market entry deleted successfully' };
  }

  // ─── PRIVATE ──────────────────────────────────────────────────────────────
  private deleteFile(urlPath: string) {
    try {
      const fsPath = path.join(process.cwd(), urlPath);
      if (fs.existsSync(fsPath)) fs.unlinkSync(fsPath);
    } catch {
      // non-critical
    }
  }
}
