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
  UnauthorizedException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { Types } from 'mongoose';

import { AuthTokenGuard } from '../common/guards/auth-token.guard';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { LogActualDto } from './dto/log-actual.dto';
import { UpdateActualsDto } from './dto/update-actuals.dto';

@Controller('trips')
@UseGuards(AuthTokenGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  private getUserFromReq(req: ExpressRequest) {
    return (req as any).user ?? {};
  }

  private getUserId(req: ExpressRequest): string {
    const user = this.getUserFromReq(req);
    const userId = user?.userId || user?.id || user?.sub || user?._id;

    if (!userId) {
      throw new UnauthorizedException('User not found in token');
    }

    return String(userId);
  }

  private isAdmin(req: ExpressRequest): boolean {
    const user = this.getUserFromReq(req);
    return !!user?.isAdmin;
  }

  @Post()
  async create(
    @Req() req: ExpressRequest,
    @Body() createTripDto: CreateTripDto,
  ) {
    const userId = this.getUserId(req);
    return await this.tripsService.create(userId, createTripDto);
  }

  @Get('my-trips')
  async getMyTrips(@Req() req: ExpressRequest) {
    const userId = this.getUserId(req);
    return await this.tripsService.findByUser(userId);
  }

  @Get('my-stats')
  async getMyStats(@Req() req: ExpressRequest) {
    const userId = this.getUserId(req);
    return await this.tripsService.getUserStats(userId);
  }

  @Get()
  async findAll(@Req() req: ExpressRequest) {
    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);

    if (!isAdmin) {
      return await this.tripsService.findByUser(userId);
    }

    return await this.tripsService.findAll();
  }

  @Get('learning/summary')
  getLearningSummary() {
    return this.tripsService.getLearningSummary();
  }

  @Get(':id')
  async findOne(@Req() req: ExpressRequest, @Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid trip id');
    }

    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);

    return await this.tripsService.findOne(id, userId, isAdmin);
  }

  @Patch(':id')
  async update(
    @Req() req: ExpressRequest,
    @Param('id') id: string,
    @Body() updateTripDto: UpdateTripDto,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid trip id');
    }

    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);

    return await this.tripsService.update(id, userId, isAdmin, updateTripDto);
  }

  @Delete(':id')
  async remove(@Req() req: ExpressRequest, @Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid trip id');
    }

    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);

    return await this.tripsService.remove(id, userId, isAdmin);
  }

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

  @Patch(':id/actuals')
  updateActuals(
    @Req() req: ExpressRequest,
    @Param('id') id: string,
    @Body() dto: UpdateActualsDto,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid trip id');
    }

    const userId = this.getUserId(req);
    const isAdmin = this.isAdmin(req);

    return this.tripsService.updateActuals(id, userId, isAdmin, dto);
  }
}