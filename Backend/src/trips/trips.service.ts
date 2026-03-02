import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Request as ExpressRequest } from 'express';

import { Trip, TripDocument } from '../schemas/trip.schema';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { LogActualDto } from './dto/log-actual.dto';

import {
  TripCoefficient,
  TripCoefficientDocument,
} from 'src/schemas/trip-coefficient.schema';
import { Boat, BoatDocument } from 'src/schemas/boat.schema';

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Boat.name) private boatModel: Model<BoatDocument>,
    @InjectModel(TripCoefficient.name)
    private tripCoeffModel: Model<TripCoefficientDocument>,
  ) {}

  // Create new trip
  async create(
    userId: string,
    createTripDto: CreateTripDto,
  ): Promise<TripDocument> {
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
    return await this.tripModel.find().sort({ departureTime: -1 }).exec();
  }

  // Get single trip
  async findOne(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<TripDocument> {
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

  // Log actual data and update boat learning coefficient
  async logActualData(tripId: string, dto: LogActualDto, req: ExpressRequest) {
    const user = (req as any)?.user ?? {};
    const userId = user?.userId || user?.id || user?._id;

    if (!userId) throw new BadRequestException('Unauthorized');

    // ✅ safer: fetch trip then check owner (avoids type mismatch issues)
    const trip = await this.tripModel.findById(tripId).exec();
    if (!trip) throw new NotFoundException('Trip not found');

    if (String(trip.userId) !== String(userId)) {
      throw new ForbiddenException('Access denied');
    }

    if (trip.predictedFuelLiters == null) {
      throw new BadRequestException(
        'Trip has no prediction data to learn from.',
      );
    }

    const fuelPredictionError =
      dto.actualFuelLiters - Number(trip.predictedFuelLiters);

    // ✅ Update trip actuals first
    trip.actualFuelLiters = dto.actualFuelLiters;
    trip.actualCatchKg = dto.actualCatchKg;
    trip.fuelPredictionError = fuelPredictionError;
    await trip.save();

    // ✅ Boat learning requires boatId
    if (!trip.boatId) {
      return {
        trip,
        message:
          'Actual logged. Boat learning skipped (trip.boatId missing). Add boatId to Trip schema and store it when creating trips.',
      };
    }

    // ✅ NOW boat is declared
    const boat = await this.boatModel.findById(trip.boatId).exec();
    if (!boat) throw new NotFoundException('Boat not found');

    // ✅ update average prediction error (EMA)
    boat.averageFuelPredictionError =
      (boat.averageFuelPredictionError ?? 0) * 0.9 + fuelPredictionError * 0.1;

    const prevFactor = boat.fuelEfficiencyFactor ?? 1;

    // Learning: small adjustment based on relative error
    const learningRate = 0.02;
    const relError =
      fuelPredictionError / Math.max(Number(trip.predictedFuelLiters), 1);

    let newFactor = prevFactor * (1 + learningRate * relError);

    // clamp to avoid exploding
    newFactor = Math.max(0.7, Math.min(1.3, newFactor));

    boat.fuelEfficiencyFactor = newFactor;
    await boat.save();

    await this.tripCoeffModel.create({
      tripId: trip._id.toString(),
      boatId: boat._id.toString(),
      previousFuelEfficiencyFactor: prevFactor,
      updatedFuelEfficiencyFactor: newFactor,
      predictionError: fuelPredictionError,
      adjustmentApplied: newFactor - prevFactor,
    });

    return {
      trip,
      newCoefficients: {
        previousFuelEfficiencyFactor: prevFactor,
        updatedFuelEfficiencyFactor: newFactor,
        predictionError: fuelPredictionError,
        averageFuelPredictionError: boat.averageFuelPredictionError,
      },
    };
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

    const totalCost = trips.reduce(
      (sum, trip) => sum + (trip.totalCost || 0),
      0,
    );
    const totalFuelUsed = trips.reduce(
      (sum, trip) => sum + (trip.fuelUsedLiters || 0),
      0,
    );
    const totalDistance = trips.reduce(
      (sum, trip) => sum + (trip.distanceKm || 0),
      0,
    );

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
