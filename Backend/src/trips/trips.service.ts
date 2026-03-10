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
import { BatchTrainDto } from './dto/batch-train.dto';

import {
  TripCoefficient,
  TripCoefficientDocument,
} from '../schemas/trip-coefficient.schema';
import { Boat, BoatDocument } from '../schemas/boat.schema';
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

  // =========================
  // CREATE TRIP
  // =========================
  async create(
    userId: string,
    createTripDto: CreateTripDto,
  ): Promise<TripDocument> {
    if (createTripDto.boatId) {
      const boat = await this.boatModel.findById(createTripDto.boatId).exec();

      if (!boat) {
        throw new NotFoundException('Boat not found');
      }

      if (String(boat.userId) !== String(userId)) {
        throw new ForbiddenException(
          'You are not allowed to create a trip with this boat',
        );
      }
    }

    const newTrip = new this.tripModel({
      ...createTripDto,
      userId,
      status: createTripDto.status || 'planned',
      mode: createTripDto.mode || 'island',
      predictedExternalCosts: createTripDto.predictedExternalCosts || [],
      predictedExternalCostTotal: createTripDto.predictedExternalCostTotal || 0,
      optimizationRecommendations:
        createTripDto.optimizationRecommendations || [],
    });

    return await newTrip.save();
  }

  // =========================
  // LEARNING SUMMARY
  // =========================
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

  // =========================
  // FIND BY USER
  // =========================
  async findByUser(userId: string): Promise<TripDocument[]> {
    return await this.tripModel
      .find({ userId })
      .sort({ departureTime: -1 })
      .exec();
  }

  // =========================
  // FIND ALL
  // =========================
  async findAll(): Promise<TripDocument[]> {
    return await this.tripModel.find().sort({ departureTime: -1 }).exec();
  }

  // =========================
  // FIND ONE
  // =========================
  async findOne(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<TripDocument> {
    const trip = await this.tripModel.findById(id).exec();

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (!isAdmin && String(trip.userId) !== String(userId)) {
      throw new ForbiddenException('Access denied');
    }

    return trip;
  }

  // =========================
  // UPDATE TRIP
  // =========================
  async update(
    id: string,
    userId: string,
    isAdmin: boolean,
    updateTripDto: UpdateTripDto,
  ): Promise<TripDocument> {
    const trip = await this.findOne(id, userId, isAdmin);

    if (updateTripDto.boatId) {
      const boat = await this.boatModel.findById(updateTripDto.boatId).exec();

      if (!boat) {
        throw new NotFoundException('Boat not found');
      }

      if (String(boat.userId) !== String(trip.userId)) {
        throw new ForbiddenException(
          'You are not allowed to assign this boat to the trip',
        );
      }
    }

    Object.assign(trip, {
      ...updateTripDto,
      ...(updateTripDto.predictedExternalCosts
        ? { predictedExternalCosts: updateTripDto.predictedExternalCosts }
        : {}),
      ...(updateTripDto.optimizationRecommendations
        ? {
            optimizationRecommendations:
              updateTripDto.optimizationRecommendations,
          }
        : {}),
    });

    return await trip.save();
  }

  // =========================
  // DELETE TRIP
  // =========================
  async remove(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<{ message: string }> {
    const trip = await this.findOne(id, userId, isAdmin);
    await trip.deleteOne();

    return { message: 'Trip deleted successfully' };
  }

  // =========================
  // LOG ACTUAL DATA + COMPARISON + LEARNING
  // =========================
  async logActualData(tripId: string, dto: LogActualDto, req: ExpressRequest) {
    const user = (req as any)?.user ?? {};
    const userId = user?.userId || user?.id || user?._id || user?.sub;

    if (!userId) {
      throw new BadRequestException('Unauthorized');
    }

    const trip = await this.tripModel.findById(tripId).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (String(trip.userId) !== String(userId)) {
      throw new ForbiddenException('Access denied');
    }

    if (trip.predictedFuelLiters == null) {
      throw new BadRequestException(
        'Trip has no prediction data to compare against.',
      );
    }

    const actualFuelCost =
      dto.actualFuelCost ??
      Number(dto.actualFuelLiters || 0) * Number(trip.fuelPricePerLiter || 0);

    const actualOperationalCost =
      dto.actualOperationalCost ?? Number(trip.predictedOperationalCost || 0);

    const actualExternalCosts = dto.actualExternalCosts || [];
    const actualExternalCostTotal = actualExternalCosts.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const actualRevenue =
      dto.actualRevenue ??
      Number(dto.actualCatchKg || 0) * Number(trip.marketPrice || 0);

    const actualTotalCost =
      Number(actualFuelCost) +
      Number(actualOperationalCost) +
      Number(actualExternalCostTotal);

    const actualProfit = Number(actualRevenue) - Number(actualTotalCost);

    const fuelDifference =
      Number(dto.actualFuelLiters) - Number(trip.predictedFuelLiters || 0);

    const totalCostDifference =
      Number(actualTotalCost) - Number(trip.predictedTotalCost || 0);

    const externalCostDifference =
      Number(actualExternalCostTotal) -
      Number(trip.predictedExternalCostTotal || 0);

    const predictedProfitBaseline =
      Number(actualRevenue) - Number(trip.predictedTotalCost || 0);

    const profitDifference = Number(actualProfit) - predictedProfitBaseline;

    const fuelPredictionError =
      Number(trip.predictedFuelLiters || 0) > 0
        ? (fuelDifference / Number(trip.predictedFuelLiters || 1)) * 100
        : 0;

    trip.actualFuelLiters = dto.actualFuelLiters;
    trip.actualCatchKg = dto.actualCatchKg;
    trip.actualFuelCost = actualFuelCost;
    trip.actualOperationalCost = actualOperationalCost;
    trip.actualExternalCosts = actualExternalCosts;
    trip.actualExternalCostTotal = actualExternalCostTotal;
    trip.actualTotalCost = actualTotalCost;
    trip.actualRevenue = actualRevenue;
    trip.actualProfit = actualProfit;
    trip.actualLoggedAt = new Date();
    trip.actualNotes = dto.actualNotes;

    trip.fuelPredictionError = fuelPredictionError;
    trip.fuelDifference = fuelDifference;
    trip.totalCostDifference = totalCostDifference;
    trip.externalCostDifference = externalCostDifference;
    trip.profitDifference = profitDifference;

    trip.status = 'completed';

    await trip.save();

    if (!trip.boatId) {
      return {
        trip,
        comparison: {
          fuelDifference,
          totalCostDifference,
          externalCostDifference,
          profitDifference,
          fuelPredictionError,
        },
        message: 'Actual logged. Boat learning skipped (trip.boatId missing).',
      };
    }

    const boat = await this.boatModel.findById(trip.boatId).exec();
    if (!boat) {
      throw new NotFoundException('Boat not found');
    }

    const baseUrl =
      this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:5001';

    let learningResult = null;
    let mlLearningFallback = false;

    const previousFuelEfficiencyFactor = boat.fuelEfficiencyFactor ?? 1;

    try {
      const learningResponse = await firstValueFrom(
        this.http.post(`${baseUrl}/learning/update`, {
          boatId: String(trip.boatId),
          predictedFuelLiters: Number(trip.predictedFuelLiters || 0),
          actualFuelLiters: dto.actualFuelLiters,
          speed: trip.averageSpeed || trip.speed || 10,
          weatherSeverityIndex: trip.weatherSeverityIndex || 0,
          distanceKm: trip.distanceKm || 0,
          engineHP: boat.engineHorsePower || 85,
          fishingHours: trip.fishingHours || 8,
          numberOfDays: trip.numberOfDays || 1,
        }),
      );

      learningResult = learningResponse.data;

      if (learningResult?.updatedCoefficients) {
        boat.fuelEfficiencyFactor =
          learningResult.updatedCoefficients.fuelEfficiencyFactor;
        boat.engineDegradationFactor =
          learningResult.updatedCoefficients.engineDegradationFactor;
        boat.averageFuelPredictionError = Math.abs(
          learningResult.predictionError ?? fuelPredictionError,
        );
      }
    } catch (e: any) {
      mlLearningFallback = true;
      console.log(
        'ML learning service error:',
        e?.response?.status,
        e?.response?.data || e?.message,
      );

      boat.averageFuelPredictionError =
        (boat.averageFuelPredictionError ?? 0) * 0.9 +
        Math.abs(fuelPredictionError) * 0.1;

      const prevFactor = boat.fuelEfficiencyFactor ?? 1;
      const learningRate = 0.02;
      const relError =
        fuelDifference / Math.max(Number(trip.predictedFuelLiters || 1), 1);

      let newFactor = prevFactor * (1 + learningRate * relError);
      newFactor = Math.max(0.7, Math.min(1.3, newFactor));

      boat.fuelEfficiencyFactor = newFactor;
    }

    const updatedFuelEfficiencyFactor = boat.fuelEfficiencyFactor ?? 1;

    await boat.save();

    await this.tripCoeffModel.create({
      tripId: trip._id.toString(),
      boatId: boat._id.toString(),
      previousFuelEfficiencyFactor,
      updatedFuelEfficiencyFactor,
      predictionError: fuelPredictionError,
      adjustmentApplied: learningResult?.relativePredictionError || 0,
      mlLearningUsed: !mlLearningFallback,
    });

    const response: any = {
      trip,
      learningCompleted: true,
      mlLearningFallback,
      comparison: {
        fuelDifference,
        totalCostDifference,
        externalCostDifference,
        profitDifference,
        fuelPredictionError,
      },
    };

    if (learningResult && !mlLearningFallback) {
      response.advancedLearning = {
        boatLearningInsights: learningResult.boatLearningInsights,
        updatedCoefficients: learningResult.updatedCoefficients,
        learningMetrics: learningResult.learningMetrics,
        predictionError: learningResult.predictionError,
        relativePredictionError: learningResult.relativePredictionError,
      };
    } else {
      response.simpleLearning = {
        previousFuelEfficiencyFactor,
        updatedFuelEfficiencyFactor,
        predictionError: fuelPredictionError,
        averageFuelPredictionError: boat.averageFuelPredictionError,
      };
    }

    return response;
  }

  // =========================
  // BATCH TRAIN TRIPS
  // =========================
  async batchTrainTrips(userId: string, dto: BatchTrainDto) {
    // Fetch selected trips
    const trips = await this.tripModel
      .find({
        _id: { $in: dto.tripIds },
        userId: userId, // Security: only user's trips
        actualFuelLiters: { $exists: true }, // Only logged trips
      })
      .exec();

    if (!trips.length) {
      throw new BadRequestException(
        'No valid trips found for training. Ensure trips have actual data logged.',
      );
    }

    // Filter by boatId if specified
    const filteredTrips = dto.boatId
      ? trips.filter((trip) => String(trip.boatId) === String(dto.boatId))
      : trips;

    if (!filteredTrips.length) {
      throw new BadRequestException(
        'No trips found for the specified boat.',
      );
    }

    // Prepare batch learning data
    const learningData = [];
    const boatIds = new Set<string>();

    for (const trip of filteredTrips) {
      if (!trip.boatId) continue;

      const boat = await this.boatModel.findById(trip.boatId).exec();
      if (!boat) continue;

      boatIds.add(String(trip.boatId));

      learningData.push({
        boatId: String(trip.boatId),
        predictedFuelLiters: Number(trip.predictedFuelLiters || 0),
        actualFuelLiters: Number(trip.actualFuelLiters || 0),
        speed: trip.averageSpeed || trip.speed || 10,
        weatherSeverityIndex: trip.weatherSeverityIndex || 0,
        distanceKm: trip.distanceKm || 0,
        engineHP: boat.engineHorsePower || 85,
        fishingHours: trip.fishingHours || 8,
        numberOfDays: trip.numberOfDays || 1,
        tripId: String(trip._id),
      });
    }

    if (!learningData.length) {
      throw new BadRequestException(
        'No valid trips with boat data found for training.',
      );
    }

    // Call ML service batch endpoint
    const baseUrl =
      this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:5001';

    try {
      console.log(`🚀 Calling ML service at: ${baseUrl}/learning/batch-update`);
      console.log(`📦 Sending ${learningData.length} trips for training`);
      
      const response = await firstValueFrom(
        this.http.post(`${baseUrl}/learning/batch-update`, {
          trips: learningData,
          boatId: dto.boatId,
        }),
      );

      const result = response.data;
      console.log(`✅ ML service response received:`, result);

      // Update boats with new coefficients
      if (result.boatUpdates) {
        for (const [boatId, updates] of Object.entries(
          result.boatUpdates as Record<string, any>,
        )) {
          const boat = await this.boatModel.findById(boatId).exec();
          if (boat && updates.updatedCoefficients) {
            boat.fuelEfficiencyFactor =
              updates.updatedCoefficients.fuelEfficiencyFactor;
            boat.engineDegradationFactor =
              updates.updatedCoefficients.engineDegradationFactor;
            boat.averageFuelPredictionError =
              updates.averagePredictionError || boat.averageFuelPredictionError;
            await boat.save();
          }
        }
      }

      return {
        success: true,
        message: `Successfully trained on ${learningData.length} trips`,
        tripsProcessed: learningData.length,
        boatsUpdated: boatIds.size,
        boatIds: Array.from(boatIds),
        learningResult: result,
      };
    } catch (e: any) {
      console.error('❌ Batch training error:', {
        url: `${baseUrl}/learning/batch-update`,
        status: e?.response?.status,
        statusText: e?.response?.statusText,
        data: e?.response?.data,
        message: e?.message,
        code: e?.code,
        tripsCount: learningData.length,
      });
      
      // Provide more specific error message
      let errorMessage = 'Failed to train model';
      if (e?.code === 'ECONNREFUSED') {
        errorMessage = `ML service not reachable at ${baseUrl}. Make sure it's running.`;
      } else if (e?.response?.data?.detail) {
        errorMessage = e.response.data.detail;
      } else if (e?.message) {
        errorMessage = e.message;
      }
      
      throw new BadRequestException(errorMessage);
    }
  }

  // =========================
  // USER STATS
  // =========================
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
      (sum, trip) =>
        sum + Number(trip.actualTotalCost || trip.predictedTotalCost || 0),
      0,
    );

    const totalFuelUsed = trips.reduce(
      (sum, trip) =>
        sum + Number(trip.actualFuelLiters || trip.fuelUsedLiters || 0),
      0,
    );

    const totalDistance = trips.reduce(
      (sum, trip) => sum + Number(trip.distanceKm || 0),
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

  // =========================
  // SIMPLE ACTUAL UPDATE
  // =========================
  async updateActuals(
    id: string,
    userId: string,
    isAdmin: boolean,
    dto: UpdateActualsDto,
  ) {
    const trip = await this.findOne(id, userId, isAdmin);

    trip.fuelUsedLiters = dto.fuelUsedLiters;

    return await trip.save();
  }

  // =========================
  // TOTAL COUNT
  // =========================
  async getTotalTripsCount(): Promise<number> {
    return await this.tripModel.countDocuments().exec();
  }

  // =========================
  // MODEL MANAGEMENT
  // (Research lifecycle: reset, retrain, backups)
  // =========================

  async resetBoatModel(userId: string, boatId: string) {
    // Verify user owns this boat
    const boat = await this.boatModel.findById(boatId).exec();

    if (!boat) {
      throw new NotFoundException('Boat not found');
    }

    if (String(boat.userId) !== String(userId)) {
      throw new ForbiddenException('You do not own this boat');
    }

    const baseUrl =
      this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:5001';

    try {
      const response = await firstValueFrom(
        this.http.post(`${baseUrl}/boats/${boatId}/reset`, {}),
      );

      // Update boat in database to reflect reset
      boat.fuelEfficiencyFactor = 1.0;
      boat.engineDegradationFactor = 0.0;
      boat.averageFuelPredictionError = 0.0;
      await boat.save();

      return response.data;
    } catch (e: any) {
      throw new BadRequestException(
        e?.response?.data?.detail || 'Failed to reset boat model',
      );
    }
  }

  async retrainBoatModel(
    userId: string,
    boatId: string,
    options: { errorThreshold?: number; maxDays?: number },
  ) {
    // Verify ownership
    const boat = await this.boatModel.findById(boatId).exec();

    if (!boat) {
      throw new NotFoundException('Boat not found');
    }

    if (String(boat.userId) !== String(userId)) {
      throw new ForbiddenException('You do not own this boat');
    }

    const baseUrl =
      this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:5001';

    try {
      const response = await firstValueFrom(
        this.http.post(`${baseUrl}/boats/${boatId}/retrain`, null, {
          params: {
            error_threshold: options.errorThreshold,
            max_days: options.maxDays,
          },
        }),
      );

      const result = response.data;

      // Update boat coefficients after retrain
      if (result.newCoefficients) {
        boat.fuelEfficiencyFactor =
          result.newCoefficients.fuelEfficiencyFactor || 1.0;
        boat.engineDegradationFactor =
          result.newCoefficients.engineDegradationFactor || 0.0;
        boat.averageFuelPredictionError =
          result.newCoefficients.avgPredictionError || 0.0;
        await boat.save();
      }

      return result;
    } catch (e: any) {
      throw new BadRequestException(
        e?.response?.data?.detail || 'Failed to retrain boat model',
      );
    }
  }

  async resetAllModels() {
    const baseUrl =
      this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:5001';

    try {
      const response = await firstValueFrom(
        this.http.post(`${baseUrl}/boats/reset-all`, {}),
      );

      // Optionally reset all boats in database
      await this.boatModel.updateMany(
        {},
        {
          fuelEfficiencyFactor: 1.0,
          engineDegradationFactor: 0.0,
          averageFuelPredictionError: 0.0,
        },
      );

      return response.data;
    } catch (e: any) {
      throw new BadRequestException(
        e?.response?.data?.detail || 'Failed to reset all models',
      );
    }
  }

  async getBoatBackups(userId: string, boatId: string) {
    // Verify ownership
    const boat = await this.boatModel.findById(boatId).exec();

    if (!boat) {
      throw new NotFoundException('Boat not found');
    }

    if (String(boat.userId) !== String(userId)) {
      throw new ForbiddenException('You do not own this boat');
    }

    const baseUrl =
      this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:5001';

    try {
      const response = await firstValueFrom(
        this.http.get(`${baseUrl}/boats/${boatId}/backups`),
      );

      return response.data;
    } catch (e: any) {
      throw new BadRequestException(
        e?.response?.data?.detail || 'Failed to fetch backups',
      );
    }
  }
}
