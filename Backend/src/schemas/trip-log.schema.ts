import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TripLogDocument = TripLog & Document;

@Schema({ timestamps: true })
export class TripLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  tripDate: string;

  @Prop({ required: true })
  departureTime: string;

  @Prop({ required: true })
  returnDate: string;

  @Prop({ required: true })
  returnTime: string;

  @Prop({ required: true })
  destination: string;

  @Prop()
  distance: number;

  @Prop()
  fuelUsed: number;

  @Prop()
  fuelCost: number;

  @Prop()
  crewSize: number;

  @Prop()
  catchWeight: number;

  @Prop()
  catchValue: number;

  @Prop()
  notes: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const TripLogSchema = SchemaFactory.createForClass(TripLog);
