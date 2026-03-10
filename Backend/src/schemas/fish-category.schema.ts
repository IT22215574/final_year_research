import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FishCategoryDocument = HydratedDocument<FishCategory>;

@Schema({ timestamps: true })
export class FishCategory {
  @Prop({ required: true, trim: true, unique: true })
  name: string;
}

export const FishCategorySchema = SchemaFactory.createForClass(FishCategory);
