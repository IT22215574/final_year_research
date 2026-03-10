import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FishMarketEntryDocument = HydratedDocument<FishMarketEntry>;

@Schema({ timestamps: true })
export class FishMarketEntry {
  /** Reference to FishCategory._id */
  @Prop({ type: Types.ObjectId, ref: 'FishCategory', required: true })
  categoryId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  grade: string;

  @Prop({ required: true, min: 0 })
  wholesalePrice: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  numberOfKilos: number;

  @Prop({ required: true, trim: true })
  catchingAreaName: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  /**
   * The calendar date this entry belongs to.
   * Stored as Date; only the date part (YYYY-MM-DD) is used for filtering.
   * Defaults to today (UTC midnight).
   */
  @Prop({
    type: Date,
    required: true,
    default: () => {
      const now = new Date();
      return new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
    },
  })
  marketDate: Date;
}

export const FishMarketEntrySchema =
  SchemaFactory.createForClass(FishMarketEntry);

// Index for fast date queries
FishMarketEntrySchema.index({ marketDate: -1 });
FishMarketEntrySchema.index({ categoryId: 1, marketDate: -1 });
