import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { Types } from 'mongoose';

import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { LogActualDto } from './dto/log-actual.dto';

@Controller('trips')
@UseGuards(AuthTokenGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // Create trip
  @Post()
  async create(@Req() req: ExpressRequest, @Body() createTripDto: CreateTripDto) {
    const user = (req as any).user;
    return await this.tripsService.create(user.id, createTripDto);
  }

  // Get current user's trips
  @Get('my-trips')
  async getMyTrips(@Req() req: ExpressRequest) {
    const user = (req as any).user;
    return await this.tripsService.findByUser(user.id);
  }

  // Get current user's statistics
  @Get('my-stats')
  async getMyStats(@Req() req: ExpressRequest) {
    const user = (req as any).user;
    return await this.tripsService.getUserStats(user.id);
  }

  // Get all trips (admin only)
  @Get()
  async findAll(@Req() req: ExpressRequest) {
    const user = (req as any).user;
    if (!user?.isAdmin) {
      return await this.tripsService.findByUser(user.id);
    }
    return await this.tripsService.findAll();
  }

  // Get single trip
  @Get(':id')
  async findOne(@Req() req: ExpressRequest, @Param('id') id: string) {
    const user = (req as any).user;
    return await this.tripsService.findOne(id, user.id, user.isAdmin);
  }

  // Update trip
  @Patch(':id')
  async update(
    @Req() req: ExpressRequest,
    @Param('id') id: string,
    @Body() updateTripDto: UpdateTripDto,
  ) {
    const user = (req as any).user;
    return await this.tripsService.update(id, user.id, user.isAdmin, updateTripDto);
  }

  // Delete trip
  @Delete(':id')
  async remove(@Req() req: ExpressRequest, @Param('id') id: string) {
    const user = (req as any).user;
    await this.tripsService.remove(id, user.id, user.isAdmin);
    return { message: 'Trip deleted successfully' };
  }

  // Log actual data for a trip
  @Post(':id/log-actual')
  logActual(
    @Param('id') id: string,
    @Body() dto: LogActualDto,
    @Req() req: ExpressRequest,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid trip id');
    }
    return this.tripsService.logActualData(id, dto, req);
  }
}