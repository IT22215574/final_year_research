import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';

@Controller('trips')
@UseGuards(AuthTokenGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // Create trip
  @Post()
  async create(@Request() req, @Body() createTripDto: CreateTripDto) {
    return await this.tripsService.create(req.user.id, createTripDto);
  }

  // Get current user's trips
  @Get('my-trips')
  async getMyTrips(@Request() req) {
    return await this.tripsService.findByUser(req.user.id);
  }

  // Get current user's statistics
  @Get('my-stats')
  async getMyStats(@Request() req) {
    return await this.tripsService.getUserStats(req.user.id);
  }

  // Get all trips (admin only)
  @Get()
  async findAll(@Request() req) {
    if (!req.user.isAdmin) {
      return await this.tripsService.findByUser(req.user.id);
    }
    return await this.tripsService.findAll();
  }

  // Get single trip
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return await this.tripsService.findOne(id, req.user.id, req.user.isAdmin);
  }

  // Update trip
  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateTripDto: UpdateTripDto,
  ) {
    return await this.tripsService.update(
      id,
      req.user.id,
      req.user.isAdmin,
      updateTripDto,
    );
  }

  // Delete trip
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    await this.tripsService.remove(id, req.user.id, req.user.isAdmin);
    return { message: 'Trip deleted successfully' };
  }
}
