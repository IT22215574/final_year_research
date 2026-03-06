// Backend/src/analytics/trips_analytics.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Parser } from 'json2csv';

import { Trip, TripDocument } from '../schemas/trip.schema';

@Injectable()
export class AnalyticsService {
  constructor(@InjectModel(Trip.name) private tripModel: Model<TripDocument>) {}

  // -----------------------------
  // 1) Export ALL trips to CSV
  // -----------------------------
  async exportTripsToCSV(): Promise<string> {
    const trips = await this.tripModel
      .find()
      .lean<(Trip & { _id: any; createdAt?: Date })[]>()
      .exec();

    if (!trips || trips.length === 0) {
      throw new Error('No trips to export');
    }

    const processedTrips = trips.map((trip) => {
      const departureTime = new Date(trip.departureTime);
      const returnTime = new Date(trip.returnTime);

      const tripDurationHours =
        (returnTime.getTime() - departureTime.getTime()) / (1000 * 60 * 60);

      const fuelCost =
        (trip.fuelUsedLiters || 0) * (trip.fuelPricePerLiter || 0);

      const totalCost =
        fuelCost +
        (trip.iceCost || 0) +
        (trip.crewCost || 0) +
        (trip.foodCost || 0) +
        (trip.maintenanceCost || 0) +
        (trip.otherCost || 0);

      return {
        tripId: trip._id,
        userId: trip.userId,

        departureTime: departureTime.toISOString(),
        returnTime: returnTime.toISOString(),
        tripDurationHours: Math.round(tripDurationHours * 100) / 100,

        distanceKm: trip.distanceKm || 0,
        engineHorsePower: trip.engineHorsePower || 0,
        boatType: trip.boatType || '',

        windSpeed: trip.windSpeed || 0,
        waveHeight: trip.waveHeight || 0,
        weatherCondition: trip.weatherCondition || '',

        fuelUsedLiters: trip.fuelUsedLiters || 0,
        fuelPricePerLiter: trip.fuelPricePerLiter || 0,
        fuelCost: Math.round(fuelCost * 100) / 100,

        iceCost: trip.iceCost || 0,
        crewCost: trip.crewCost || 0,
        foodCost: trip.foodCost || 0,
        maintenanceCost: trip.maintenanceCost || 0,
        otherCost: trip.otherCost || 0,

        totalCost: Math.round(totalCost * 100) / 100,
        createdAt: trip.createdAt ? new Date(trip.createdAt).toISOString() : '',
      };
    });

    const fields = [
      'tripId',
      'userId',
      'departureTime',
      'returnTime',
      'tripDurationHours',
      'distanceKm',
      'engineHorsePower',
      'boatType',
      'windSpeed',
      'waveHeight',
      'weatherCondition',
      'fuelUsedLiters',
      'fuelPricePerLiter',
      'fuelCost',
      'iceCost',
      'crewCost',
      'foodCost',
      'maintenanceCost',
      'otherCost',
      'totalCost',
      'createdAt',
    ];

    const parser = new Parser({ fields });
    return parser.parse(processedTrips);
  }

  // ---------------------------------------------------------
  // 2) Export ML fuel training dataset (clean 5-feature format)
  //    X: distanceKm, speed, engineHP, fishingHours, weatherSeverityIndex
  //    y: fuelUsedLiters
  // ---------------------------------------------------------
async exportFuelTrainingCSV(): Promise<string> {
  const trips = await this.tripModel
    .find()
    .lean<(Trip & { _id: any; createdAt?: Date })[]>()
    .exec();

  if (trips.length === 0) {
    throw new Error('No trips to export');
  }

  // ✅ Recommended: filter out bad rows for cleaner ML dataset
  const cleanTrips = trips.filter((t) =>
    (t.distanceKm ?? 0) > 0 &&
    ((t as any).speed ?? 0) > 0 &&
    (((t as any).engineHP ?? (t as any).engineHorsePower ?? 0) > 0) &&
    ((t as any).fishingHours ?? 0) >= 0 &&
    ((t as any).weatherSeverityIndex ?? 0) >= 0 &&
    ((t as any).fuelUsedLiters ?? 0) > 0
  );

  const rows = (cleanTrips.length > 0 ? cleanTrips : trips).map((t) => ({
    distanceKm: t.distanceKm ?? 0,
    speed: (t as any).speed ?? 0,
    // ✅ key fallback for older rows
    engineHP: (t as any).engineHP ?? (t as any).engineHorsePower ?? 0,
    fishingHours: (t as any).fishingHours ?? 0,
    weatherSeverityIndex: (t as any).weatherSeverityIndex ?? 0,

    // ✅ label (REAL fuel value)
    fuelUsedLiters: (t as any).fuelUsedLiters ?? 0,

    // optional but useful for filtering/versioning
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : '',
  }));

  const fields = [
    'distanceKm',
    'speed',
    'engineHP',
    'fishingHours',
    'weatherSeverityIndex',
    'fuelUsedLiters',
    'createdAt',
  ];

  const parser = new Parser({ fields });
  return parser.parse(rows);
}
  // -----------------------------
  // 3) Overall analytics summary
  // -----------------------------
  async getOverallAnalytics() {
    const trips = await this.tripModel
      .find()
      .lean<(Trip & { _id: any; createdAt?: Date })[]>()
      .exec();

    if (!trips || trips.length === 0) {
      return {
        totalTrips: 0,
        totalUsers: 0,
        totalFuelUsed: 0,
        totalDistance: 0,
        averageTripDuration: 0,
        totalCostAllTrips: 0,
        averageCostPerTrip: 0,
      };
    }

    const uniqueUsers = new Set(trips.map((t) => String(t.userId))).size;

    const totalFuelUsed = trips.reduce(
      (sum, t) => sum + (t.fuelUsedLiters || 0),
      0,
    );

    const totalDistance = trips.reduce(
      (sum, t) => sum + (t.distanceKm || 0),
      0,
    );

    let totalDuration = 0;
    let totalCost = 0;

    trips.forEach((trip) => {
      const departure = new Date(trip.departureTime);
      const ret = new Date(trip.returnTime);

      const duration = (ret.getTime() - departure.getTime()) / (1000 * 60 * 60);
      totalDuration += duration;

      const fuelCost =
        (trip.fuelUsedLiters || 0) * (trip.fuelPricePerLiter || 0);

      const tripCost =
        fuelCost +
        (trip.iceCost || 0) +
        (trip.crewCost || 0) +
        (trip.foodCost || 0) +
        (trip.maintenanceCost || 0) +
        (trip.otherCost || 0);

      totalCost += tripCost;
    });

    return {
      totalTrips: trips.length,
      totalUsers: uniqueUsers,
      totalFuelUsed: Math.round(totalFuelUsed * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100,
      averageTripDuration: Math.round((totalDuration / trips.length) * 100) / 100,
      totalCostAllTrips: Math.round(totalCost * 100) / 100,
      averageCostPerTrip: Math.round((totalCost / trips.length) * 100) / 100,
    };
  }
}