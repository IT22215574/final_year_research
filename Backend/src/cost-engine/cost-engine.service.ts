// Backend/src/cost-engine/cost-engine.service.ts

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

import { PredictCostDto } from './dto/predict-cost.dto';
import { PredictAndSaveDto } from './dto/predict-and-save.dto';

import {
  haversineDistanceKm,
  effectiveDistanceKm,
} from '../common/utils/haversine.util';
import { calculateWSI } from '../common/utils/wsi.util';
import { calculateFESI } from '../common/utils/fesi.util';

@Injectable()
export class CostEngineService {
  constructor(
    @InjectModel(Trip.name)
    private readonly tripModel: Model<TripDocument>,
    private readonly boatService: BoatService,
  ) {}

  // =========================
  // PREDICT TRIP COST (Deterministic - Checkpoint C)
  // =========================
  async predictTrip(dto: PredictCostDto) {
    const boat = await this.boatService.findById(dto.boatId);
    if (!boat) throw new NotFoundException('Boat not found');

    // 1) Distance (real)
    const baseDistanceKm = haversineDistanceKm(
      dto.startLat,
      dto.startLon,
      dto.endLat,
      dto.endLon,
    );

    // DRF can come from boat later; for now use safe default
    const drf = 0.05;
    const predictedDistanceKm = effectiveDistanceKm(baseDistanceKm, drf);

    // 2) WSI
    const { wsi, normalized: wsiNormalized } = calculateWSI(
      dto.windSpeed,
      dto.waveHeight,
      0,
    );

    // 3) FESI (no history yet)
    const { fesi, components: fesiComponents } = calculateFESI({
      recentFuelPrices: [],
      recentMarketPrices: [],
      recentWSI: [],
    });

    // 4) Fuel prediction (deterministic placeholder until Python adaptive model)
    const fuelPerKmBase = 0.5; // liters per km baseline (tune later)
    const fuelBase = predictedDistanceKm * fuelPerKmBase;

    // weather 0..1 -> multiplier up to +50%
    const weatherMultiplier = 1 + wsi * 0.5;

    // learning coefficient from boat (default 1)
    const efficiencyFactor = boat.fuelEfficiencyFactor ?? 1;

    const predictedFuelLiters = fuelBase * weatherMultiplier * efficiencyFactor;

    // 5) Cost
    const fuelCost = predictedFuelLiters * dto.fuelPrice;

    // simple crew cost rule (replace later with real operational breakdown)
    const crewCost = dto.crewCount * 5000;

    const rawTotalCost = fuelCost + crewCost;

    // risk adjust using FESI up to +15%
    const predictedTotalCost = rawTotalCost * (1 + fesi * 0.15);

    // 6) Carbon
    const emissionFactor = 2.68; // kg CO2 per liter diesel
    const carbonEmissionKg = predictedFuelLiters * emissionFactor;
    const carbonPerKgCatch =
      dto.expectedCatch > 0 ? carbonEmissionKg / dto.expectedCatch : null;

    // 7) Profitability (placeholder)
    const expectedRevenue = dto.expectedCatch * dto.marketPrice;
    const profit = expectedRevenue - predictedTotalCost;
    const profitabilityProbability = profit > 0 ? 0.8 : 0.3;

    const riskCategory =
      profitabilityProbability >= 0.7
        ? 'low'
        : profitabilityProbability >= 0.45
          ? 'medium'
          : 'high';

    // 8) Recommendations (simple deterministic rules for now)
    const recommendations: string[] = [];
    if (wsi > 0.65)
      recommendations.push(
        'High weather severity: consider delaying trip or reducing speed.',
      );
    if (fesi > 0.5)
      recommendations.push(
        'High economic stress: consider adjusting plan or monitoring fuel price.',
      );
    if (profitabilityProbability < 0.45)
      recommendations.push(
        'Low profitability chance: consider alternative zone/time or reduce costs.',
      );
    if (predictedFuelLiters > 120)
      recommendations.push(
        'High fuel usage predicted: optimize route and plan fuel usage carefully.',
      );
    if (recommendations.length === 0)
      recommendations.push(
        'Conditions look stable: proceed with standard plan and monitor weather updates.',
      );

    return {
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
      },
      economics: {
        fesi,
        components: fesiComponents,
        fuelPrice: dto.fuelPrice,
        marketPrice: dto.marketPrice,
      },
      fuel: {
        predictedFuelLiters,
        fuelPerKmBase,
        weatherMultiplier,
        efficiencyFactor,
      },
      cost: {
        fuelCost,
        crewCost,
        rawTotalCost,
        predictedTotalCost,
      },
      carbon: {
        emissionFactor,
        carbonEmissionKg,
        carbonPerKgCatch,
      },
      profitability: {
        expectedRevenue,
        profit,
        profitabilityProbability,
        riskCategory,
      },
      recommendations,
      mlFallback: true, // not calling Python yet
    };
  }

  // =========================
  // PREDICT + SAVE TRIP (Phase 2.5)
  // =========================
  async predictAndSave(dto: PredictAndSaveDto, req: Request) {
    // Extract userId from req.user (depends on your AuthGuard/JWT strategy)
    const anyReq: any = req;
    const user = anyReq.user;

    const userId = user?.userId || user?.id || user?.sub || user?._id;

    if (!userId) {
      throw new BadRequestException(
        'User not found in request. Protect this endpoint with AuthGuard and ensure req.user has userId.',
      );
    }

    // Load boat (so we can store engineHorsePower / boatType)
    const boat = await this.boatService.findById(dto.boatId);
    if (!boat) throw new NotFoundException('Boat not found');

    // 1) Predict
    const prediction = await this.predictTrip(dto);

    // 2) Determine trip times (Trip schema requires these)
    const departureTime = dto.departureTime
      ? new Date(dto.departureTime)
      : new Date();

    const returnTime = dto.returnTime
      ? new Date(dto.returnTime)
      : new Date(
          departureTime.getTime() + (dto.fishingHours + 2) * 60 * 60 * 1000,
        );

    // 3) Build Trip document (store both inputs + DATCIE outputs)
    const tripToSave: Partial<Trip> = {
      userId,
      boatId: dto.boatId,
      departureTime,
      returnTime,

      // Base Trip fields
      distanceKm:
        prediction?.distance?.predictedDistanceKm ??
        prediction?.distance?.baseDistanceKm ??
        undefined,

      engineHorsePower: boat.engineHorsePower,
      boatType: boat.boatType,

      windSpeed: dto.windSpeed,
      waveHeight: dto.waveHeight,

      fuelPricePerLiter: dto.fuelPrice,

      // DATCIE fields
      predictedFuelLiters: prediction.fuel.predictedFuelLiters,
      predictedTotalCost: prediction.cost.predictedTotalCost,
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
    };

    // 4) Save
    const trip = await this.tripModel.create(tripToSave);

    // 5) Return
    return { trip, prediction };
  }

  // Keep if you already use it elsewhere
  async createTrip(userId: string, data: any) {
    return this.tripModel.create({
      userId,
      ...data,
    });
  }
}
