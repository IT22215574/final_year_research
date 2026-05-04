import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CostPreferenceDocument = HydratedDocument<CostPreference>;

@Schema({ timestamps: true })
export class CostPreference {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: '', trim: true })
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: true })
  autoApply: boolean;
}

export const CostPreferenceSchema =
  SchemaFactory.createForClass(CostPreference);
