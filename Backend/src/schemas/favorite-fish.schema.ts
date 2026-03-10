import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FavoriteFishDocument = FavoriteFish & Document;

/**
 * Separate MongoDB collection for per-user fish favourites.
 * Keeping this out of the User document avoids unbounded array growth
 * and makes querying/indexing straightforward.
 *
 * Compound unique index on (userId + fish_id) — one entry per fish per user.
 */
@Schema({ timestamps: true, collection: 'favoritefishes' })
export class FavoriteFish {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  fish_id: number;

  @Prop({ required: true })
  sinhala_name: string;

  @Prop({ required: true })
  common_name: string;

  @Prop({ default: 0 })
  predicted_price: number;

  @Prop({ required: true })
  date_added: string;
}

export const FavoriteFishSchema = SchemaFactory.createForClass(FavoriteFish);

// Prevent duplicate favourites for the same user+fish combination
FavoriteFishSchema.index({ userId: 1, fish_id: 1 }, { unique: true });
