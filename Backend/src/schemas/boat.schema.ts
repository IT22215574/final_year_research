import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BoatDocument = HydratedDocument<Boat>;

@Schema({ timestamps: true })
export class Boat {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, trim: true })
  boatName: string;

  @Prop({ required: true })
  boatType: string;

  @Prop({ required: true })
  engineHorsePower: number;

  @Prop()
  engineType: string;

  @Prop()
  boatValue: number; // used for depreciation

  // =========================
  // ✅ NEW: Image + Extra Specs
  // =========================

  // Store image path like: /uploads/boats/boat-USERID-TIME-name.png
  @Prop()
  boatImage?: string;

  // Free text specs (optional)
  @Prop()
  specifications?: string;

  @Prop()
  boatLength?: number;

  @Prop()
  boatWidth?: number;

  @Prop()
  registrationNumber?: string;

  // =========================
  // Learning Coefficients
  // =========================

  @Prop({ default: 1 })
  fuelEfficiencyFactor: number;

  @Prop({ default: 0.05 })
  engineDegradationFactor: number;

  @Prop({ default: 0 })
  averageFuelPredictionError: number;

  // =========================
  // Mode
  // =========================

  @Prop({ enum: ['island', 'international'], default: 'island' })
  mode: string;
}

export const BoatSchema = SchemaFactory.createForClass(Boat);