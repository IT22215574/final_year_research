import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ModelVersionDocument = ModelVersion & Document;

@Schema({ timestamps: true })
export class ModelVersion {
  @Prop({ required: true })
  trainingJobId: string;

  @Prop({ required: true })
  algorithmType: string; // 'GLM', 'RandomForest', 'XGBoost', 'LightGBM'

  @Prop({ required: true, enum: ['GLOBAL', 'BOAT_TYPE'], default: 'GLOBAL' })
  scope: string;

  @Prop()
  boatType?: string;

  @Prop({ type: Object })
  metrics: Record<string, any>; // { mape, mae, rmse, r2 }

  @Prop()
  selectionScore: number; // Lower MAPE = better score

  @Prop()
  selectionRank: number; // 1 = best

  @Prop({
    required: true,
    enum: ['GOOD', 'BAD', 'PENDING'],
    default: 'PENDING',
  })
  quality: string;

  @Prop({
    required: true,
    enum: ['CANDIDATE', 'ACTIVE', 'RETIRED'],
    default: 'CANDIDATE',
  })
  status: string; // ACTIVE = currently used for predictions

  @Prop()
  promotedBy: string; // Admin who promoted it

  @Prop()
  promotedAt: Date;

  @Prop()
  artifactReference?: string;
}

export const ModelVersionSchema = SchemaFactory.createForClass(ModelVersion);
