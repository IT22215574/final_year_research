import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TripCoefficientDocument = HydratedDocument<TripCoefficient>;

@Schema({ timestamps: true })
export class TripCoefficient {

  @Prop({ required: true })
  tripId: string;

  @Prop({ required: true })
  boatId: string;

  @Prop()
  previousFuelEfficiencyFactor: number;

  @Prop()
  updatedFuelEfficiencyFactor: number;

  @Prop()
  predictionError: number;

  @Prop()
  adjustmentApplied: number;
}

export const TripCoefficientSchema = SchemaFactory.createForClass(TripCoefficient);