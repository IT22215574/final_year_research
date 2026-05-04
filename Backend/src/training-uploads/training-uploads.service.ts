import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as Papa from 'papaparse';
import {
  UploadedDataset,
  UploadedDatasetDocument,
} from '../schemas/uploaded-dataset.schema';

interface ParsedRow {
  [key: string]: string | number | null;
}

interface MappedRecord {
  boatType: string;
  boatId: string;
  featuresSnapshot: Record<string, any>;
  labelSnapshot: Record<string, any>;
  validationStatus: 'VALID' | 'INVALID';
  validationMessage?: string;
}

@Injectable()
export class TrainingUploadsService {
  constructor(
    @InjectModel(UploadedDataset.name)
    private uploadModel: Model<UploadedDatasetDocument>,
  ) {}

  /**
   * Parse CSV file and validate/map data
   */
  private async parseCsvData(
    fileContent: string,
    boatType: string,
  ): Promise<{ records: any[]; errors: string[] }> {
    const validationErrors: string[] = [];
    const records: any[] = [];

    return new Promise((resolve) => {
      Papa.parse(fileContent, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors && result.errors.length > 0) {
            validationErrors.push(
              `CSV Parse Error: ${result.errors[0].message}`,
            );
            resolve({ records: [], errors: validationErrors });
            return;
          }

          const rows = result.data as ParsedRow[];
          let processedCount = 0;
          let errorCount = 0;

          rows.forEach((row, index) => {
            const mapped = this.mapAndValidateRow(row, boatType, index);
            if (mapped.validationStatus === 'VALID') {
              records.push(mapped);
              processedCount++;
            } else {
              errorCount++;
              if (mapped.validationMessage) {
                validationErrors.push(mapped.validationMessage);
              }
            }
          });

          resolve({
            records,
            errors:
              errorCount > 0
                ? [`${errorCount} rows failed validation`, ...validationErrors]
                : [],
          });
        },
        error: (error) => {
          validationErrors.push(`CSV parsing failed: ${error.message}`);
          resolve({ records: [], errors: validationErrors });
        },
      });
    });
  }

  /**
   * Parse JSON file and validate/map data
   */
  private parseJsonData(
    fileContent: string,
    boatType: string,
  ): { records: any[]; errors: string[] } {
    const validationErrors: string[] = [];
    const records: any[] = [];

    try {
      const parsed = JSON.parse(fileContent);
      const dataArray = Array.isArray(parsed) ? parsed : [parsed];

      let processedCount = 0;
      let errorCount = 0;

      dataArray.forEach((row, index) => {
        const mapped = this.mapAndValidateRow(
          row as ParsedRow,
          boatType,
          index,
        );
        if (mapped.validationStatus === 'VALID') {
          records.push(mapped);
          processedCount++;
        } else {
          errorCount++;
          if (mapped.validationMessage) {
            validationErrors.push(mapped.validationMessage);
          }
        }
      });

      return {
        records,
        errors:
          errorCount > 0
            ? [`${errorCount} records failed validation`, ...validationErrors]
            : [],
      };
    } catch (error: any) {
      validationErrors.push(`JSON parse error: ${error.message}`);
      return { records: [], errors: validationErrors };
    }
  }

  /**
   * Map and validate a single row of data
   * Flexible column matching for different input formats
   */
  private mapAndValidateRow(
    row: ParsedRow,
    boatType: string,
    rowIndex: number,
  ): MappedRecord {
    try {
      // Normalize keys (handle different case/spacing)
      const normalizedRow = this.normalizeRowKeys(row);

      // Extract boat ID (required) - convert to string
      const boatIdValue = this.extractFieldValue(normalizedRow, [
        'boatId',
        'boat_id',
        'bid',
      ]);
      const boatId = boatIdValue ? String(boatIdValue) : '';
      if (!boatId) {
        return {
          boatType,
          boatId: '',
          featuresSnapshot: {},
          labelSnapshot: {},
          validationStatus: 'INVALID',
          validationMessage: `Row ${rowIndex}: Missing boatId`,
        };
      }

      // Extract features (predictions)
      const featuresSnapshot = {
        speed: this.parseNumber(
          this.extractFieldValue(normalizedRow, ['speed', 'boat_speed']),
        ),
        weatherSeverityIndex: this.parseNumber(
          this.extractFieldValue(normalizedRow, [
            'weatherSeverityIndex',
            'weather_severity_index',
            'weather_index',
          ]),
        ),
        distanceKm: this.parseNumber(
          this.extractFieldValue(normalizedRow, [
            'distanceKm',
            'distance_km',
            'distance',
          ]),
        ),
        engineHP: this.parseNumber(
          this.extractFieldValue(normalizedRow, [
            'engineHP',
            'engine_hp',
            'horsePower',
            'horse_power',
          ]),
        ),
        fishingHours: this.parseNumber(
          this.extractFieldValue(normalizedRow, [
            'fishingHours',
            'fishing_hours',
            'hours',
          ]),
        ),
        numberOfDays: this.parseNumber(
          this.extractFieldValue(normalizedRow, [
            'numberOfDays',
            'number_of_days',
            'days',
          ]),
        ),
        predictedFuelLiters: this.parseNumber(
          this.extractFieldValue(normalizedRow, [
            'predictedFuelLiters',
            'predicted_fuel_liters',
            'predicted_fuel',
            'forecast_fuel',
          ]),
        ),
      };

      // Extract labels (actual values)
      const labelSnapshot = {
        actualFuelLiters: this.parseNumber(
          this.extractFieldValue(normalizedRow, [
            'actualFuelLiters',
            'actual_fuel_liters',
            'actual_fuel',
            'fuel_used',
            'fuelUsed',
          ]),
        ),
        actualCost: this.parseNumber(
          this.extractFieldValue(normalizedRow, [
            'actualCost',
            'actual_cost',
            'total_cost',
            'cost',
            'totalCost',
          ]),
        ),
      };

      // Validate that we have at least one feature and one label
      const hasFeatures = Object.values(featuresSnapshot).some(
        (v) => v != null,
      );
      const hasLabels = Object.values(labelSnapshot).some((v) => v != null);

      if (!hasFeatures || !hasLabels) {
        return {
          boatType,
          boatId,
          featuresSnapshot,
          labelSnapshot,
          validationStatus: 'INVALID',
          validationMessage: `Row ${rowIndex}: Missing required feature or label fields`,
        };
      }

      // Validate data ranges
      const rangeErrors = this.validateDataRanges(
        featuresSnapshot,
        labelSnapshot,
        rowIndex,
      );
      if (rangeErrors) {
        return {
          boatType,
          boatId,
          featuresSnapshot,
          labelSnapshot,
          validationStatus: 'INVALID',
          validationMessage: rangeErrors,
        };
      }

      return {
        boatType,
        boatId,
        featuresSnapshot,
        labelSnapshot,
        validationStatus: 'VALID',
      };
    } catch (error: any) {
      return {
        boatType,
        boatId: '',
        featuresSnapshot: {},
        labelSnapshot: {},
        validationStatus: 'INVALID',
        validationMessage: `Row ${rowIndex}: ${error.message}`,
      };
    }
  }

  /**
   * Normalize row keys to lowercase for flexible matching
   */
  private normalizeRowKeys(
    row: ParsedRow,
  ): Record<string, string | number | null> {
    const normalized: Record<string, string | number | null> = {};
    Object.keys(row).forEach((key) => {
      normalized[key.toLowerCase().replace(/\s+/g, '_')] = row[key];
    });
    return normalized;
  }

  /**
   * Extract field value using multiple possible column names
   */
  private extractFieldValue(
    row: Record<string, string | number | null>,
    possibleNames: string[],
  ): string | number | null {
    for (const name of possibleNames) {
      const key = name.toLowerCase().replace(/\s+/g, '_');
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return row[key];
      }
    }
    return null;
  }

  /**
   * Parse string to number, return null if invalid
   */
  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Validate data ranges and values
   */
  private validateDataRanges(
    features: Record<string, any>,
    labels: Record<string, any>,
    rowIndex: number,
  ): string | null {
    // Validate positive values where applicable
    if (
      features.distanceKm !== null &&
      features.distanceKm !== undefined &&
      features.distanceKm < 0
    ) {
      return `Row ${rowIndex}: distanceKm must be positive`;
    }

    if (
      features.engineHP !== null &&
      features.engineHP !== undefined &&
      features.engineHP < 0
    ) {
      return `Row ${rowIndex}: engineHP must be positive`;
    }

    if (
      labels.actualFuelLiters !== null &&
      labels.actualFuelLiters !== undefined &&
      labels.actualFuelLiters < 0
    ) {
      return `Row ${rowIndex}: actualFuelLiters must be positive`;
    }

    if (
      labels.actualCost !== null &&
      labels.actualCost !== undefined &&
      labels.actualCost < 0
    ) {
      return `Row ${rowIndex}: actualCost must be positive`;
    }

    return null;
  }

  /**
   * Upload and process CSV/JSON file
   */
  async uploadDataset(
    file: Express.Multer.File,
    uploaderId: string,
    boatType: string,
  ): Promise<UploadedDatasetDocument> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const filename = file.originalname;
    const fileContent = file.buffer.toString('utf-8');

    // Determine file type
    let uploadSource: 'csv' | 'json';
    if (filename.endsWith('.csv')) {
      uploadSource = 'csv';
    } else if (filename.endsWith('.json')) {
      uploadSource = 'json';
    } else {
      throw new BadRequestException('File must be CSV or JSON format');
    }

    // Parse file
    let parseResult: { records: any[]; errors: string[] };
    if (uploadSource === 'csv') {
      parseResult = await this.parseCsvData(fileContent, boatType);
    } else {
      parseResult = this.parseJsonData(fileContent, boatType);
    }

    const { records, errors: validationErrors } = parseResult;

    // Create dataset document
    const dataset = new this.uploadModel({
      uploaderId,
      filename,
      uploadSource,
      boatType,
      status: 'PENDING',
      rowCount: records.length,
      processedCount: records.filter((r) => r.validationStatus === 'VALID')
        .length,
      errorCount: records.filter((r) => r.validationStatus === 'INVALID')
        .length,
      records,
      validationErrors,
    });

    return await dataset.save();
  }

  /**
   * Get pending datasets (for admin review)
   */
  async getPendingDatasets(): Promise<UploadedDatasetDocument[]> {
    return await this.uploadModel
      .find({ status: 'PENDING' })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get approved datasets (for dataset management)
   */
  async getApprovedDatasets(
    boatType?: string,
  ): Promise<UploadedDatasetDocument[]> {
    const query: any = { status: { $in: ['APPROVED', 'TRAINED'] } };
    if (boatType) {
      query.boatType = boatType;
    }
    return await this.uploadModel.find(query).sort({ reviewedAt: -1 }).exec();
  }

  /**
   * Get all datasets (for viewing)
   */
  async getAllDatasets(boatType?: string): Promise<UploadedDatasetDocument[]> {
    const query: any = {};
    if (boatType) {
      query.boatType = boatType;
    }
    return await this.uploadModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get single dataset by ID
   */
  async getDatasetById(id: string): Promise<UploadedDatasetDocument> {
    const dataset = await this.uploadModel.findById(id).exec();
    if (!dataset) {
      throw new NotFoundException(`Dataset ${id} not found`);
    }
    return dataset;
  }

  /**
   * Approve dataset
   */
  async approveDataset(
    id: string,
    reviewerId: string,
    reason?: string,
  ): Promise<UploadedDatasetDocument> {
    const dataset = await this.getDatasetById(id);

    dataset.status = 'APPROVED';
    dataset.reviewerId = reviewerId;
    dataset.reviewReason = reason;
    dataset.reviewedAt = new Date();

    return await dataset.save();
  }

  /**
   * Reject dataset
   */
  async rejectDataset(
    id: string,
    reviewerId: string,
    reason: string,
  ): Promise<UploadedDatasetDocument> {
    const dataset = await this.getDatasetById(id);

    dataset.status = 'REJECTED';
    dataset.reviewerId = reviewerId;
    dataset.reviewReason = reason;
    dataset.reviewedAt = new Date();

    return await dataset.save();
  }

  /**
   * Mark datasets as trained (synced to CSV)
   */
  async markAsTrained(datasetIds: string[]): Promise<void> {
    await this.uploadModel.updateMany(
      { _id: { $in: datasetIds } },
      { status: 'TRAINED', synced: true, syncedAt: new Date() },
    );
  }

  /**
   * Get dataset statistics
   */
  async getDatasetStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    trained: number;
    byBoatType: Record<string, number>;
  }> {
    const stats = await this.uploadModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const byType = await this.uploadModel.aggregate([
      { $match: { status: { $in: ['APPROVED', 'TRAINED'] } } },
      {
        $group: {
          _id: '$boatType',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      pending: 0,
      approved: 0,
      rejected: 0,
      trained: 0,
      byBoatType: {},
    };

    stats.forEach((stat) => {
      result[stat._id.toLowerCase()] = stat.count;
    });

    byType.forEach((type) => {
      result.byBoatType[type._id] = type.count;
    });

    return result;
  }
}
