import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TripLogService } from './trip-log.service';
import { CreateTripLogDto } from './dto/create-trip-log.dto';
import { UpdateTripLogDto } from './dto/update-trip-log.dto';

@Controller('trip-logs')
export class TripLogController {
  constructor(private readonly tripLogService: TripLogService) {}

  @Post()
  create(@Body() createTripLogDto: CreateTripLogDto) {
    console.log('POST /trip-logs - Creating new trip log');
    return this.tripLogService.create(createTripLogDto);
  }

  @Get()
  findAll(@Query('userId') userId?: string) {
    console.log('GET /trip-logs - Query params:', { userId });
    if (userId) {
      return this.tripLogService.findByUser(userId);
    }
    return this.tripLogService.findAll();
  }

  @Get('summary/:userId')
  getSummary(@Param('userId') userId: string) {
    console.log('GET /trip-logs/summary/:userId');
    return this.tripLogService.getSummary(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    console.log('GET /trip-logs/:id');
    return this.tripLogService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTripLogDto: UpdateTripLogDto) {
    console.log('PATCH /trip-logs/:id');
    return this.tripLogService.update(id, updateTripLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    console.log('DELETE /trip-logs/:id');
    return this.tripLogService.remove(id);
  }
}
