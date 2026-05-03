import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TrainingCandidateDocument = TrainingCandidate & Document;

@Schema({ timestamps: true })
export class TrainingCandidate {
  @Prop({ required: true })
  sourceTripId: string; // ID from the Trips collection

  @Prop({ required: true })
  boatId: string;

  @Prop({ required: true })
  boatType: string; // e.g., 'IMUI', 'IDAT'

  @Prop({ type: Object, required: true })
  featuresSnapshot: any; // The original predictions (distance, expected fuel, etc)

  @Prop({ type: Object, required: true })
  labelSnapshot: any; // The actual logged values by the fisherman (actual fuel, actual cost)

  @Prop({
    required: true,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'TRAINED'],
    default: 'PENDING',
  })
  status: string;

  @Prop({ type: String })
  reviewerId?: string;

  @Prop({ type: String })
  reviewReason?: string;

  @Prop()
  reviewedAt?: Date;
}

export const TrainingCandidateSchema =
  SchemaFactory.createForClass(TrainingCandidate);
