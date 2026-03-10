import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  FishCategory,
  FishCategoryDocument,
} from '../schemas/fish-category.schema';
import { CreateFishCategoryDto } from './dto/create-fish-category.dto';
import { UpdateFishCategoryDto } from './dto/update-fish-category.dto';

@Injectable()
export class FishCategoryService {
  constructor(
    @InjectModel(FishCategory.name)
    private readonly model: Model<FishCategoryDocument>,
  ) {}

  async create(dto: CreateFishCategoryDto): Promise<FishCategoryDocument> {
    const existing = await this.model
      .findOne({ name: new RegExp(`^${dto.name.trim()}$`, 'i') })
      .exec();
    if (existing)
      throw new ConflictException(`Category "${dto.name}" already exists`);

    const doc = new this.model({ name: dto.name.trim() });
    return doc.save();
  }

  async findAll(search?: string): Promise<FishCategoryDocument[]> {
    const filter: Record<string, any> = {};
    if (search?.trim()) {
      filter.name = new RegExp(search.trim(), 'i');
    }
    return this.model.find(filter).sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<FishCategoryDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid fish category id');
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Fish category not found');
    return doc;
  }

  async update(
    id: string,
    dto: UpdateFishCategoryDto,
  ): Promise<FishCategoryDocument> {
    const doc = await this.findOne(id);
    if (dto.name !== undefined) doc.name = dto.name.trim();
    return doc.save();
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const doc = await this.findOne(id);
    await doc.deleteOne();
    return { success: true, message: 'Fish category deleted successfully' };
  }
}
