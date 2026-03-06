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
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { BOAT_TYPES } from './dto/create-boat.dto';

@Injectable()
export class BoatService {
  constructor(
    @InjectModel(Boat.name)
    private boatModel: Model<BoatDocument>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
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

  // Get boat learning insights from Python ML service  
  async getBoatLearningInsights(boatId: string, userId: string) {
    // Verify boat ownership
    const boat = await this.boatModel.findById(boatId);
    if (!boat) throw new NotFoundException('Boat not found');

    if (String(boat.userId) !== String(userId)) {
      throw new ForbiddenException('Access denied to this boat');
    }

    const baseUrl =
      this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:5001';

    try {
      const response = await firstValueFrom(
        this.http.get(`${baseUrl}/boat-insights/${boatId}`),
      );

      return {
        boatInfo: {
          _id: boat._id,
          boatName: boat.boatName,
          boatType: boat.boatType,
          engineHorsePower: boat.engineHorsePower,
        },
        learningInsights: response.data,
        currentCoefficients: {
          fuelEfficiencyFactor: boat.fuelEfficiencyFactor,
          engineDegradationFactor: boat.engineDegradationFactor,
          averageFuelPredictionError: boat.averageFuelPredictionError,
        },
      };
    } catch (e: any) {
      console.log('ML insights error:', e?.response?.data || e?.message);
      
      return {
        boatInfo: {
          _id: boat._id,
          boatName: boat.boatName,
          boatType: boat.boatType,
          engineHorsePower: boat.engineHorsePower,
        },
        learningInsights: {
          message: 'Advanced learning insights not available. ML service unavailable.',
          basicInfo: {
            totalTrips: 'Available in backend trip records',
            currentFuelEfficiencyFactor: boat.fuelEfficiencyFactor || 1.0,
            averageError: boat.averageFuelPredictionError || 0,
          },
        },
        mlServiceError: true,
      };
    }
  }

  // Get boat prediction history from Python ML service
  async getBoatPredictionHistory(boatId: string, userId: string, days = 30) {
    // Verify boat ownership
    const boat = await this.boatModel.findById(boatId);
    if (!boat) throw new NotFoundException('Boat not found');

    if (String(boat.userId) !== String(userId)) {
      throw new ForbiddenException('Access denied to this boat');
    }

    const baseUrl =
      this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:5001';

    try {
      const response = await firstValueFrom(
        this.http.get(`${baseUrl}/boat-history/${boatId}?days=${days}`),
      );

      return {
        boatId,
        days,
        history: response.data,
        totalEntries: Array.isArray(response.data) ? response.data.length : 0,
      };
    } catch (e: any) {
      console.log('ML history error:', e?.response?.data || e?.message);
      
      return {
        boatId,
        days,
        history: [],
        totalEntries: 0,
        message: 'Prediction history not available. ML service unavailable.',
        mlServiceError: true,
      };
    }
  }
}