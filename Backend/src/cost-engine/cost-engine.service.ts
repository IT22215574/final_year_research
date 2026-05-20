import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';

import { Trip, TripDocument } from '../schemas/trip.schema';
import { BoatService } from '../boat/boat.service';
import { CostPreferencesService } from '../cost-preferences/cost-preferences.service';

import { PredictCostDto } from './dto/predict-cost.dto';
import { PredictAndSaveDto } from './dto/predict-and-save.dto';
import { OptimizeTripDto } from './dto/optimize-trip.dto';

import {
  haversineDistanceKm,
  effectiveDistanceKm,
} from '../common/utils/haversine.util';
import { calculateWSI } from '../common/utils/wsi.util';
import { calculateFESI } from '../common/utils/fesi.util';

import {
  calculateModeAdjustments,
  calculateInternationalAdditionalCosts,
  getModeRecommendations,
} from './utils/mode-calculator.util';

import {
  estimateFuelBase,
  applySpeedAdjustment,
  applyModeFuelAdjustment,
} from './functions/fuel/estimate-fuel';
import { calculateTotalCost } from './functions/cost/calculate-total-cost';
import { calculateProfit } from './functions/profit/calculate-profit';
import { calculateCarbonEmission } from './functions/environment/calculate-carbon-emission.ts';
import {
  calculateBoatAge,
  calculateFallbackRisk,
  categorizeBoatSize,
  categorizeCrewExperience,
  determineFishingZone,
} from './functions/environment/calculate-fallback-risk';
import { buildOptimizationResult } from './functions/optimization/trip-optimizer';
import { buildPredictionResponse } from './functions/mapping/build-prediction-response.ts';
import { mergeCostPreferences } from './functions/cost/merge-cost-preferences';
import { calculateExternalCostTotal } from './functions/cost/calculate-external-cost-total';
import { buildCostBreakdown } from './functions/cost/build-cost-breakdown';
import { ModelRegistryService } from '../model-registry/model-registry.service';

@Injectable()
export class CostEngineService {
  constructor(
    @InjectModel(Trip.name)
    private readonly tripModel: Model<TripDocument>,
    private readonly boatService: BoatService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly costPreferencesService: CostPreferencesService,
    private readonly modelRegistryService: ModelRegistryService,
  ) {}

  private async getValidatedBoatForPrediction(boatId: string, userId?: string) {
    const boat = await this.boatService.findById(boatId);

    if (!boat) {
      throw new NotFoundException('Boat not found');
    }

    if (userId && String(boat.userId) !== String(userId)) {
      throw new BadRequestException(
        'You are not allowed to use this boat for prediction',
      );
    }

    return boat;
  }

  // =========================
  // PREDICT TRIP COST
  // =========================
  async predictTrip(dto: PredictCostDto, userId?: string) {
    const boat = await this.getValidatedBoatForPrediction(dto.boatId, userId);

    // ✅ Support both coordinate-based and manual distance
    let baseDistanceKm: number;
    let predictedDistanceKm: number;
    let calculatedFromCoordinates = false;
    const drf = 0.05; // Detour/route factor

    // If manual distance provided, use it (prioritized because frontend calculates total path distance)
    if (dto.distanceKm != null && dto.distanceKm > 0) {
      baseDistanceKm = dto.distanceKm;
      predictedDistanceKm = effectiveDistanceKm(baseDistanceKm, drf);
      calculatedFromCoordinates = false;
    }
    // Otherwise, if coordinates provided, calculate straight-line distance
    else if (
      dto.startLat != null &&
      dto.startLon != null &&
      dto.endLat != null &&
      dto.endLon != null
    ) {
      baseDistanceKm = haversineDistanceKm(
        dto.startLat,
        dto.startLon,
        dto.endLat,
        dto.endLon,
      );
      predictedDistanceKm = effectiveDistanceKm(baseDistanceKm, drf);
      calculatedFromCoordinates = true;
    }
    // Neither provided - error
    else {
      throw new BadRequestException(
        'Either coordinates (startLat, startLon, endLat, endLon) or manual distance (distanceKm) must be provided',
      );
    }

    const { wsi, normalized: wsiNormalized } = calculateWSI(
      dto.windSpeed,
      dto.waveHeight,
      dto.rainMmPerHour ?? 0,
    );

    const { fesi, components: fesiComponents } = calculateFESI({
      recentFuelPrices: [],
      recentMarketPrices: [],
      recentWSI: [],
    });

    const baseUrl =
      this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:5001';

    const efficiencyFactor = boat.fuelEfficiencyFactor ?? 1;
    const effectiveEngineHP =
      dto.engineHP ?? dto.engineHorsePower ?? boat.engineHorsePower ?? 85;
    let mlFallback = false;

    const fuelBaseResult = estimateFuelBase({
      predictedDistanceKm,
      wsi,
      speed: dto.speed,
      efficiencyFactor,
      boatType: boat.boatType,
    });

    let predictedFuelLiters = fuelBaseResult.predictedFuelLiters;

    try {
      const fuelRes = await firstValueFrom(
        this.http.post(`${baseUrl}/predict/fuel`, {
          boatId: dto.boatId,
          boatType: boat.boatType, // ✅ Send boat type for fuel baseline
          distanceKm: predictedDistanceKm,
          speed: dto.speed,
          engineHP: effectiveEngineHP,
          fishingHours: dto.fishingHours,
          numberOfDays: dto.numberOfDays,
          weatherSeverityIndex: wsi,
          engineDegradation: 1 - (boat.engineDegradationFactor ?? 0),
          fuelEfficiencyFactor: efficiencyFactor,
        }),
      );

      const v = Number(fuelRes.data?.predictedFuelLiters);
      if (!Number.isFinite(v)) {
        throw new Error('Invalid ML fuel output');
      }

      predictedFuelLiters = v;
    } catch (e: any) {
      mlFallback = true;
      console.log(
        'ML fuel error:',
        e?.response?.status,
        e?.response?.data || e?.message || e,
      );
    }

    const speedAdjusted = applySpeedAdjustment(predictedFuelLiters, dto.speed);
    predictedFuelLiters = speedAdjusted.predictedFuelLiters;

    const mode = dto.mode || 'island';
    const tripDurationHours =
      dto.fishingHours + predictedDistanceKm / dto.speed;

    const modeAdjustments = calculateModeAdjustments(
      mode,
      predictedDistanceKm,
      tripDurationHours,
      dto.crewCount,
    );

    const adjustedFuelLiters = applyModeFuelAdjustment(
      predictedFuelLiters,
      modeAdjustments.fuelMultiplier,
    );

    let internationalCosts = 0;
    if (mode === 'international') {
      const additionalCosts = calculateInternationalAdditionalCosts(
        predictedDistanceKm,
        tripDurationHours,
        dto.crewCount,
      );

      internationalCosts = Object.values(additionalCosts).reduce(
        (sum, cost) => sum + Number(cost),
        0,
      );
    }

    const costBreakdown = calculateTotalCost({
      adjustedFuelLiters,
      fuelPrice: dto.fuelPrice,
      crewCount: dto.crewCount,
      fesi,
      mode,
      modeAdjustments,
      internationalCosts,
    });

    let activePreferences: any[] = [];

    if (userId) {
      try {
        activePreferences =
          await this.costPreferencesService.findActiveAutoApplyForUser(userId);
      } catch {
        activePreferences = [];
      }
    }

    const mergedExternalCosts = mergeCostPreferences(
      activePreferences,
      dto.manualExternalCosts || [],
    );

    const externalCostTotal = calculateExternalCostTotal(mergedExternalCosts);

    const baseOperationalCost =
      Number(costBreakdown.predictedTotalCost || 0) -
      Number(costBreakdown.fuelCost || 0);

    const totalCostSummary = buildCostBreakdown({
      predictedFuelCost: costBreakdown.fuelCost,
      baseOperationalCost,
      externalCostTotal,
    });

    const finalPredictedTotalCost = totalCostSummary.grandTotal;

    const carbon = calculateCarbonEmission({
      adjustedFuelLiters,
      expectedCatch: dto.expectedCatch,
    });

    const baseProfitability = calculateProfit({
      expectedCatch: dto.expectedCatch,
      marketPrice: dto.marketPrice,
      predictedTotalCost: finalPredictedTotalCost,
    });

    let profitabilityProbability = baseProfitability.profitabilityProbability;
    let riskCategory = baseProfitability.riskCategory;

    try {
      const profRes = await firstValueFrom(
        this.http.post(`${baseUrl}/predict/profitability`, {
          expectedCatchKg: dto.expectedCatch,
          marketPrice: dto.marketPrice,
          predictedTotalCost: finalPredictedTotalCost,
          weatherSeverityIndex: wsi,
        }),
      );

      const p = Number(profRes.data?.profitabilityProbability);
      const r = profRes.data?.riskCategory;

      if (Number.isFinite(p)) {
        profitabilityProbability = p;
      }

      if (r === 'low' || r === 'medium' || r === 'high') {
        riskCategory = r;
      } else if (r === 'very_high') {
        riskCategory = 'high';
      }
    } catch (e: any) {
      mlFallback = true;
      console.log(
        'ML profitability error:',
        e?.response?.status,
        e?.response?.data || e?.message || e,
      );
    }

    const recommendations: string[] = [];

    if (wsi > 0.65) {
      recommendations.push(
        'High weather severity: consider delaying trip or reducing speed.',
      );
    }

    if (fesi > 0.5) {
      recommendations.push(
        'High economic stress: consider adjusting plan or monitoring fuel price.',
      );
    }

    if (profitabilityProbability < 0.45) {
      recommendations.push(
        'Low profitability chance: consider alternative zone/time or reduce costs.',
      );
    }

    if (adjustedFuelLiters > 120) {
      recommendations.push(
        'High fuel usage predicted: optimize route and plan fuel usage carefully.',
      );
    }

    recommendations.push(
      ...getModeRecommendations(mode, predictedDistanceKm, wsi),
    );

    if (recommendations.length === 0) {
      recommendations.push(
        'Conditions look stable: proceed with standard plan and monitor weather updates.',
      );
    }
    // 🛡️ GOVERNED MODEL METADATA (Day 5 - Append Only)
    let modelMetadata: any = null;

    if (this.config.get<string>('ENABLE_MODEL_VERSION_ROUTING') === 'true') {
      try {
        const activeModel =
          await this.modelRegistryService.getActiveModelForBoatType(
            boat.boatType,
          );

        if (activeModel) {
          modelMetadata = {
            modelVersionId: activeModel._id.toString(),
            algorithmType: activeModel.algorithmType,
            scope: activeModel.scope,
            boatType: activeModel.boatType,
            selectionRank: activeModel.selectionRank,
            quality: activeModel.quality,
            promotedAt: activeModel.promotedAt,
            artifactReference: activeModel.artifactReference,
          };
        }
      } catch (err) {
        // Non-breaking: if registry fails, prediction still works
        console.error('Model registry lookup failed:', err);
      }
    }

    return buildPredictionResponse({
      distance: {
        baseDistanceKm,
        predictedDistanceKm,
        drf,
      },
      weather: {
        wsi,
        normalized: wsiNormalized,
        windSpeed: dto.windSpeed,
        waveHeight: dto.waveHeight,
        rainMmPerHour: dto.rainMmPerHour ?? 0,
      },
      economics: {
        fesi,
        components: fesiComponents,
        fuelPrice: dto.fuelPrice,
        marketPrice: dto.marketPrice,
      },
      fuel: {
        predictedFuelLiters,
        adjustedFuelLiters,
        fuelPerKmBase: fuelBaseResult.fuelPerKmBase,
        weatherMultiplier: fuelBaseResult.weatherMultiplier,
        efficiencyFactor,
        speedFactor: speedAdjusted.speedFactor,
        modeMultiplier: modeAdjustments.fuelMultiplier,
      },
      cost: {
        ...costBreakdown,
        baseOperationalCost,
        externalCosts: mergedExternalCosts,
        externalCostTotal,
        predictedTotalCost: finalPredictedTotalCost,
      },
      mode: {
        selectedMode: mode,
        adjustments: modeAdjustments,
        tripDurationHours,
      },
      carbon,
      profitability: {
        expectedRevenue: baseProfitability.expectedRevenue,
        profit: baseProfitability.expectedRevenue - finalPredictedTotalCost,
        profitabilityProbability,
        riskCategory,
      },
      recommendations,
      mlFallback,
      modelMetadata,
    });
  }
  // =========================
  // PREDICT + SAVE TRIP
  // =========================
  async predictAndSave(dto: PredictAndSaveDto, req: Request) {
    const anyReq: any = req;
    const user = anyReq.user;

    const userId = user?.userId || user?.id || user?.sub || user?._id;

    if (!userId) {
      throw new BadRequestException(
        'User not found in request. Protect this endpoint with AuthGuard and ensure req.user has userId.',
      );
    }

    const boat = await this.getValidatedBoatForPrediction(dto.boatId, userId);

    const prediction = await this.predictTrip(dto, userId);
    const effectiveEngineHP =
      dto.engineHP ?? dto.engineHorsePower ?? boat.engineHorsePower;

    if (dto.clientRequestId) {
      const exists = await this.tripModel.findOne({
        clientRequestId: dto.clientRequestId,
      });

      if (exists) {
        return {
          message: 'Trip already exists for this clientRequestId',
          trip: exists,
          prediction,
          duplicate: true,
        };
      }
    }

    const departureTime = dto.departureTime
      ? new Date(dto.departureTime)
      : new Date();

    const returnTime = dto.returnTime
      ? new Date(dto.returnTime)
      : new Date(
          departureTime.getTime() + (dto.fishingHours + 2) * 60 * 60 * 1000,
        );

    const tripToSave: Partial<Trip> = {
      userId,
      boatId: dto.boatId,
      clientRequestId: dto.clientRequestId,
      departureTime,
      returnTime,

      startLat: dto.startLat,
      startLon: dto.startLon,
      endLat: dto.endLat,
      endLon: dto.endLon,

      distanceKm:
        prediction?.distance?.predictedDistanceKm ??
        prediction?.distance?.baseDistanceKm ??
        undefined,

      engineHorsePower: effectiveEngineHP,
      engineHP: effectiveEngineHP,
      boatType: boat.boatType,

      windSpeed: dto.windSpeed,
      waveHeight: dto.waveHeight,
      rainMmPerHour: dto.rainMmPerHour,
      fuelPricePerLiter: dto.fuelPrice,
      marketPrice: dto.marketPrice,

      speed: dto.speed,
      crewCount: dto.crewCount,
      fishingHours: dto.fishingHours,
      numberOfDays: dto.numberOfDays,

      predictedFuelLiters: prediction.fuel.adjustedFuelLiters,
      predictedTotalCost: prediction.cost.predictedTotalCost,
      predictedOperationalCost: prediction.cost.baseOperationalCost,
      predictedFuelCost: prediction.cost.fuelCost,
      predictedCrewCost: prediction.cost.crewCost,
      predictedExternalCosts: prediction.cost.externalCosts,
      predictedExternalCostTotal: prediction.cost.externalCostTotal,
      predictedDistanceKm: prediction.distance.predictedDistanceKm,

      weatherSeverityIndex: prediction.weather.wsi,
      economicStressIndex: prediction.economics.fesi,

      carbonEmissionKg: prediction.carbon.carbonEmissionKg,
      carbonPerKgCatch: prediction.carbon.carbonPerKgCatch,

      profitabilityProbability:
        prediction.profitability.profitabilityProbability,
      riskCategory: prediction.profitability.riskCategory,

      optimizationRecommendations: prediction.recommendations,

      mode: dto.mode ?? 'island',
      status: 'planned',
    };

    const trip = await this.tripModel.create(tripToSave);

    return { trip, prediction };
  }
  // =========================
  // OPTIMIZE TRIP
  // =========================
  async optimizeTrip(dto: OptimizeTripDto, userId?: string) {
    const speedsToTry = dto.speed ? [dto.speed] : [8, 10, 12, 14];

    const results: Array<{
      speed: number;
      score: number;
      prediction: any;
    }> = [];

    for (const speed of speedsToTry) {
      const payload: PredictCostDto = { ...dto, speed };
      const prediction = await this.predictTrip(payload, userId);

      results.push({
        speed,
        score: prediction.cost.predictedTotalCost,
        prediction,
      });
    }

    return buildOptimizationResult(results);
  }

  async createTrip(userId: string, data: any) {
    return this.tripModel.create({
      userId,
      ...data,
    });
  }

  // ===========================
  // COMPREHENSIVE RISK ASSESSMENT
  // ===========================
  async assessComprehensiveRisk(data: {
    boat: any;
    distance: number;
    weatherData: any;
    predictedCost: number;
    expectedRevenue: number;
    fuelCost: number;
    tripDuration: number;
  }) {
    try {
      const mlServiceUrl =
        this.config.get<string>('ML_SERVICE_BASE_URL') ||
        'http://localhost:5001';

      const riskData = {
        weatherSeverityIndex: data.weatherData?.wsi || 0.25,
        windSpeed: data.weatherData?.windSpeed || 15,
        waveHeight: data.weatherData?.waveHeight || 1.5,
        tripDuration: data.tripDuration,
        tripDate: new Date().toISOString(),

        predictedTotalCost: data.predictedCost,
        expectedRevenue: data.expectedRevenue,
        fuelCost: data.fuelCost,
        marketPrice: data.expectedRevenue / (data.boat?.expectedCatch || 100),

        totalDistance: data.distance,
        boatAge: calculateBoatAge(data.boat?.manufactured),
        crewExperience: categorizeCrewExperience(
          data.boat?.crewExperience || 5,
        ),
        maintenanceScore: data.boat?.maintenanceScore || 0.8,
        boatType: categorizeBoatSize(data.boat?.lengthM || 15),

        engineCondition: data.boat?.engineCondition || 0.8,
        hasGPS: data.boat?.hasGPS !== false,
        hasRadio: data.boat?.hasRadio !== false,
        safetyEquipmentScore: data.boat?.safetyScore || 0.7,

        targetSpecies: data.boat?.targetSpecies || 'general',
        marketDemand: 0.7,
        priceVolatility: 0.3,
        maxStorageTime: data.boat?.storageCapacity || 24,

        hasValidLicense: data.boat?.hasValidLicense !== false,
        fishingZone: determineFishingZone(data.distance),
        quotaUsagePercent: 0.5,
        nearRestrictedAreas: false,
      };

      const response = await firstValueFrom(
        this.http.post(`${mlServiceUrl}/assess/risk`, riskData, {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      return {
        success: true,
        riskAssessment: response.data,
        source: 'ml_service',
      };
    } catch (error: any) {
      console.error('ML risk assessment failed:', error?.message);

      const fallbackRisk = calculateFallbackRisk(data);

      return {
        success: false,
        riskAssessment: fallbackRisk,
        source: 'fallback',
        error: error?.message,
      };
    }
  }
}
