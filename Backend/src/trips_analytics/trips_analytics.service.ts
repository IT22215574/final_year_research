import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trip, TripDocument } from '../schemas/trip.schema';
import { Parser } from 'json2csv';

@Injectable()
export class AnalyticsService {
  constructor(@InjectModel(Trip.name) private tripModel: Model<TripDocument>) {}

  // Export all trips to CSV
  async exportTripsToCSV(): Promise<string> {
    const trips = await this.tripModel
  .find()
  .lean<(Trip & { _id: any; createdAt?: Date })[]>()
  .exec();

    if (trips.length === 0) {
      throw new Error('No trips to export');
    }

    // Calculate derived fields for each trip
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
        createdAt: trip.createdAt,
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

  // Get overall analytics
  async getOverallAnalytics() {
   const trips = await this.tripModel
  .find()
  .lean<(Trip & { _id: any; createdAt?: Date })[]>()
  .exec();
    if (trips.length === 0) {
      return {
        totalTrips: 0,
        totalUsers: 0,
        totalFuelUsed: 0,
        totalDistance: 0,
        averageTripDuration: 0,
        totalCostAllTrips: 0,
      };
    }

    const uniqueUsers = new Set(trips.map((t) => t.userId)).size;
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
      const returnTime = new Date(trip.returnTime);
      const duration =
        (returnTime.getTime() - departure.getTime()) / (1000 * 60 * 60);
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
      averageTripDuration:
        Math.round((totalDuration / trips.length) * 100) / 100,
      totalCostAllTrips: Math.round(totalCost * 100) / 100,
      averageCostPerTrip: Math.round((totalCost / trips.length) * 100) / 100,
    };
  }
}
