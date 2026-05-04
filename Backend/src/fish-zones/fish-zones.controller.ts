import { Controller, Get, Query, Param } from '@nestjs/common';
import { FishZonesService } from './fish-zones.service';

@Controller('fish-zones')
export class FishZonesController {
  constructor(private readonly fishZonesService: FishZonesService) {}

  @Get('latest')
  async getLatestFishZones(@Query('minProbability') minProbability?: string) {
    const minProb = minProbability ? parseFloat(minProbability) : 0;
    return this.fishZonesService.getLatestFishZones(minProb);
  }

  @Get('geojson')
  async getGeoJSON(@Query('minProbability') minProbability?: string) {
    const minProb = minProbability ? parseFloat(minProbability) : 0;
    return this.fishZonesService.getLatestGeoJSON(minProb);
  }

  @Get('heatmap')
  async getHeatmapPath() {
    return this.fishZonesService.getLatestHeatmapPath();
  }

  @Get('summary')
  async getSummary() {
    return this.fishZonesService.getLatestSummary();
  }

  @Get('date/:date')
  async getFishZonesByDate(@Param('date') date: string) {
    return this.fishZonesService.getFishZonesByDate(date);
  }

  @Get('statistics')
  async getStatistics() {
    return this.fishZonesService.getStatistics();
  }
}
