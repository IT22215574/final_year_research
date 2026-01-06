import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExternalCost } from '../schemas/external-cost.schema';
import { CreateExternalCostDto } from './dto/create-external-cost.dto';
import { UpdateExternalCostDto } from './dto/update-external-cost.dto';

@Injectable()
export class ExternalCostService {
  constructor(
    @InjectModel(ExternalCost.name)
    private externalCostModel: Model<ExternalCost>,
  ) {}

  async create(
    createExternalCostDto: CreateExternalCostDto,
  ): Promise<ExternalCost> {
    const createdCost = new this.externalCostModel(createExternalCostDto);
    return createdCost.save();
  }

  async findAll(): Promise<ExternalCost[]> {
    return this.externalCostModel.find({ isActive: true }).exec();
  }

  async findByUser(userId: string): Promise<ExternalCost[]> {
    return this.externalCostModel
      .find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByTrip(tripId: string): Promise<ExternalCost[]> {
    return this.externalCostModel
      .find({ tripId, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<ExternalCost> {
    const cost = await this.externalCostModel.findById(id).exec();
    if (!cost) {
      throw new NotFoundException(`External cost with ID ${id} not found`);
    }
    return cost;
  }

  async update(
    id: string,
    updateExternalCostDto: UpdateExternalCostDto,
  ): Promise<ExternalCost> {
    const updatedCost = await this.externalCostModel
      .findByIdAndUpdate(id, updateExternalCostDto, { new: true })
      .exec();

    if (!updatedCost) {
      throw new NotFoundException(`External cost with ID ${id} not found`);
    }

    return updatedCost;
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const result = await this.externalCostModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();

    if (!result) {
      throw new NotFoundException(`External cost with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'External cost deleted successfully',
    };
  }

  async getSummary(userId: string): Promise<{
    totalCosts: number;
    count: number;
    byType: { [key: string]: number };
  }> {
    const costs = await this.findByUser(userId);

    const summary = {
      totalCosts: 0,
      count: costs.length,
      byType: {} as { [key: string]: number },
    };

    costs.forEach((cost) => {
      summary.totalCosts += cost.totalPrice;
      if (!summary.byType[cost.costType]) {
        summary.byType[cost.costType] = 0;
      }
      summary.byType[cost.costType] += cost.totalPrice;
    });

    return summary;
  }
}
