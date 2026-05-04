import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Boat, BoatDocument } from '../schemas/boat.schema';
import { BoatType, BoatTypeDocument } from '../schemas/boat-type.schema';
import { Trip, TripDocument } from '../schemas/trip.schema';
import * as fs from 'fs';
import * as path from 'path';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { BOAT_TYPES, BOAT_FUEL_BASELINES } from './dto/create-boat.dto';

@Injectable()
export class BoatService {
  constructor(
    @InjectModel(Boat.name)
    private boatModel: Model<BoatDocument>,

    @InjectModel(Trip.name)
    private tripModel: Model<TripDocument>,

    @InjectModel(BoatType.name)
    private boatTypeModel: Model<BoatTypeDocument>,

    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private normalizeBoatTypeName(name: string): string {
    return String(name || '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private async getAllowedBoatTypeNames(): Promise<string[]> {
    const adminTypes = await this.boatTypeModel
      .find({ active: true })
      .sort({ name: 1 })
      .lean()
      .exec();

    if (adminTypes.length > 0) {
      return adminTypes.map((t) => this.normalizeBoatTypeName(t.name));
    }

    // Safe fallback for environments where admin has not configured boat types yet.
    return [...BOAT_TYPES];
  }

  async getBoatTypes() {
    return await this.getAllowedBoatTypeNames();
  }

  getFuelBaselines() {
    return BOAT_FUEL_BASELINES;
  }

  async getBoatTypesWithFuelInfo() {
    const types = await this.getAllowedBoatTypeNames();
    return types.map((boatType) => ({
      boatType,
      fuelInfo: (BOAT_FUEL_BASELINES as any)[boatType] || null,
    }));
  }

  async getAdminBoatTypes() {
    return await this.boatTypeModel.find().sort({ name: 1 }).exec();
  }

  async createAdminBoatType(
    body: { name?: string; description?: string; fuelPerKm?: number },
    adminId: string,
  ) {
    const name = this.normalizeBoatTypeName(body?.name || '');
    if (!name) {
      throw new BadRequestException('Boat type name is required');
    }

    const exists = await this.boatTypeModel
      .findOne({ name: new RegExp(`^${name}$`, 'i') })
      .lean()
      .exec();

    if (exists) {
      throw new BadRequestException('Boat type already exists');
    }

    let fuelPerKm: number | undefined = undefined;
    if (body?.fuelPerKm !== undefined) {
      const parsed = Number(body.fuelPerKm);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new BadRequestException('fuelPerKm must be a positive number');
      }
      fuelPerKm = parsed;
    }

    return await this.boatTypeModel.create({
      name,
      description: body?.description?.trim() || undefined,
      fuelPerKm,
      active: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
  }

  async updateAdminBoatType(
    id: string,
    body: {
      name?: string;
      description?: string;
      fuelPerKm?: number;
      active?: boolean;
    },
    adminId: string,
  ) {
    const boatType = await this.boatTypeModel.findById(id).exec();
    if (!boatType) {
      throw new NotFoundException('Boat type not found');
    }

    if (body?.name !== undefined) {
      const name = this.normalizeBoatTypeName(body.name);
      if (!name) {
        throw new BadRequestException('Boat type name cannot be empty');
      }

      const duplicate = await this.boatTypeModel
        .findOne({ _id: { $ne: id }, name: new RegExp(`^${name}$`, 'i') })
        .lean()
        .exec();

      if (duplicate) {
        throw new BadRequestException('Boat type name already exists');
      }

      // Keep existing boats synchronized with the renamed type.
      if (boatType.name !== name) {
        await this.boatModel.updateMany(
          { boatType: boatType.name },
          { boatType: name },
        );
      }

      boatType.name = name;
    }

    if (body?.description !== undefined) {
      boatType.description = String(body.description || '').trim() || undefined;
    }

    if (body?.fuelPerKm !== undefined) {
      const parsed = Number(body.fuelPerKm);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new BadRequestException('fuelPerKm must be a positive number');
      }
      boatType.fuelPerKm = parsed;
    }

    if (body?.active !== undefined) {
      boatType.active = !!body.active;
    }

    boatType.updatedBy = adminId;
    await boatType.save();
    return boatType;
  }

  async deleteAdminBoatType(id: string) {
    const boatType = await this.boatTypeModel.findById(id).exec();
    if (!boatType) {
      throw new NotFoundException('Boat type not found');
    }

    const usageCount = await this.boatModel.countDocuments({
      boatType: boatType.name,
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        'Cannot delete boat type that is already used by boats. Set it inactive instead.',
      );
    }

    await boatType.deleteOne();
    return { message: 'Boat type deleted successfully' };
  }

  async create(data: Partial<Boat>) {
    if (!data.userId) {
      throw new BadRequestException('userId is required');
    }

    const boatName = String(data.boatName || '').trim();
    if (boatName.length < 2) {
      throw new BadRequestException('boatName is required (min 2 chars)');
    }

    const boatType = String(data.boatType || '').trim();
    if (!boatType) {
      throw new BadRequestException('boatType is required');
    }

    const allowedBoatTypes = await this.getAllowedBoatTypeNames();
    if (!allowedBoatTypes.includes(boatType)) {
      throw new BadRequestException('Invalid boatType');
    }

    const engineHorsePower = this.parseRequiredPositiveNumber(
      (data as any).engineHorsePower,
      'engineHorsePower',
    );

    const boatLength = this.parseOptionalNumber((data as any).boatLength);
    const boatWidth = this.parseOptionalNumber((data as any).boatWidth);
    const boatValue = this.parseOptionalNumber((data as any).boatValue);

    const fuelEfficiencyFactor = this.parseOptionalNumber(
      (data as any).fuelEfficiencyFactor,
    );
    const engineDegradationFactor = this.parseOptionalNumber(
      (data as any).engineDegradationFactor,
    );
    const averageFuelPredictionError = this.parseOptionalNumber(
      (data as any).averageFuelPredictionError,
    );

    const toSave: Partial<Boat> = {
      ...data,
      boatName,
      boatType,
      engineHorsePower,
      boatLength,
      boatWidth,
      boatValue,
      fuelEfficiencyFactor,
      engineDegradationFactor,
      averageFuelPredictionError,
    };

    return this.boatModel.create(toSave);
  }

  async findById(id: string) {
    const boat = await this.boatModel.findById(id).exec();
    if (!boat) throw new NotFoundException('Boat not found');
    return boat;
  }

  async findOneForUser(boatId: string, userId: string) {
    const boat = await this.boatModel.findById(boatId).exec();

    if (!boat) {
      throw new NotFoundException('Boat not found');
    }

    if (String(boat.userId) !== String(userId)) {
      throw new ForbiddenException('You are not allowed to access this boat');
    }

    return boat;
  }

  async findMyBoats(userId: string) {
    return this.boatModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findAllBoats() {
    return this.boatModel.find().sort({ createdAt: -1 }).exec();
  }

  async updateBoat(boatId: string, userId: string, data: Partial<Boat>) {
    const boat = await this.boatModel.findById(boatId).exec();

    if (!boat) {
      throw new NotFoundException('Boat not found');
    }

    if (String(boat.userId) !== String(userId)) {
      throw new ForbiddenException('You are not allowed to update this boat');
    }

    const updateData: Partial<Boat> = {};

    if (data.boatName !== undefined) {
      const boatName = String(data.boatName).trim();
      if (boatName.length < 2) {
        throw new BadRequestException('boatName must be at least 2 characters');
      }
      updateData.boatName = boatName;
    }

    if (data.boatType !== undefined) {
      const boatType = String(data.boatType).trim();
      const allowedBoatTypes = await this.getAllowedBoatTypeNames();
      if (!allowedBoatTypes.includes(boatType)) {
        throw new BadRequestException('Invalid boatType');
      }
      updateData.boatType = boatType as any;
    }

    if ((data as any).engineHorsePower !== undefined) {
      updateData.engineHorsePower = this.parseRequiredPositiveNumber(
        (data as any).engineHorsePower,
        'engineHorsePower',
      );
    }

    if ((data as any).boatLength !== undefined) {
      updateData.boatLength = this.parseOptionalNumber(
        (data as any).boatLength,
      );
    }

    if ((data as any).boatWidth !== undefined) {
      updateData.boatWidth = this.parseOptionalNumber((data as any).boatWidth);
    }

    if ((data as any).boatValue !== undefined) {
      updateData.boatValue = this.parseOptionalNumber((data as any).boatValue);
    }

    if ((data as any).fuelEfficiencyFactor !== undefined) {
      updateData.fuelEfficiencyFactor = this.parseOptionalNumber(
        (data as any).fuelEfficiencyFactor,
      );
    }

    if ((data as any).engineDegradationFactor !== undefined) {
      updateData.engineDegradationFactor = this.parseOptionalNumber(
        (data as any).engineDegradationFactor,
      );
    }

    if ((data as any).averageFuelPredictionError !== undefined) {
      updateData.averageFuelPredictionError = this.parseOptionalNumber(
        (data as any).averageFuelPredictionError,
      );
    }

    if ((data as any).mode !== undefined) {
      updateData.mode = (data as any).mode;
    }

    if ((data as any).boatImage !== undefined) {
      if (boat.boatImage && boat.boatImage !== (data as any).boatImage) {
        this.deleteImageFileSafely(boat.boatImage);
      }
      updateData.boatImage = (data as any).boatImage;
    }

    const updated = await this.boatModel
      .findByIdAndUpdate(boatId, updateData, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Boat not found after update');
    }

    return updated;
  }

  async updateFuelEfficiency(boatId: string, newFactor: number) {
    return this.boatModel.findByIdAndUpdate(
      boatId,
      { fuelEfficiencyFactor: newFactor },
      { new: true },
    );
  }

  async deleteBoat(boatId: string, userId: string) {
    const boat = await this.boatModel.findById(boatId).exec();

    if (!boat) {
      throw new NotFoundException('Boat not found');
    }

    if (String(boat.userId) !== String(userId)) {
      throw new ForbiddenException('You are not allowed to delete this boat');
    }

    const linkedTripsCount = await this.tripModel.countDocuments({
      boatId: boat._id,
    });

    if (linkedTripsCount > 0) {
      throw new BadRequestException(
        'Cannot delete this boat because trips are already linked to it',
      );
    }

    if (boat.boatImage) {
      this.deleteImageFileSafely(boat.boatImage);
    }

    await this.boatModel.deleteOne({ _id: boatId }).exec();

    return {
      status: 'success',
      message: 'Boat deleted successfully',
    };
  }

  async getBoatLearningInsights(boatId: string, userId: string) {
    const boat = await this.boatModel.findById(boatId).exec();
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
          message:
            'Advanced learning insights not available. ML service unavailable.',
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

  async getBoatPredictionHistory(boatId: string, userId: string, days = 30) {
    const boat = await this.boatModel.findById(boatId).exec();
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

  private parseRequiredPositiveNumber(value: any, fieldName: string): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive number`);
    }

    return parsed;
  }

  private parseOptionalNumber(value: any): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`Invalid numeric value: ${value}`);
    }

    return parsed;
  }

  private deleteImageFileSafely(boatImagePath: string) {
    const relative = boatImagePath.replace(/^\/uploads\//, '');
    const absolutePath = path.join(process.cwd(), 'uploads', relative);

    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (e: any) {
      console.error('Failed to delete boat image file:', e?.message || e);
    }
  }
}
