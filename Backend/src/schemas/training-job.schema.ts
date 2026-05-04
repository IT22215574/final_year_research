import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type TrainingJobDocument = TrainingJob & Document;
@Schema({ timestamps: true })
export class TrainingJob {
  @Prop({ required: true })
  startedBy: string;
  @Prop({ required: true, enum: ['GLOBAL', 'BOAT_TYPE'], default: 'GLOBAL' })
  scope: string;
  @Prop()
  boatType?: string;
  @Prop({
    required: true,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING',
  })
  status: string;
  @Prop()
  recordsProcessed: number;
  @Prop({ type: Object })
  mlMetrics: Record<string, any>;
  @Prop({ type: [String], default: [] })
  artifactPaths: string[];
}
export const TrainingJobSchema = SchemaFactory.createForClass(TrainingJob);
