import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GradingRecordDocument = GradingRecord & Document;

@Schema({ timestamps: true })
export class GradingRecord {
  /** The user who ran the grading */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  /** Model label (e.g. "tuna", "makerel") */
  @Prop({ trim: true })
  fishSpecies: string;

  /** Human-readable display name (e.g. "Skipjack Tuna") */
  @Prop({ trim: true })
  fishName: string;

  /** Grade returned by the model: "A" | "B" | "C" | null */
  @Prop({ trim: true })
  predictedGrade: string;

  /** Confidence score for the grade (0–1) */
  @Prop({ type: Number, min: 0, max: 1 })
  gradeConfidence: number;

  /** Confidence score for the species (0–1) */
  @Prop({ type: Number, min: 0, max: 1 })
  speciesConfidence: number;

  /** Relative paths to uploaded images under /uploads/grading-records/ */
  @Prop({ type: [String], default: [] })
  imagePaths: string[];

  /** Optional notes the user may add */
  @Prop({ trim: true, default: '' })
  notes: string;

  /**
   * Whether this record has been linked to a market listing.
   * "saved"        — stored but not yet used in market
   * "used_in_market" — linked to a daily fish market entry
   */
  @Prop({
    type: String,
    enum: ['saved', 'used_in_market'],
    default: 'saved',
  })
  marketStatus: 'saved' | 'used_in_market';
}

export const GradingRecordSchema = SchemaFactory.createForClass(GradingRecord);
