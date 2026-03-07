import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Request as ExpressRequest } from 'express';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { Trip, TripDocument } from '../schemas/trip.schema';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { LogActualDto } from './dto/log-actual.dto';

import {
  TripCoefficient,
  TripCoefficientDocument,
} from 'src/schemas/trip-coefficient.schema';
import { Boat, BoatDocument } from 'src/schemas/boat.schema';
import { UpdateActualsDto } from './dto/update-actuals.dto';

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Boat.name) private boatModel: Model<BoatDocument>,
    @InjectModel(TripCoefficient.name)
    private tripCoeffModel: Model<TripCoefficientDocument>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
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

  async getLearningSummary() {
    const baseUrl =
      this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:5001';

    try {
      const response = await firstValueFrom(
        this.http.get(`${baseUrl}/learning/summary`),
      );

      return response.data;
    } catch (e: any) {
      throw new BadRequestException(
        e?.response?.data?.detail || 'Failed to fetch learning summary',
      );
    }
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

  // Enhanced log actual data with advanced boat learning
  async logActualData(tripId: string, dto: LogActualDto, req: ExpressRequest) {
    const user = (req as any)?.user ?? {};
    const userId = user?.userId || user?.id || user?._id;

    if (!userId) throw new BadRequestException('Unauthorized');

    // Fetch trip and validate ownership
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

    // Update trip actuals
    trip.actualFuelLiters = dto.actualFuelLiters;
    trip.actualCatchKg = dto.actualCatchKg;
    trip.fuelPredictionError = fuelPredictionError;
    await trip.save();

    // Boat learning requires boatId
    if (!trip.boatId) {
      return {
        trip,
        message: 'Actual logged. Boat learning skipped (trip.boatId missing).',
      };
    }

    const boat = await this.boatModel.findById(trip.boatId).exec();
    if (!boat) throw new NotFoundException('Boat not found');

    // Enhanced learning using Python ML service
    const baseUrl =
      this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:5001';

    let learningResult = null;
    let mlLearningFallback = false;

    try {
      // Call enhanced Python learning service with context
      const learningResponse = await firstValueFrom(
        this.http.post(`${baseUrl}/learning/update`, {
          boatId: String(trip.boatId),
          predictedFuelLiters: Number(trip.predictedFuelLiters),
          actualFuelLiters: dto.actualFuelLiters,
          speed: trip.averageSpeed || trip.speed || 10,
          weatherSeverityIndex: trip.weatherSeverityIndex || 0,
          distanceKm: trip.distanceKm || 0,
          engineHP: boat.engineHorsePower || 85,
          fishingHours: trip.fishingHours || 8,
        }),
      );

      learningResult = learningResponse.data;

      // Update boat with new coefficients from ML service
      if (learningResult?.updatedCoefficients) {
        boat.fuelEfficiencyFactor =
          learningResult.updatedCoefficients.fuelEfficiencyFactor;
        boat.engineDegradationFactor =
          learningResult.updatedCoefficients.engineDegradationFactor;
        boat.averageFuelPredictionError = Math.abs(
          learningResult.predictionError,
        );
      }
    } catch (e: any) {
      mlLearningFallback = true;
      console.log(
        'ML learning service error:',
        e?.response?.status,
        e?.response?.data || e?.message,
      );

      // Fallback to simple learning
      boat.averageFuelPredictionError =
        (boat.averageFuelPredictionError ?? 0) * 0.9 +
        Math.abs(fuelPredictionError) * 0.1;

      const prevFactor = boat.fuelEfficiencyFactor ?? 1;
      const learningRate = 0.02;
      const relError =
        fuelPredictionError / Math.max(Number(trip.predictedFuelLiters), 1);

      let newFactor = prevFactor * (1 + learningRate * relError);
      newFactor = Math.max(0.7, Math.min(1.3, newFactor));

      boat.fuelEfficiencyFactor = newFactor;
    }

    await boat.save();

    // Log coefficient update for tracking
    await this.tripCoeffModel.create({
      tripId: trip._id.toString(),
      boatId: boat._id.toString(),
      previousFuelEfficiencyFactor:
        learningResult?.updatedCoefficients?.fuelEfficiencyFactor ||
        boat.fuelEfficiencyFactor,
      updatedFuelEfficiencyFactor:
        learningResult?.updatedCoefficients?.fuelEfficiencyFactor ||
        boat.fuelEfficiencyFactor,
      predictionError: fuelPredictionError,
      adjustmentApplied: learningResult?.relativePredictionError || 0,
      mlLearningUsed: !mlLearningFallback,
    });

    const response = {
      trip,
      learningCompleted: true,
      mlLearningFallback,
    };

    if (learningResult && !mlLearningFallback) {
      // Enhanced response with ML insights
      response['advancedLearning'] = {
        boatLearningInsights: learningResult.boatLearningInsights,
        updatedCoefficients: learningResult.updatedCoefficients,
        learningMetrics: learningResult.learningMetrics,
        predictionError: learningResult.predictionError,
        relativePredictionError: learningResult.relativePredictionError,
      };
    } else {
      // Simple fallback response
      response['simpleLearning'] = {
        previousFuelEfficiencyFactor: boat.fuelEfficiencyFactor,
        updatedFuelEfficiencyFactor: boat.fuelEfficiencyFactor,
        predictionError: fuelPredictionError,
        averageFuelPredictionError: boat.averageFuelPredictionError,
      };
    }

    return response;
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

  async updateActuals(id: string, dto: UpdateActualsDto) {
    const updated = await this.tripModel.findByIdAndUpdate(
      id,
      { $set: { fuelUsedLiters: dto.fuelUsedLiters } },
      { new: true },
    );

    if (!updated) throw new NotFoundException('Trip not found');
    return updated;
  }

  // Get all trips count
  async getTotalTripsCount(): Promise<number> {
    return await this.tripModel.countDocuments().exec();
  }
}
