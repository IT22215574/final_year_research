import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UploadedDatasetDocument = UploadedDataset & Document;

@Schema({ timestamps: true })
export class UploadedDataset {
  // ========== UPLOAD METADATA ==========
  @Prop({ required: true })
  uploaderId: string; // Admin user ID who uploaded

  @Prop({ required: true })
  filename: string; // Original filename

  @Prop({ required: true, enum: ['csv', 'json'] })
  uploadSource: 'csv' | 'json'; // File format

  @Prop({ required: true, enum: ['IDAT', 'IMUI', 'MTRP', 'OFRP'] })
  boatType: string; // Boat type classification

  // ========== PROCESSING STATUS ==========
  @Prop({
    required: true,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'TRAINED'],
    default: 'PENDING',
  })
  status: string; // Approval workflow status

  // ========== VALIDATION & PROCESSING ==========
  @Prop({ default: 0 })
  rowCount: number; // Total rows in upload

  @Prop({ default: 0 })
  processedCount: number; // Successfully processed rows

  @Prop({ default: 0 })
  errorCount: number; // Failed validation rows

  @Prop({ type: [String], default: [] })
  validationErrors: string[]; // Errors found during validation

  @Prop({ type: [Object], default: [] })
  records: Array<{
    _id?: string;
    boatType: string;
    sourceTripId: string | null; // null for uploads, ID for manual trips
    uploadSourceId?: string; // Reference back to UploadedDataset
    boatId: string;
    featuresSnapshot: {
      speed?: number;
      weatherSeverityIndex?: number;
      distanceKm?: number;
      engineHP?: number;
      fishingHours?: number;
      numberOfDays?: number;
      predictedFuelLiters?: number;
      [key: string]: any;
    };
    labelSnapshot: {
      actualFuelLiters?: number;
      actualCost?: number;
      [key: string]: any;
    };
    validationStatus: 'VALID' | 'INVALID';
    validationMessage?: string;
  }>; // Processed data records

  // ========== APPROVAL WORKFLOW ==========
  @Prop()
  reviewerId?: string; // Admin who reviewed

  @Prop()
  reviewReason?: string; // Approval/rejection reason

  @Prop()
  reviewedAt?: Date; // When approved/rejected

  // ========== AUDIT TRAIL ==========
  @Prop()
  synced?: boolean; // Whether included in dataset CSV sync

  @Prop()
  syncedAt?: Date; // When last synced to CSV files

  createdAt: Date;
  updatedAt: Date;
}

export const UploadedDatasetSchema =
  SchemaFactory.createForClass(UploadedDataset);
