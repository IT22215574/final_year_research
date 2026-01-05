import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TripDocument = Trip & Document;

@Schema({ timestamps: true })
export class Trip {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  // Trip Details
  @Prop({ required: true })
  boatType: string;

  @Prop({ required: true })
  engineHp: number;

  @Prop({ required: true })
  tripDays: number;

  @Prop({ required: true })
  distanceKm: number;

  @Prop({ required: true })
  windKph: number;

  @Prop({ required: true })
  waveM: number;

  @Prop({ required: true })
  month: number;

  @Prop({ required: true })
  portName: string;

  @Prop()
  fishingZone: string;

  @Prop()
  fishingZoneId: string;

  // Fuel Prices
  @Prop({ required: true })
  dieselPriceLKR: number;

  @Prop({ required: true })
  petrolPriceLKR: number;

  @Prop({ required: true })
  kerosenePriceLKR: number;

  // Base Costs (from ML prediction)
  @Prop({ required: true })
  baseCost: number;

  @Prop({ required: true })
  fuelCostEstimate: number;

  @Prop({ required: true })
  iceCostEstimate: number;

  // External Costs
  @Prop({
    type: [
      {
        type: { type: String, required: true },
        amount: { type: Number, required: true },
        description: { type: String },
      },
    ],
    default: [],
  })
  externalCosts: Array<{
    type: string;
    amount: number;
    description?: string;
  }>;

  @Prop({ required: true, default: 0 })
  externalCostsTotal: number;

  // Total Cost
  @Prop({ required: true })
  totalTripCost: number;

  @Prop({ default: 'LKR' })
  currency: string;

  // Breakdown percentages
  @Prop({ type: Object })
  breakdown: {
    baseCostPercentage: number;
    externalCostsPercentage: number;
  };

  // Trip Status
  @Prop({
    type: String,
    enum: ['planned', 'ongoing', 'completed', 'cancelled'],
    default: 'planned',
  })
  status: string;

  @Prop()
  notes: string;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;
}

export const TripSchema = SchemaFactory.createForClass(Trip);

// Add indexes for better query performance
TripSchema.index({ userId: 1, createdAt: -1 });
TripSchema.index({ status: 1 });
