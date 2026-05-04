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
import { TripMetricsService } from './services/trip-metrics.service';
import {
  TrainingCandidate,
  TrainingCandidateDocument,
} from '../schemas/training-candidate.schema';

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Boat.name) private boatModel: Model<BoatDocument>,
    @InjectModel(TripCoefficient.name)
    private tripCoeffModel: Model<TripCoefficientDocument>,
    @InjectModel(TrainingCandidate.name)
    private candidateModel: Model<TrainingCandidateDocument>, // <-- ADD THIS LINE
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly tripMetricsService: TripMetricsService,
  ) {}

  // =========================
  // CREATE TRIP
  // =========================
  async create(
    userId: string,
    isAdmin: boolean,
    createTripDto: CreateTripDto,
  ): Promise<TripDocument> {
    let tripOwnerId = userId;

    if (createTripDto.boatId) {
      const boat = await this.boatModel.findById(createTripDto.boatId).exec();

      if (!boat) {
        throw new NotFoundException('Boat not found');
      }

      if (!isAdmin && String(boat.userId) !== String(userId)) {
        throw new ForbiddenException(
          'You are not allowed to create a trip with this boat',
        );
      }

      // When admin creates a trip using a fisherman's boat, keep trip ownership with that fisherman.
      tripOwnerId = String(boat.userId || userId);
    }

    const newTrip = new this.tripModel({
      ...createTripDto,
      userId: tripOwnerId,
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
    const trips = await this.tripModel
      .find({ userId })
      .sort({ departureTime: -1 })
      .lean()
      .exec();

    // Populate boat info for each trip
    const enrichedTrips = await Promise.all(
      trips.map(async (trip) => {
        if (trip.boatId) {
          const boat = await this.boatModel
            .findById(trip.boatId)
            .select('boatName boatType')
            .lean()
            .exec();

          return {
            ...trip,
            boat: boat || null,
          };
        }
        return { ...trip, boat: null };
      }),
    );

    return enrichedTrips as any;
  }

  // =========================
  // FIND ALL
  // =========================
  async findAll(): Promise<TripDocument[]> {
    const trips = await this.tripModel
      .find()
      .sort({ departureTime: -1 })
      .lean()
      .exec();

    // Populate boat info for each trip
    const enrichedTrips = await Promise.all(
      trips.map(async (trip) => {
        if (trip.boatId) {
          const boat = await this.boatModel
            .findById(trip.boatId)
            .select('boatName boatType')
            .lean()
            .exec();

          return {
            ...trip,
            boat: boat || null,
          };
        }
        return { ...trip, boat: null };
      }),
    );

    return enrichedTrips as any;
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
    const isAdmin = !!user?.isAdmin;

    if (!userId) {
      throw new BadRequestException('Unauthorized');
    }

    const trip = await this.tripModel.findById(tripId).exec();
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (!isAdmin && String(trip.userId) !== String(userId)) {
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

    // Calculate and store comparison metrics using TripMetricsService
    const metrics = this.tripMetricsService.calculateTripMetrics(trip);

    // Assign standard comparison metrics
    trip.fuelErrorLiters = metrics.fuelErrorLiters;
    trip.fuelErrorPercent = metrics.fuelErrorPercent;
    trip.fuelVarianceLiters = metrics.fuelVarianceLiters;
    trip.isFuelPredictionAccurate = metrics.isFuelPredictionAccurate;
    trip.costErrorAmount = metrics.costErrorAmount;
    trip.costErrorPercent = metrics.costErrorPercent;
    trip.costVarianceAmount = metrics.costVarianceAmount;
    trip.isCostPredictionAccurate = metrics.isCostPredictionAccurate;
    trip.fuelCostErrorAmount = metrics.fuelCostErrorAmount;
    trip.fuelCostErrorPercent = metrics.fuelCostErrorPercent;
    trip.comparisonEligible = metrics.comparisonEligible;
    trip.accuracyThresholdUsed = metrics.accuracyThresholdUsed;
    trip.comparisonCalculatedAt = metrics.comparisonCalculatedAt;

    // ✅ NEW: Assign boat type-based normalized metrics
    if (metrics.normalizedFuelMetrics) {
      trip.expectedFuelForBoatType =
        metrics.normalizedFuelMetrics.expectedFuelForBoatType;
      trip.normalizedVariancePercent =
        metrics.normalizedFuelMetrics.normalizedVariancePercent;
      trip.efficiencyScore = metrics.normalizedFuelMetrics.efficiencyScore;
      trip.varianceRating = metrics.normalizedFuelMetrics.varianceRating;
      trip.mlAdjustedExpectedFuel =
        metrics.normalizedFuelMetrics.mlAdjustedExpectedFuel;
      trip.mlVariancePercent = metrics.normalizedFuelMetrics.mlVariancePercent;
      trip.boatTypeUsedForMetrics = metrics.normalizedFuelMetrics.boatTypeUsed;
    }

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
    const tripEngineHP =
      trip.engineHP || trip.engineHorsePower || boat.engineHorsePower || 85;

    // 🛡️ GOVERNANCE PIPELINE INTERCEPTION
    // Reads the flag from your .env file
    if (
      this.config.get<string>('ENABLE_GOVERNED_TRAINING_PIPELINE') === 'true'
    ) {
      try {
        const sourceTripId = trip._id.toString();
        await this.candidateModel.updateOne(
          { sourceTripId },
          {
            $set: {
              sourceTripId,
              boatId: trip.boatId.toString(),
              boatType: boat.boatType || 'unknown',
              featuresSnapshot: {
                speed: trip.averageSpeed || trip.speed || 10,
                weatherSeverityIndex: trip.weatherSeverityIndex || 0,
                distanceKm: trip.distanceKm || 0,
                engineHP: tripEngineHP,
                fishingHours: trip.fishingHours || 8,
                numberOfDays: trip.numberOfDays || 1,
                predictedFuelLiters: trip.predictedFuelLiters || 0,
              },
              labelSnapshot: {
                actualFuelLiters: dto.actualFuelLiters,
                actualCost:
                  actualFuelCost +
                  actualOperationalCost +
                  actualExternalCostTotal,
              },
              status: 'PENDING',
              reviewReason: null,
              reviewedAt: null,
            },
          },
          { upsert: true },
        );
      } catch (err) {
        // If candidate creation fails, the trip log still succeeds! Non-breaking.
        console.error('Failed to create training candidate:', err);
      }
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
          engineHP: tripEngineHP,
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
  async batchTrainTrips(dto: BatchTrainDto) {
    if (!Array.isArray(dto.tripIds) || dto.tripIds.length === 0) {
      throw new BadRequestException('tripIds is required for batch training');
    }

    // Admin training: selected trips can belong to any fisherman.
    const trips = await this.tripModel
      .find({
        _id: { $in: dto.tripIds },
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
      throw new BadRequestException('No trips found for the specified boat.');
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
        engineHP:
          trip.engineHP || trip.engineHorsePower || boat.engineHorsePower || 85,
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
  // =========================
  // EXPORT TRIPS AS CSV
  // =========================
  async generateCSV(
    trips: TripDocument[],
    dataType: string = 'mixed',
  ): Promise<string> {
    // CSV Headers - matching train.py requirements
    const headers = [
      'distanceKm',
      'engineHorsePower',
      'windSpeed',
      'waveHeight',
      'tripDurationHours',
      'fuelPricePerLiter',
      'fuelUsedLiters',
      'totalCost',
    ];

    const rows = trips
      .filter((trip) => {
        if (dataType === 'actual') {
          // Only trips with actual logged data
          return (
            trip.actualFuelLiters &&
            trip.actualTotalCost &&
            trip.distanceKm &&
            trip.engineHorsePower
          );
        } else if (dataType === 'predicted') {
          // Only trips with predicted data (no actual data logged)
          return (
            !trip.actualFuelLiters &&
            trip.predictedFuelLiters &&
            trip.predictedTotalCost &&
            (trip.distanceKm || trip.predictedDistanceKm) &&
            trip.engineHorsePower
          );
        } else {
          // Mixed: Include trips with either actual OR predicted data
          const hasDistance = trip.distanceKm || trip.predictedDistanceKm;
          const hasHorsePower = trip.engineHorsePower || trip.engineHP;
          const hasFuel =
            trip.fuelUsedLiters ||
            trip.actualFuelLiters ||
            trip.predictedFuelLiters;
          const hasCost =
            trip.actualTotalCost || trip.totalCost || trip.predictedTotalCost;

          return hasDistance && hasHorsePower && hasFuel && hasCost;
        }
      })
      .map((trip) => {
        const durationHours =
          trip.tripDurationHours ||
          (new Date(trip.returnTime).getTime() -
            new Date(trip.departureTime).getTime()) /
            (1000 * 60 * 60);

        // Use actual data first, fall back to predicted for mixed/predicted
        const distance =
          dataType === 'predicted'
            ? trip.predictedDistanceKm || trip.distanceKm
            : trip.distanceKm || trip.predictedDistanceKm;
        const fuel =
          dataType === 'predicted'
            ? trip.predictedFuelLiters || trip.actualFuelLiters
            : trip.actualFuelLiters ||
              trip.fuelUsedLiters ||
              trip.predictedFuelLiters;
        const cost =
          dataType === 'predicted'
            ? trip.predictedTotalCost || trip.actualTotalCost
            : trip.actualTotalCost || trip.totalCost || trip.predictedTotalCost;

        return [
          distance || 0,
          trip.engineHorsePower || trip.engineHP || 0,
          trip.windSpeed || 0,
          trip.waveHeight || 0,
          durationHours,
          trip.fuelPricePerLiter || 0,
          fuel || 0,
          cost || 0,
        ].join(',');
      });

    return [headers.join(','), ...rows].join('\n');
  }

  async getUserStats(userId: string) {
    const trips = await this.findByUser(userId);

    if (trips.length === 0) {
      return {
        totalTrips: 0,
        completedTrips: 0,
        predictionsWithActuals: 0,
        fuelAccuracyRate: 0,
        costAccuracyRate: 0,
        averagePredictedCost: 0,
        averageActualCost: 0,
        averageFuelErrorPercent: 0,
        averageCostErrorPercent: 0,
        totalPredictedFuel: 0,
        totalActualFuel: 0,
        totalFuelVariance: 0,
        totalPredictedCost: 0,
        totalActualCost: 0,
        totalCostVariance: 0,
        totalFuelUsed: 0,
        totalDistance: 0,
      };
    }

    // Use TripMetricsService to calculate comprehensive dashboard stats
    return this.tripMetricsService.calculateDashboardStats(trips);
  }

  /**
   * Debug endpoint: Get detailed breakdown of trip metrics
   * Shows which trips are included/excluded and why
   */
  async getStatsDebug(userId: string) {
    const trips = await this.findByUser(userId);

    const breakdown = {
      totalTrips: trips.length,
      completed: trips.filter((t) => t.status === 'completed').length,
      withPredictions: trips.filter((t) => t.predictedFuelLiters != null)
        .length,
      withActuals: trips.filter((t) => t.actualFuelLiters != null).length,
      eligible: 0,
      filtered: 0,
      reasons: {
        noPrediction: 0,
        noActual: 0,
        invalidValues: 0,
        extremeOutlier: 0,
      },
      worstOffenders: [] as any[],
    };

    const problematicTrips = [];

    for (const trip of trips) {
      const predicted = trip.predictedFuelLiters;
      const actual = trip.actualFuelLiters;

      // Check eligibility
      if (predicted == null) {
        breakdown.reasons.noPrediction++;
        breakdown.filtered++;
        continue;
      }

      if (actual == null) {
        breakdown.reasons.noActual++;
        breakdown.filtered++;
        continue;
      }

      if (predicted <= 0 || actual < 0) {
        breakdown.reasons.invalidValues++;
        breakdown.filtered++;
        problematicTrips.push({
          id: trip._id,
          predicted,
          actual,
          reason: 'Invalid values (zero or negative)',
        });
        continue;
      }

      const fuelRatio = actual > 0 ? predicted / actual : 0;
      if (fuelRatio > 10 || fuelRatio < 0.1) {
        breakdown.reasons.extremeOutlier++;
        breakdown.filtered++;
        const errorPercent = Math.abs(((actual - predicted) / predicted) * 100);
        problematicTrips.push({
          id: trip._id,
          predicted,
          actual,
          variance: actual - predicted,
          errorPercent: Math.round(errorPercent),
          ratio: Math.round(fuelRatio * 100) / 100,
          reason: `Extreme outlier (${fuelRatio > 10 ? 'prediction 10x+ actual' : 'actual 10x+ prediction'})`,
        });
        continue;
      }

      breakdown.eligible++;
    }

    // Sort problematic trips by absolute variance
    problematicTrips.sort(
      (a, b) => Math.abs(b.variance || 0) - Math.abs(a.variance || 0),
    );

    breakdown.worstOffenders = problematicTrips.slice(0, 10);

    return {
      ...breakdown,
      stats: this.tripMetricsService.calculateDashboardStats(trips),
      message:
        breakdown.filtered > 0
          ? `${breakdown.filtered} trips filtered out due to data quality issues. See worstOffenders for details.`
          : 'All trips passed data quality checks.',
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

  async resetBoatModel(userId: string, isAdmin: boolean, boatId: string) {
    // Admin can reset any boat. Non-admin can only reset own boat.
    const boat = await this.boatModel.findById(boatId).exec();

    if (!boat) {
      throw new NotFoundException('Boat not found');
    }

    if (!isAdmin && String(boat.userId) !== String(userId)) {
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
    isAdmin: boolean,
    boatId: string,
    options: { errorThreshold?: number; maxDays?: number },
  ) {
    // Admin can retrain any boat. Non-admin can only retrain own boat.
    const boat = await this.boatModel.findById(boatId).exec();

    if (!boat) {
      throw new NotFoundException('Boat not found');
    }

    if (!isAdmin && String(boat.userId) !== String(userId)) {
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

  async getBoatBackups(userId: string, isAdmin: boolean, boatId: string) {
    // Admin can view any boat backups. Non-admin can only view own boat backups.
    const boat = await this.boatModel.findById(boatId).exec();

    if (!boat) {
      throw new NotFoundException('Boat not found');
    }

    if (!isAdmin && String(boat.userId) !== String(userId)) {
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
