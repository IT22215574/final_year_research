import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

export interface FishZone {
  lat: number;
  lon: number;
  sst: number;
  chlor_a: number;
  water_u: number;
  water_v: number;
  fish_zone: number;
  fish_probability: number;
}

export interface FishZoneGeoJSON {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: [number, number];
    };
    properties: {
      fish_zone: number;
      fish_probability: number;
      sst: number;
      chlorophyll: number;
      current_u: number;
      current_v: number;
    };
  }>;
}

@Injectable()
export class FishZonesService {
  private readonly predictionsDir: string;

  constructor() {
    // Path to model predictions directory
    this.predictionsDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'model',
      'fish_zone_predictions',
    );
  }

  /**
   * Get the latest prediction CSV file
   */
  private getLatestPredictionFile(extension: string): string | null {
    try {
      const files = fs
        .readdirSync(this.predictionsDir)
        .filter((file) => file.endsWith(extension))
        .sort()
        .reverse();

      return files.length > 0
        ? path.join(this.predictionsDir, files[0])
        : null;
    } catch (error) {
      console.error('Error reading predictions directory:', error);
      return null;
    }
  }

  /**
   * Read and parse CSV file
   */
  private async readCSV(filePath: string): Promise<FishZone[]> {
    return new Promise((resolve, reject) => {
      const results: FishZone[] = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          results.push({
            lat: parseFloat(data.lat),
            lon: parseFloat(data.lon),
            sst: parseFloat(data.sst),
            chlor_a: parseFloat(data.chlor_a),
            water_u: parseFloat(data.water_u),
            water_v: parseFloat(data.water_v),
            fish_zone: parseInt(data.fish_zone),
            fish_probability: parseFloat(data.fish_probability),
          });
        })
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Get latest fish zones with optional probability filter
   */
  async getLatestFishZones(minProbability: number = 0): Promise<{
    data: FishZone[];
    metadata: {
      total: number;
      fishZones: number;
      highProbabilityZones: number;
      date: string;
    };
  }> {
    const csvFile = this.getLatestPredictionFile('.csv');

    if (!csvFile) {
      throw new NotFoundException('No fish zone predictions available');
    }

    const allZones = await this.readCSV(csvFile);
    const filteredZones = allZones.filter(
      (zone) => zone.fish_probability >= minProbability,
    );

    // Extract date from filename (e.g., fish_zones_2026-03-10.csv)
    const filename = path.basename(csvFile);
    const dateMatch = filename.match(/\d{4}-\d{2}-\d{2}/);
    const date = dateMatch ? dateMatch[0] : 'unknown';

    return {
      data: filteredZones,
      metadata: {
        total: allZones.length,
        fishZones: allZones.filter((z) => z.fish_zone === 1).length,
        highProbabilityZones: allZones.filter((z) => z.fish_probability > 0.7)
          .length,
        date,
      },
    };
  }

  /**
   * Get latest predictions as GeoJSON
   */
  async getLatestGeoJSON(
    minProbability: number = 0,
  ): Promise<FishZoneGeoJSON> {
    const geojsonFile = this.getLatestPredictionFile('.geojson');

    if (geojsonFile && fs.existsSync(geojsonFile)) {
      const geojsonData = JSON.parse(
        fs.readFileSync(geojsonFile, 'utf-8'),
      ) as FishZoneGeoJSON;

      // Filter by probability if needed
      if (minProbability > 0) {
        geojsonData.features = geojsonData.features.filter(
          (feature) => feature.properties.fish_probability >= minProbability,
        );
      }

      return geojsonData;
    }

    // Fallback: generate GeoJSON from CSV
    const { data } = await this.getLatestFishZones(minProbability);

    return {
      type: 'FeatureCollection',
      features: data.map((zone) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [zone.lon, zone.lat],
        },
        properties: {
          fish_zone: zone.fish_zone,
          fish_probability: zone.fish_probability,
          sst: zone.sst,
          chlorophyll: zone.chlor_a,
          current_u: zone.water_u,
          current_v: zone.water_v,
        },
      })),
    };
  }

  /**
   * Get path to latest heatmap image
   */
  async getLatestHeatmapPath(): Promise<{ path: string; date: string }> {
    const heatmapFile = this.getLatestPredictionFile('_heatmap.png');

    if (!heatmapFile) {
      throw new NotFoundException('No heatmap available');
    }

    const filename = path.basename(heatmapFile);
    const dateMatch = filename.match(/\d{4}-\d{2}-\d{2}/);
    const date = dateMatch ? dateMatch[0] : 'unknown';

    return {
      path: heatmapFile,
      date,
    };
  }

  /**
   * Get summary statistics
   */
  async getLatestSummary(): Promise<{
    date: string;
    content: string;
  }> {
    const summaryFile = this.getLatestPredictionFile('.txt');

    if (!summaryFile) {
      throw new NotFoundException('No summary available');
    }

    const content = fs.readFileSync(summaryFile, 'utf-8');
    const filename = path.basename(summaryFile);
    const dateMatch = filename.match(/\d{4}-\d{2}-\d{2}/);
    const date = dateMatch ? dateMatch[0] : 'unknown';

    return {
      date,
      content,
    };
  }

  /**
   * Get fish zones by specific date
   */
  async getFishZonesByDate(date: string): Promise<{
    data: FishZone[];
    metadata: {
      date: string;
      found: boolean;
    };
  }> {
    const csvFile = path.join(this.predictionsDir, `fish_zones_${date}.csv`);

    if (!fs.existsSync(csvFile)) {
      throw new NotFoundException(`No predictions found for date: ${date}`);
    }

    const zones = await this.readCSV(csvFile);

    return {
      data: zones,
      metadata: {
        date,
        found: true,
      },
    };
  }

  /**
   * Get general statistics about predictions
   */
  async getStatistics(): Promise<{
    availableDates: string[];
    latestDate: string;
    totalPredictions: number;
  }> {
    try {
      const files = fs
        .readdirSync(this.predictionsDir)
        .filter((file) => file.match(/fish_zones_\d{4}-\d{2}-\d{2}\.csv/));

      const dates = files
        .map((file) => {
          const match = file.match(/\d{4}-\d{2}-\d{2}/);
          return match ? match[0] : null;
        })
        .filter((date) => date !== null)
        .sort()
        .reverse();

      const latestFile = this.getLatestPredictionFile('.csv');
      let totalPredictions = 0;

      if (latestFile) {
        const zones = await this.readCSV(latestFile);
        totalPredictions = zones.length;
      }

      return {
        availableDates: dates,
        latestDate: dates[0] || 'none',
        totalPredictions,
      };
    } catch (error) {
      return {
        availableDates: [],
        latestDate: 'none',
        totalPredictions: 0,
      };
    }
  }
}
