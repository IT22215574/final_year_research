import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TripLog, TripLogDocument } from '../schemas/trip-log.schema';
import { CreateTripLogDto } from './dto/create-trip-log.dto';
import { UpdateTripLogDto } from './dto/update-trip-log.dto';

@Injectable()
export class TripLogService {
  constructor(
    @InjectModel(TripLog.name) private tripLogModel: Model<TripLogDocument>,
  ) {}

  async create(createTripLogDto: CreateTripLogDto): Promise<TripLog> {
    console.log('Creating trip log:', createTripLogDto);
    const createdTripLog = new this.tripLogModel(createTripLogDto);
    return createdTripLog.save();
  }

  async findAll(): Promise<TripLog[]> {
    return this.tripLogModel.find({ isActive: true }).exec();
  }

  async findByUser(userId: string): Promise<TripLog[]> {
    console.log('Finding trip logs for user:', userId);
    return this.tripLogModel
      .find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<TripLog> {
    const tripLog = await this.tripLogModel.findById(id).exec();
    if (!tripLog) {
      throw new NotFoundException(`Trip log with ID ${id} not found`);
    }
    return tripLog;
  }

  async update(
    id: string,
    updateTripLogDto: UpdateTripLogDto,
  ): Promise<TripLog> {
    console.log(`Updating trip log ${id}:`, updateTripLogDto);
    const updatedTripLog = await this.tripLogModel
      .findByIdAndUpdate(id, updateTripLogDto, { new: true })
      .exec();
    if (!updatedTripLog) {
      throw new NotFoundException(`Trip log with ID ${id} not found`);
    }
    return updatedTripLog;
  }

  async remove(id: string): Promise<TripLog> {
    console.log('Soft deleting trip log:', id);
    const deletedTripLog = await this.tripLogModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();
    if (!deletedTripLog) {
      throw new NotFoundException(`Trip log with ID ${id} not found`);
    }
    return deletedTripLog;
  }

  async getSummary(userId: string): Promise<any> {
    const tripLogs = await this.findByUser(userId);
    const totalTrips = tripLogs.length;
    const totalDistance = tripLogs.reduce(
      (sum, log) => sum + (log.distance || 0),
      0,
    );
    const totalFuelCost = tripLogs.reduce(
      (sum, log) => sum + (log.fuelCost || 0),
      0,
    );
    const totalCatchValue = tripLogs.reduce(
      (sum, log) => sum + (log.catchValue || 0),
      0,
    );

    return {
      totalTrips,
      totalDistance,
      totalFuelCost,
      totalCatchValue,
      averageDistance: totalTrips > 0 ? totalDistance / totalTrips : 0,
      averageFuelCost: totalTrips > 0 ? totalFuelCost / totalTrips : 0,
      averageCatchValue: totalTrips > 0 ? totalCatchValue / totalTrips : 0,
    };
  }
}
