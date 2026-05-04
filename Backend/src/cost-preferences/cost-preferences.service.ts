import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  CostPreference,
  CostPreferenceDocument,
} from '../schemas/cost-preference.schema';
import { CreateCostPreferenceDto } from './dto/create-cost-preference.dto';
import { UpdateCostPreferenceDto } from './dto/update-cost-preference.dto';

@Injectable()
export class CostPreferencesService {
  constructor(
    @InjectModel(CostPreference.name)
    private readonly costPreferenceModel: Model<CostPreferenceDocument>,
  ) {}

  private toBoolean(value?: string): boolean | undefined {
    if (value === undefined) return undefined;
    return value === 'true';
  }

  private buildCreatePayload(userId: string, dto: CreateCostPreferenceDto) {
    return {
      userId,
      name: dto.name?.trim(),
      category: dto.category?.trim(),
      amount: Number(dto.amount),
      description: dto.description?.trim() || '',
      isActive:
        dto.isActive !== undefined ? this.toBoolean(dto.isActive) : true,
      autoApply:
        dto.autoApply !== undefined ? this.toBoolean(dto.autoApply) : true,
    };
  }

  private buildUpdatePayload(dto: UpdateCostPreferenceDto) {
    const updateData: Record<string, any> = {};

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.category !== undefined) updateData.category = dto.category.trim();
    if (dto.amount !== undefined) updateData.amount = Number(dto.amount);
    if (dto.description !== undefined)
      updateData.description = dto.description.trim();
    if (dto.isActive !== undefined)
      updateData.isActive = this.toBoolean(dto.isActive);
    if (dto.autoApply !== undefined)
      updateData.autoApply = this.toBoolean(dto.autoApply);

    return updateData;
  }

  async create(userId: string, dto: CreateCostPreferenceDto) {
    const payload = this.buildCreatePayload(userId, dto);
    const created = await this.costPreferenceModel.create(payload);
    return created;
  }

  async findAllForUser(userId: string) {
    return this.costPreferenceModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findActiveAutoApplyForUser(userId: string) {
    return this.costPreferenceModel
      .find({
        userId,
        isActive: true,
        autoApply: true,
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findOneForUser(userId: string, id: string) {
    const item = await this.costPreferenceModel
      .findOne({ _id: id, userId })
      .lean();

    if (!item) {
      throw new NotFoundException('Cost preference not found');
    }

    return item;
  }

  async update(userId: string, id: string, dto: UpdateCostPreferenceDto) {
    const updateData = this.buildUpdatePayload(dto);

    const updated = await this.costPreferenceModel
      .findOneAndUpdate({ _id: id, userId }, updateData, {
        new: true,
        runValidators: true,
      })
      .lean();

    if (!updated) {
      throw new NotFoundException('Cost preference not found');
    }

    return updated;
  }

  async remove(userId: string, id: string) {
    const deleted = await this.costPreferenceModel
      .findOneAndDelete({ _id: id, userId })
      .lean();

    if (!deleted) {
      throw new NotFoundException('Cost preference not found');
    }

    return {
      message: 'Cost preference deleted successfully',
      deletedId: id,
    };
  }

  async toggleActive(userId: string, id: string) {
    const current = await this.costPreferenceModel.findOne({ _id: id, userId });

    if (!current) {
      throw new NotFoundException('Cost preference not found');
    }

    current.isActive = !current.isActive;
    await current.save();

    return current.toObject();
  }
}
