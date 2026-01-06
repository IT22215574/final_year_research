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
import { ExternalCostService } from './external-cost.service';
import { CreateExternalCostDto } from './dto/create-external-cost.dto';
import { UpdateExternalCostDto } from './dto/update-external-cost.dto';

@Controller('external-costs')
export class ExternalCostController {
  constructor(private readonly externalCostService: ExternalCostService) {}

  @Post()
  create(@Body() createExternalCostDto: CreateExternalCostDto) {
    console.log('Received POST request to create external cost');
    console.log('DTO:', JSON.stringify(createExternalCostDto, null, 2));
    return this.externalCostService.create(createExternalCostDto);
  }

  @Get()
  findAll(@Query('userId') userId: string, @Query('tripId') tripId?: string) {
    console.log('Received GET request for external costs');
    console.log('userId:', userId, 'tripId:', tripId);
    if (tripId) {
      return this.externalCostService.findByTrip(tripId);
    }
    return this.externalCostService.findByUser(userId);
  }

  @Get('summary')
  getSummary(@Query('userId') userId: string) {
    return this.externalCostService.getSummary(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.externalCostService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateExternalCostDto: UpdateExternalCostDto,
  ) {
    return this.externalCostService.update(id, updateExternalCostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.externalCostService.remove(id);
  }
}
