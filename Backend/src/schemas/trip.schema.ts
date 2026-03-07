import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TripDocument = HydratedDocument<Trip>;

@Schema({ timestamps: true })
export class Trip {
  @Prop({ required: true })
  userId: string;

  // =========================
  // Route coordinates
  // =========================
  @Prop()
  startLat?: number;

  @Prop()
  startLon?: number;

  @Prop()
  endLat?: number;

  @Prop()
  endLon?: number;

  // =========================
  // Trip time
  // =========================
  @Prop({ required: true })
  departureTime: Date;

  @Prop({ required: true })
  returnTime: Date;

  // virtual
  tripDurationHours: number;

  // =========================
  // Boat / travel
  // =========================
  @Prop()
  boatId?: string;

  @Prop()
  distanceKm?: number;

  @Prop()
  engineHorsePower?: number;

  @Prop()
  engineHP?: number;

  @Prop()
  boatType?: string;

  // =========================
  // Weather
  // =========================
  @Prop()
  windSpeed?: number;

  @Prop()
  waveHeight?: number;

  @Prop()
  weatherCondition?: string;

  // =========================
  // Input / basic trip costs
  // =========================
  @Prop({ default: 0 })
  fuelUsedLiters: number;

  @Prop({ default: 0 })
  fuelPricePerLiter: number;

  @Prop({ default: 0 })
  marketPrice?: number;

  // legacy/manual operational fields
  @Prop({ default: 0 })
  iceCost: number;

  @Prop({ default: 0 })
  crewCost: number;

  @Prop({ default: 0 })
  foodCost: number;

  @Prop({ default: 0 })
  maintenanceCost: number;

  @Prop({ default: 0 })
  otherCost: number;

  @Prop()
  speed?: number;

  @Prop()
  averageSpeed?: number;

  @Prop()
  crewCount?: number;

  @Prop()
  fishingHours?: number;

  // virtuals
  fuelCost: number;
  totalCost: number;

  // =========================
  // DATCIE - Prediction Fields
  // =========================
  @Prop({ default: 0 })
  predictedFuelLiters: number;

  @Prop({ default: 0 })
  predictedTotalCost: number;

  @Prop({ default: 0 })
  predictedDistanceKm: number;

  @Prop({ default: 0 })
  weatherSeverityIndex: number;

  @Prop({ default: 0 })
  economicStressIndex: number;

  @Prop({ default: 0 })
  profitabilityProbability: number;

  @Prop({ enum: ['low', 'medium', 'high'] })
  riskCategory?: string;

  @Prop({ default: 0 })
  carbonEmissionKg: number;

  @Prop({ default: 0 })
  carbonPerKgCatch: number;

  @Prop({ default: 0 })
  predictedFuelCost?: number;

  @Prop({ default: 0 })
  predictedCrewCost?: number;

  @Prop({ default: 0 })
  predictedOperationalCost?: number;

  @Prop({ type: [Object], default: [] })
  predictedExternalCosts?: Array<{
    name: string;
    category: string;
    amount: number;
    source?: 'manual' | 'preference';
    description?: string;
  }>;

  @Prop({ default: 0 })
  predictedExternalCostTotal?: number;

  @Prop({ type: [String], default: [] })
  optimizationRecommendations: string[];

  // =========================
  // DATCIE - Actual / Learning Fields
  // =========================
  @Prop({ default: 0 })
  actualFuelLiters: number;

  @Prop({ default: 0 })
  actualCatchKg: number;

  @Prop({ default: 0 })
  fuelPredictionError: number;

  @Prop({ default: 0 })
  actualFuelCost?: number;

  @Prop({ default: 0 })
  actualOperationalCost?: number;

  @Prop({ type: [Object], default: [] })
  actualExternalCosts?: Array<{
    name: string;
    category: string;
    amount: number;
    description?: string;
  }>;

  @Prop({ default: 0 })
  actualExternalCostTotal?: number;

  @Prop({ default: 0 })
  actualTotalCost?: number;

  @Prop({ default: 0 })
  actualRevenue?: number;

  @Prop({ default: 0 })
  actualProfit?: number;

  @Prop()
  actualLoggedAt?: Date;

  @Prop()
  actualNotes?: string;

  // =========================
  // Comparison Fields
  // =========================
  @Prop({ default: 0 })
  totalCostDifference?: number;

  @Prop({ default: 0 })
  externalCostDifference?: number;

  @Prop({ default: 0 })
  profitDifference?: number;

  @Prop({ default: 0 })
  fuelDifference?: number;

  // =========================
  // Request / mode / state
  // =========================
  @Prop({ unique: true, sparse: true })
  clientRequestId?: string;

  @Prop({ enum: ['island', 'international'], default: 'island' })
  mode: string;

  @Prop({ enum: ['planned', 'completed', 'cancelled'], default: 'planned' })
  status?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const TripSchema = SchemaFactory.createForClass(Trip);

// =========================
// Virtuals
// =========================
TripSchema.virtual('tripDurationHours').get(function () {
  if (this.departureTime && this.returnTime) {
    const diffMs = this.returnTime.getTime() - this.departureTime.getTime();
    return diffMs / (1000 * 60 * 60);
  }
  return null;
});

TripSchema.virtual('fuelCost').get(function () {
  const liters = this.fuelUsedLiters || 0;
  const price = this.fuelPricePerLiter || 0;
  return liters * price;
});

TripSchema.virtual('totalCost').get(function () {
  const fuel = this.fuelCost || 0;
  const ice = this.iceCost || 0;
  const crew = this.crewCost || 0;
  const food = this.foodCost || 0;
  const maintenance = this.maintenanceCost || 0;
  const other = this.otherCost || 0;

  return fuel + ice + crew + food + maintenance + other;
});

TripSchema.set('toJSON', { virtuals: true });
TripSchema.set('toObject', { virtuals: true });