// Backend/src/cost-engine/cost-engine.service.ts
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

import { PredictCostDto } from './dto/predict-cost.dto';
import { PredictAndSaveDto } from './dto/predict-and-save.dto';

import {
  haversineDistanceKm,
  effectiveDistanceKm,
} from '../common/utils/haversine.util';
import { calculateWSI } from '../common/utils/wsi.util';
import { calculateFESI } from '../common/utils/fesi.util';
import { carbonMetrics } from '../common/utils/carbon.util';
import { OptimizeTripDto } from './dto/optimize-trip.dto';
import {
  calculateModeAdjustments,
  calculateInternationalAdditionalCosts,
  getModeRecommendations,
} from './utils/mode-calculator.util';

@Injectable()
export class CostEngineService {
  constructor(
    @InjectModel(Trip.name)
    private readonly tripModel: Model<TripDocument>,
    private readonly boatService: BoatService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
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

    // // 4) Fuel prediction (deterministic placeholder until Python adaptive model)
    // const fuelPerKmBase = 0.5; // liters per km baseline (tune later)
    // const fuelBase = predictedDistanceKm * fuelPerKmBase;

    // // weather 0..1 -> multiplier up to +50%
    // const weatherMultiplier = 1 + wsi * 0.5;

    // // learning coefficient from boat (default 1)
    // const efficiencyFactor = boat.fuelEfficiencyFactor ?? 1;

    // const predictedFuelLiters = fuelBase * weatherMultiplier * efficiencyFactor;

    // 4) Fuel prediction (Python ML + fallback)
    const baseUrl =
      this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:5001';

    // keep fallback fuel result ready
    const fuelPerKmBase = 0.5;
    const fuelBase = predictedDistanceKm * fuelPerKmBase;
    const weatherMultiplier = 1 + wsi * 0.5;
    const efficiencyFactor = boat.fuelEfficiencyFactor ?? 1;

    let mlFallback = false;

    // default = deterministic fallback
    let predictedFuelLiters = fuelBase * weatherMultiplier * efficiencyFactor;

    try {
      const fuelRes = await firstValueFrom(
        this.http.post(`${baseUrl}/predict-fuel-adaptive`, {
          boatId: dto.boatId,
          distanceKm: predictedDistanceKm,
          speed: dto.speed,
          engineHP: boat.engineHorsePower ?? 85,
          fishingHours: dto.fishingHours,
          weatherSeverityIndex: wsi,
          engineDegradation: 1 - (boat.engineDegradationFactor ?? 0),
          fuelEfficiencyFactor: efficiencyFactor,
        }),
      );

      const v = Number(fuelRes.data?.predictedFuelLiters);
      if (!Number.isFinite(v)) throw new Error('Invalid ML fuel output');
      predictedFuelLiters = v;
    } catch (e: any) {
      mlFallback = true;
      console.log(
        'ML fuel error:',
        e?.response?.status,
        e?.response?.data || e?.message || e,
      );
    }

    // ✅ SPEED EFFECT (needed for optimize to work)
    // Python model doesn't use speed yet, so we adjust here.
    const baseSpeed = 10; // knots (your "normal" speed)
    const speedAdjPerKnot = 0.03; // 3% fuel change per knot (tune later)
    const speedFactor = 1 + (dto.speed - baseSpeed) * speedAdjPerKnot;

    // clamp to avoid crazy values
    const clampedSpeedFactor = Math.max(0.7, Math.min(1.4, speedFactor));

    predictedFuelLiters = predictedFuelLiters * clampedSpeedFactor;

    // 5) Mode-specific adjustments (Island vs International)
    const mode = dto.mode || 'island';
    const tripDurationHours = dto.fishingHours + (predictedDistanceKm / dto.speed);
    
    const modeAdjustments = calculateModeAdjustments(
      mode,
      predictedDistanceKm,
      tripDurationHours,
      dto.crewCount,
    );

    // Apply mode-specific fuel adjustment
    const adjustedFuelLiters = predictedFuelLiters * modeAdjustments.fuelMultiplier;

    // 6) Enhanced Cost Calculation with Mode Logic
    const fuelCost = adjustedFuelLiters * dto.fuelPrice;
    
    // Mode-adjusted crew cost
    const baseCrew = dto.crewCount * 5000;
    const crewCost = baseCrew * modeAdjustments.crewMultiplier;
    
    // Additional mode-specific costs
    const equipmentCost = modeAdjustments.equipmentCost;
    const permitCost = modeAdjustments.permitCost;
    const communicationCost = modeAdjustments.communicationCost;
    
    // International-specific additional costs
    let internationalCosts = 0;
    if (mode === 'international') {
      const additionalCosts = calculateInternationalAdditionalCosts(
        predictedDistanceKm,
        tripDurationHours,
        dto.crewCount,
      );
      internationalCosts = Object.values(additionalCosts).reduce((sum, cost) => sum + cost, 0);
    }

    const operationalCost = fuelCost + crewCost + equipmentCost + permitCost + communicationCost + internationalCosts;
    
    // Apply mode-specific risk adjustment
    const riskAdjustedCost = operationalCost * modeAdjustments.riskMultiplier;
    
    // Apply FESI risk adjustment (on top of mode risk)
    const rawTotalCost = riskAdjustedCost * (1 + fesi * 0.15);
    
    // Apply insurance multiplier
    const predictedTotalCost = rawTotalCost * modeAdjustments.insuranceMultiplier;

    // 7) Carbon (using adjusted fuel consumption)
    const emissionFactor = 2.68; // kg CO2 per liter diesel (same as util default)
    const { carbonEmissionKg, carbonPerKgCatch } = carbonMetrics(
      adjustedFuelLiters,
      dto.expectedCatch,
    );

    // // 7) Profitability (placeholder)
    // const expectedRevenue = dto.expectedCatch * dto.marketPrice;
    // const profit = expectedRevenue - predictedTotalCost;
    // const profitabilityProbability = profit > 0 ? 0.8 : 0.3;

    // const riskCategory =
    //   profitabilityProbability >= 0.7
    //     ? 'low'
    //     : profitabilityProbability >= 0.45
    //       ? 'medium'
    //       : 'high';

    // 7) Profitability (Python ML + fallback)
    const expectedRevenue = dto.expectedCatch * dto.marketPrice;
    const profit = expectedRevenue - predictedTotalCost;

    // fallback defaults
    let profitabilityProbability = profit > 0 ? 0.8 : 0.3;
    let riskCategory: 'low' | 'medium' | 'high' =
      profitabilityProbability >= 0.7
        ? 'low'
        : profitabilityProbability >= 0.45
          ? 'medium'
          : 'high';

    try {
      const profRes = await firstValueFrom(
        this.http.post(`${baseUrl}/predict-profitability`, {
          expectedCatchKg: dto.expectedCatch,
          marketPrice: dto.marketPrice,
          predictedTotalCost,
        }),
      );

      const p = Number(profRes.data?.profitabilityProbability);
      const r = profRes.data?.riskCategory;

      if (Number.isFinite(p)) profitabilityProbability = p;
      if (r === 'low' || r === 'medium' || r === 'high') riskCategory = r;
    } catch (e: any) {
      mlFallback = true;
      console.log(
        'ML profitability error:',
        e?.response?.status,
        e?.response?.data || e?.message || e,
      );
    }

    // 8) Enhanced Recommendations with Mode-Specific Logic
    const recommendations: string[] = [];
    
    // Standard weather and economic recommendations
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
    if (adjustedFuelLiters > 120)
      recommendations.push(
        'High fuel usage predicted: optimize route and plan fuel usage carefully.',
      );
    
    // Add mode-specific recommendations
    const modeRecommendations = getModeRecommendations(mode, predictedDistanceKm, wsi);
    recommendations.push(...modeRecommendations);
    
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
        baseFuelLiters: predictedFuelLiters,
        adjustedFuelLiters,
        fuelPerKmBase,
        weatherMultiplier,
        efficiencyFactor,
        speedFactor: clampedSpeedFactor,
        modeMultiplier: modeAdjustments.fuelMultiplier,
      },
      cost: {
        fuelCost,
        crewCost,
        equipmentCost,
        permitCost,
        communicationCost,
        internationalCosts,
        operationalCost,
        riskAdjustedCost,
        rawTotalCost,
        predictedTotalCost,
      },
      mode: {
        selectedMode: mode,
        adjustments: modeAdjustments,
        tripDurationHours,
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
      mlFallback, // not calling Python yet
    };
  }

  //

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

    // ✅ C) Dedup: if mobile retries same request, return existing trip
    if (dto.clientRequestId) {
      const exists = await this.tripModel.findOne({
        clientRequestId: dto.clientRequestId,
      });

      if (exists) {
        return { trip: exists, prediction };
      }
    }

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
      clientRequestId: dto.clientRequestId,
      departureTime,
      returnTime,

      // ✅ recommended: store route inputs for research reproducibility
      startLat: dto.startLat,
      startLon: dto.startLon,
      endLat: dto.endLat,
      endLon: dto.endLon,

      // Base Trip fields
      distanceKm:
        prediction?.distance?.predictedDistanceKm ??
        prediction?.distance?.baseDistanceKm ??
        undefined,

      engineHorsePower: boat.engineHorsePower,

      // ✅ add this (for ML training feature name)
      engineHP: boat.engineHorsePower,

      boatType: boat.boatType,

      windSpeed: dto.windSpeed,
      waveHeight: dto.waveHeight,

      fuelPricePerLiter: dto.fuelPrice,

      // ✅ NEW: store prediction inputs (for dataset)
      speed: dto.speed,
      crewCount: dto.crewCount,
      fishingHours: dto.fishingHours,

      // DATCIE fields
      predictedFuelLiters: prediction.fuel.predictedFuelLiters,
      predictedTotalCost: prediction.cost.predictedTotalCost,

      // ✅ store predicted breakdown (for dataset) ✅ KEEP THESE
      predictedFuelCost: prediction.cost.fuelCost,
      predictedCrewCost: prediction.cost.crewCost,

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

  // =========================
  // Optimize Trip (Checkpoint D)
  // =========================

  async optimizeTrip(dto: OptimizeTripDto) {
    // speeds to test (you can change these)
    const speedsToTry = dto.speed
      ? [dto.speed] // if user provides speed, just evaluate that one
      : [8, 10, 12, 14];

    const results = [];

    for (const speed of speedsToTry) {
      const payload: PredictCostDto = { ...dto, speed };
      const prediction = await this.predictTrip(payload);

      const score = prediction.cost.predictedTotalCost;

      results.push({
        speed,
        score,
        prediction,
      });
    }

    // sort by best score
    results.sort((a, b) => a.score - b.score);

    const best = results[0];

    return {
      best: {
        speed: best.speed,
        predictedTotalCost: best.prediction.cost.predictedTotalCost,
        predictedFuelLiters: best.prediction.fuel.predictedFuelLiters,
        riskCategory: best.prediction.profitability.riskCategory,
        carbonEmissionKg: best.prediction.carbon.carbonEmissionKg,
        carbonPerKgCatch: best.prediction.carbon.carbonPerKgCatch,
        mlFallback: best.prediction.mlFallback,
        recommendations: best.prediction.recommendations,
      },
      candidates: results.map((r) => ({
        speed: r.speed,
        predictedTotalCost: r.prediction.cost.predictedTotalCost,
        predictedFuelLiters: r.prediction.fuel.predictedFuelLiters,
        riskCategory: r.prediction.profitability.riskCategory,
        carbonPerKgCatch: r.prediction.carbon.carbonPerKgCatch,
        mlFallback: r.prediction.mlFallback,
      })),
    };
  }

  // Keep if you already use it elsewhere
  async createTrip(userId: string, data: any) {
    return this.tripModel.create({
      userId,
      ...data,
    });
  }

  // ===========================
  // COMPREHENSIVE RISK ASSESSMENT
  // ===========================

  /**
   * Enhanced risk assessment with comprehensive analysis
   */
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
      const mlServiceUrl = this.config.get<string>('ML_SERVICE_BASE_URL') || 'http://localhost:8001';

      // Prepare comprehensive risk assessment data
      const riskData = {
        // Weather data
        weatherSeverityIndex: data.weatherData?.wsi || 0.5,
        windSpeed: data.weatherData?.windSpeed || 20,
        waveHeight: data.weatherData?.waveHeight || 2.0,
        tripDuration: data.tripDuration,
        tripDate: new Date().toISOString(),

        // Economic data
        predictedTotalCost: data.predictedCost,
        expectedRevenue: data.expectedRevenue,
        fuelCost: data.fuelCost,
        marketPrice: data.expectedRevenue / (data.boat?.expectedCatch || 100), // Derive market price

        // Operational data
        totalDistance: data.distance,
        boatAge: this.calculateBoatAge(data.boat?.manufactured),
        crewExperience: this.categorizeCrewExperience(data.boat?.crewExperience || 5),
        maintenanceScore: data.boat?.maintenanceScore || 0.8,
        boatType: this.categorizeBoatSize(data.boat?.lengthM || 15),

        // Equipment data
        engineCondition: data.boat?.engineCondition || 0.8,
        hasGPS: data.boat?.hasGPS !== false,
        hasRadio: data.boat?.hasRadio !== false,
        safetyEquipmentScore: data.boat?.safetyScore || 0.7,

        // Market data
        targetSpecies: data.boat?.targetSpecies || 'general',
        marketDemand: 0.7, // Could be enhanced with real market data
        priceVolatility: 0.3, // Could be enhanced with market analysis
        maxStorageTime: data.boat?.storageCapacity || 24,

        // Regulatory data
        hasValidLicense: data.boat?.hasValidLicense !== false,
        fishingZone: this.determineFishingZone(data.distance),
        quotaUsagePercent: 0.5, // Could be enhanced with quota tracking
        nearRestrictedAreas: false, // Could be enhanced with zone analysis
      };

      // Call ML service for comprehensive risk assessment
      const response = await firstValueFrom(
        this.http.post(`${mlServiceUrl}/assess/risk`, riskData, {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      return {
        success: true,
        riskAssessment: response.data,
        source: 'ml_service'
      };

    } catch (error) {
      console.error('ML risk assessment failed:', error.message);

      // Fallback to simplified risk assessment
      const fallbackRisk = this.calculateFallbackRisk(data);
      
      return {
        success: false,
        riskAssessment: fallbackRisk,
        source: 'fallback',
        error: error.message
      };
    }
  }

  private calculateBoatAge(manufacturedYear?: number): number {
    if (!manufacturedYear) return 5; // Default age
    return Math.max(0, new Date().getFullYear() - manufacturedYear);
  }

  private categorizeCrewExperience(experienceYears: number): string {
    if (experienceYears < 2) return 'novice';
    if (experienceYears < 5) return 'intermediate';
    if (experienceYears < 10) return 'experienced';
    return 'expert';
  }

  private categorizeBoatSize(lengthM: number): string {
    if (lengthM < 8) return 'small';
    if (lengthM < 15) return 'medium';
    if (lengthM < 25) return 'large';
    return 'commercial';
  }

  private determineFishingZone(distance: number): string {
    if (distance < 12) return 'coastal';         // 0-12 nautical miles
    if (distance < 50) return 'territorial';     // 12-50 nautical miles  
    if (distance < 200) return 'eez';           // 50-200 nautical miles (EEZ)
    return 'international';                      // Beyond 200 nautical miles
  }

  private calculateFallbackRisk(data: any): any {
    // Simplified fallback risk calculation
    const weatherRisk = data.weatherData?.wsi || 0.5;
    const distanceRisk = Math.min(data.distance / 200, 1.0);
    const economicRisk = data.predictedCost > data.expectedRevenue ? 0.8 : 0.3;

    const overallRisk = (weatherRisk * 0.4 + distanceRisk * 0.3 + economicRisk * 0.3);
    
    let riskCategory = 'low';
    if (overallRisk > 0.7) riskCategory = 'high';
    else if (overallRisk > 0.4) riskCategory = 'medium';

    return {
      overallRiskScore: Math.round(overallRisk * 1000) / 1000,
      riskCategory,
      riskLevel: riskCategory === 'high' ? 'concerning' : 'manageable',
      detailedAssessment: {
        weatherRisk: { score: weatherRisk, category: weatherRisk > 0.6 ? 'high' : 'medium' },
        economicRisk: { score: economicRisk, category: economicRisk > 0.6 ? 'high' : 'low' },
        operationalRisk: { score: distanceRisk, category: distanceRisk > 0.5 ? 'high' : 'medium' }
      },
      recommendedActions: [
        overallRisk > 0.7 ? 'Consider postponing trip due to high risk factors' :
        overallRisk > 0.4 ? 'Proceed with enhanced monitoring and safety measures' :
        'Acceptable risk level for proceeding with standard precautions'
      ],
      source: 'simplified_fallback'
    };
  }
}
