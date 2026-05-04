import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FuelPriceDocument = HydratedDocument<FuelPrice>;

@Schema({ timestamps: true })
export class FuelPrice {
  @Prop({ required: true })
  pricePerLiter: number;

  @Prop({ required: true })
  effectiveDate: Date;

  @Prop({ default: 'LKR' })
  currency: string;
}

export const FuelPriceSchema = SchemaFactory.createForClass(FuelPrice);
