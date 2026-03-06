import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Boat, BoatDocument } from '../schemas/boat.schema';
import * as fs from 'fs';
import * as path from 'path';

import { BOAT_TYPES } from './dto/create-boat.dto';

@Injectable()
export class BoatService {
  constructor(
    @InjectModel(Boat.name)
    private boatModel: Model<BoatDocument>,
  ) {}

  getBoatTypes() {
    return BOAT_TYPES;
  }

  async create(data: Partial<Boat>) {
    if (!data.userId) throw new BadRequestException('userId is required');

    const boatName = String(data.boatName || '').trim();
    if (boatName.length < 2) {
      throw new BadRequestException('boatName is required (min 2 chars)');
    }

    const boatType = String(data.boatType || '');
    if (!boatType) throw new BadRequestException('boatType is required');

    if (!BOAT_TYPES.includes(boatType as any)) {
      throw new BadRequestException('Invalid boatType');
    }

    // FormData may send this as string, so convert
    const hp = Number((data as any).engineHorsePower);
    if (!Number.isFinite(hp) || hp <= 0) {
      throw new BadRequestException(
        'engineHorsePower must be a positive number',
      );
    }

    // Convert optional numeric fields safely
    const boatLengthRaw = (data as any).boatLength;
    const boatWidthRaw = (data as any).boatWidth;
    const boatValueRaw = (data as any).boatValue;

    const boatLength =
      boatLengthRaw !== undefined && boatLengthRaw !== ''
        ? Number(boatLengthRaw)
        : undefined;

    const boatWidth =
      boatWidthRaw !== undefined && boatWidthRaw !== ''
        ? Number(boatWidthRaw)
        : undefined;

    const boatValue =
      boatValueRaw !== undefined && boatValueRaw !== ''
        ? Number(boatValueRaw)
        : undefined;

    const toSave: Partial<Boat> = {
      ...data,
      boatName,
      boatType,
      engineHorsePower: hp,
      boatLength: Number.isFinite(boatLength as any) ? boatLength : undefined,
      boatWidth: Number.isFinite(boatWidth as any) ? boatWidth : undefined,
      boatValue: Number.isFinite(boatValue as any) ? boatValue : undefined,
      // boatImage already passed as "/uploads/boats/xxx" from controller
    };

    return this.boatModel.create(toSave);
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
      { new: true },
    );
  }

  async findMyBoats(userId: string) {
    return this.boatModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async deleteBoat(boatId: string, userId: string) {
    const boat = await this.boatModel.findById(boatId);
    if (!boat) throw new NotFoundException('Boat not found');

    if (String(boat.userId) !== String(userId)) {
      throw new ForbiddenException('You are not allowed to delete this boat');
    }

    if (boat.boatImage) {
      const relative = boat.boatImage.replace(/^\/uploads\//, '');
      const absolutePath = path.join(process.cwd(), 'uploads', relative);

      try {
        if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
      } catch (e: any) {
        console.error('Failed to delete boat image file:', e?.message || e);
      }
    }

    await this.boatModel.deleteOne({ _id: boatId });
    return { status: 'success', message: 'Boat deleted successfully' };
  }
}