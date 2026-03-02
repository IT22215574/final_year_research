import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Boat, BoatDocument } from '../schemas/boat.schema';

@Injectable()
export class BoatService {

  constructor(
    @InjectModel(Boat.name)
    private boatModel: Model<BoatDocument>
  ) {}

  async create(data: Partial<Boat>) {
    return this.boatModel.create(data);
  }

  async findById(id: string) {
    const boat = await this.boatModel.findById(id);
    if (!boat) throw new NotFoundException('Boat not found');
    return boat;
  }

  async updateFuelEfficiency(boatId: string, newFactor: number) {
    return this.boatModel.findByIdAndUpdate(
      boatId,
      { fuelEfficiencyFactor: newFactor },
      { new: true }
    );
  }

  // ✅ used by GET /boats/my
  async findMyBoats(userId: string) {
    return this.boatModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }
}