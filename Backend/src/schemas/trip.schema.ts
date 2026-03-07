import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TripDocument = HydratedDocument<Trip>;

@Schema({ timestamps: true })
export class Trip {
  @Prop({ required: true })
  userId: string;

  // Route coordinates (for reproducibility)
  @Prop()
  startLat?: number;

  @Prop()
  startLon?: number;

  @Prop()
  endLat?: number;

  @Prop()
  endLon?: number;

  // Trip Duration
  @Prop({ required: true })
  departureTime: Date;

  @Prop({ required: true })
  returnTime: Date;

  // Derived field (calculated later, not stored directly)
  tripDurationHours: number;

  // Travel & Engine

  @Prop()
  boatId: string;

  @Prop()
  distanceKm: number;

  @Prop()
  engineHorsePower: number;

  // ✅ ML-friendly alias (keep engineHorsePower too)
  @Prop()
  engineHP?: number;

  @Prop()
  boatType: string;

  // Weather Factors
  @Prop()
  windSpeed: number;

  @Prop()
  waveHeight: number;

  @Prop()
  weatherCondition: string;

  // Fuel
  @Prop({ default: 0 })
  fuelUsedLiters: number;

  @Prop()
  fuelPricePerLiter: number;

  fuelCost: number; // derived

  // Operational Costs
  @Prop()
  iceCost: number;

  @Prop()
  crewCost: number;

  @Prop()
  foodCost: number;

  @Prop()
  maintenanceCost: number;

  @Prop()
  speed?: number;

  @Prop()
  averageSpeed?: number;

  @Prop()
  crewCount?: number;

  @Prop()
  fishingHours?: number;

  @Prop()
  otherCost: number;

  totalCost: number; // derived

  // =========================
  // DATCIE - Prediction Fields
  // =========================

  @Prop()
  predictedFuelLiters: number;

  @Prop()
  predictedTotalCost: number;

  @Prop()
  predictedDistanceKm: number;

  @Prop({ default: 0 })
  weatherSeverityIndex: number;

  @Prop()
  economicStressIndex: number;

  @Prop()
  profitabilityProbability: number;

  @Prop({ enum: ['low', 'medium', 'high'] })
  riskCategory: string;

  @Prop()
  carbonEmissionKg: number;

  @Prop()
  carbonPerKgCatch: number;

  // Predicted breakdown (store, don't mix with actual)
  @Prop()
  predictedFuelCost?: number;

  @Prop()
  predictedCrewCost?: number;

  @Prop({ type: [String], default: [] })
  optimizationRecommendations: string[];

  // =========================
  // DATCIE - Learning Fields
  // =========================

  // =========================
  // DATCIE - Learning Fields
  // =========================

  @Prop({ default: 0 })
  actualFuelLiters: number;

  @Prop({ default: 0 })
  actualCatchKg: number;

  @Prop({ default: 0 })
  fuelPredictionError: number;

  @Prop({ unique: true, sparse: true })
  clientRequestId?: string;

  // =========================
  // Trip Mode
  // =========================

  @Prop({ enum: ['island', 'international'], default: 'island' })
  mode: string;

  // timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const TripSchema = SchemaFactory.createForClass(Trip);

// 🔹 Virtuals (auto-calculated fields)
TripSchema.virtual('tripDurationHours').get(function () {
  if (this.departureTime && this.returnTime) {
    const diffMs = this.returnTime.getTime() - this.departureTime.getTime();
    return diffMs / (1000 * 60 * 60); // convert ms → hours
  }
  return null;
});

TripSchema.virtual('fuelCost').get(function () {
  if (this.fuelUsedLiters && this.fuelPricePerLiter) {
    return this.fuelUsedLiters * this.fuelPricePerLiter;
  }
  return 0;
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

// Ensure virtuals are included when converting to JSON
TripSchema.set('toJSON', { virtuals: true });
TripSchema.set('toObject', { virtuals: true });
