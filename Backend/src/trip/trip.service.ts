import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Trip, TripDocument } from '../schemas/trip.schema';
import { CreateTripDto, UpdateTripDto } from './dto';

@Injectable()
export class TripService {
  constructor(@InjectModel(Trip.name) private tripModel: Model<TripDocument>) {}

  /**
   * Create a new trip record
   */
  async create(createTripDto: CreateTripDto): Promise<Trip> {
    const createdTrip = new this.tripModel({
      ...createTripDto,
      userId: new Types.ObjectId(createTripDto.userId),
    });
    return createdTrip.save();
  }

  /**
   * Get all trips (with pagination)
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    trips: Trip[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [trips, total] = await Promise.all([
      this.tripModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName phone')
        .exec(),
      this.tripModel.countDocuments(),
    ]);

    return {
      trips,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get trips by user ID
   */
  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    trips: Trip[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const userObjectId = new Types.ObjectId(userId);

    const [trips, total] = await Promise.all([
      this.tripModel
        .find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.tripModel.countDocuments({ userId: userObjectId }),
    ]);

    return {
      trips,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get recent trips by user (last 5)
   */
  async findRecentByUser(userId: string, limit: number = 5): Promise<Trip[]> {
    const userObjectId = new Types.ObjectId(userId);
    return this.tripModel
      .find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get a single trip by ID
   */
  async findOne(id: string): Promise<Trip> {
    const trip = await this.tripModel
      .findById(id)
      .populate('userId', 'firstName lastName phone email')
      .exec();

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    return trip;
  }

  /**
   * Update a trip
   */
  async update(id: string, updateTripDto: UpdateTripDto): Promise<Trip> {
    const updatedTrip = await this.tripModel
      .findByIdAndUpdate(id, updateTripDto, { new: true })
      .exec();

    if (!updatedTrip) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    return updatedTrip;
  }

  /**
   * Delete a trip
   */
  async remove(id: string): Promise<void> {
    const result = await this.tripModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }
  }

  /**
   * Get trip statistics by user
   */
  async getUserStats(userId: string): Promise<{
    totalTrips: number;
    totalCost: number;
    avgCostPerTrip: number;
    totalDistance: number;
    statusBreakdown: { status: string; count: number }[];
  }> {
    const userObjectId = new Types.ObjectId(userId);

    const [totalTrips, costStats, distanceStats, statusBreakdown] =
      await Promise.all([
        this.tripModel.countDocuments({ userId: userObjectId }),
        this.tripModel.aggregate([
          { $match: { userId: userObjectId } },
          {
            $group: {
              _id: null,
              totalCost: { $sum: '$totalTripCost' },
              avgCost: { $avg: '$totalTripCost' },
            },
          },
        ]),
        this.tripModel.aggregate([
          { $match: { userId: userObjectId } },
          {
            $group: {
              _id: null,
              totalDistance: { $sum: '$distanceKm' },
            },
          },
        ]),
        this.tripModel.aggregate([
          { $match: { userId: userObjectId } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: 1,
            },
          },
        ]),
      ]);

    return {
      totalTrips,
      totalCost: costStats[0]?.totalCost || 0,
      avgCostPerTrip: costStats[0]?.avgCost || 0,
      totalDistance: distanceStats[0]?.totalDistance || 0,
      statusBreakdown,
    };
  }
}
