import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BoatTypeDocument = HydratedDocument<BoatType>;

@Schema({ timestamps: true })
export class BoatType {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ default: true })
  active: boolean;

  @Prop()
  description?: string;

  @Prop()
  fuelPerKm?: number;

  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;
}

export const BoatTypeSchema = SchemaFactory.createForClass(BoatType);
