import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ExternalCost extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Trip', required: false })
  tripId?: Types.ObjectId;

  @Prop({ required: true })
  costType: string;

  @Prop({ required: true })
  unit: string;

  @Prop({ required: true, type: Number })
  unitPrice: number;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ required: true, type: Number })
  totalPrice: number;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ExternalCostSchema = SchemaFactory.createForClass(ExternalCost);
