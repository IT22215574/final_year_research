import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trip, TripDocument } from '../schemas/trip.schema';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
  ) {}

  // Create new trip
  async create(userId: string, createTripDto: CreateTripDto): Promise<TripDocument> {
    const newTrip = new this.tripModel({
      ...createTripDto,
      userId,
    });
    
    return await newTrip.save();
  }

  // Get all trips for a specific user
  async findByUser(userId: string): Promise<TripDocument[]> {
    return await this.tripModel
      .find({ userId })
      .sort({ departureTime: -1 })
      .exec();
  }

  // Get all trips (admin only)
  async findAll(): Promise<TripDocument[]> {
    return await this.tripModel
      .find()
      .sort({ departureTime: -1 })
      .exec();
  }

  // Get single trip
  async findOne(id: string, userId: string, isAdmin: boolean): Promise<TripDocument> {
    const trip = await this.tripModel.findById(id).exec();
    
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Check authorization
    if (!isAdmin && trip.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return trip;
  }

  // Update trip
  async update(
    id: string,
    userId: string,
    isAdmin: boolean,
    updateTripDto: UpdateTripDto,
  ): Promise<TripDocument> {
    const trip = await this.findOne(id, userId, isAdmin);

    Object.assign(trip, updateTripDto);
    return await trip.save();
  }

  // Delete trip
  async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const trip = await this.findOne(id, userId, isAdmin);
    await trip.deleteOne();
  }

  // Get trip statistics for user
  async getUserStats(userId: string) {
    const trips = await this.findByUser(userId);
    
    if (trips.length === 0) {
      return {
        totalTrips: 0,
        totalCost: 0,
        averageCost: 0,
        totalFuelUsed: 0,
        totalDistance: 0,
      };
    }

    const totalCost = trips.reduce((sum, trip) => sum + (trip.totalCost || 0), 0);
    const totalFuelUsed = trips.reduce((sum, trip) => sum + (trip.fuelUsedLiters || 0), 0);
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.distanceKm || 0), 0);

    return {
      totalTrips: trips.length,
      totalCost: Math.round(totalCost * 100) / 100,
      averageCost: Math.round((totalCost / trips.length) * 100) / 100,
      totalFuelUsed: Math.round(totalFuelUsed * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100,
    };
  }

  // Get all trips count
  async getTotalTripsCount(): Promise<number> {
    return await this.tripModel.countDocuments().exec();
  }
}