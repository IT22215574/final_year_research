import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BoatDocument = HydratedDocument<Boat>;

@Schema({ timestamps: true })
export class Boat {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  boatName: string;

  @Prop()
  boatType: string;

  @Prop()
  engineHorsePower: number;

  @Prop()
  engineType: string;

  @Prop()
  boatValue: number; // used for depreciation

  // =========================
  // Learning Coefficients
  // =========================

  @Prop({ default: 1 })
  fuelEfficiencyFactor: number; // updated after each trip

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