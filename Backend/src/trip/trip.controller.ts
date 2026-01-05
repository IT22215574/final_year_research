import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TripService } from './trip.service';
import { CreateTripDto, UpdateTripDto } from './dto';

@Controller('trips')
export class TripController {
  constructor(private readonly tripService: TripService) {}

  /**
   * Create a new trip
   * POST /trips
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTripDto: CreateTripDto) {
    const trip = await this.tripService.create(createTripDto);
    return {
      status: 'success',
      message: 'Trip created successfully',
      data: trip,
    };
  }

  /**
   * Get all trips with pagination
   * GET /trips?page=1&limit=10
   */
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const result = await this.tripService.findAll(
      parseInt(page),
      parseInt(limit),
    );
    return {
      status: 'success',
      data: result,
    };
  }

  /**
   * Get trips by user ID
   * GET /trips/user/:userId?page=1&limit=10
   */
  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const result = await this.tripService.findByUser(
      userId,
      parseInt(page),
      parseInt(limit),
    );
    return {
      status: 'success',
      data: result,
    };
  }

  /**
   * Get recent trips by user
   * GET /trips/user/:userId/recent?limit=5
   */
  @Get('user/:userId/recent')
  async findRecentByUser(
    @Param('userId') userId: string,
    @Query('limit') limit: string = '5',
  ) {
    const trips = await this.tripService.findRecentByUser(
      userId,
      parseInt(limit),
    );
    return {
      status: 'success',
      count: trips.length,
      data: trips,
    };
  }

  /**
   * Get user trip statistics
   * GET /trips/user/:userId/stats
   */
  @Get('user/:userId/stats')
  async getUserStats(@Param('userId') userId: string) {
    const stats = await this.tripService.getUserStats(userId);
    return {
      status: 'success',
      data: stats,
    };
  }

  /**
   * Get a single trip by ID
   * GET /trips/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const trip = await this.tripService.findOne(id);
    return {
      status: 'success',
      data: trip,
    };
  }

  /**
   * Update a trip
   * PATCH /trips/:id
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTripDto: UpdateTripDto) {
    const trip = await this.tripService.update(id, updateTripDto);
    return {
      status: 'success',
      message: 'Trip updated successfully',
      data: trip,
    };
  }

  /**
   * Delete a trip
   * DELETE /trips/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.tripService.remove(id);
  }
}
