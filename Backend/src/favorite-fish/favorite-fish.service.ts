import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FavoriteFish,
  FavoriteFishDocument,
} from '../schemas/favorite-fish.schema';

export interface FavoriteFishDto {
  fish_id: number;
  sinhala_name: string;
  common_name: string;
  predicted_price: number;
  date_added: string;
}

@Injectable()
export class FavoriteFishService {
  constructor(
    @InjectModel(FavoriteFish.name)
    private readonly model: Model<FavoriteFishDocument>,
  ) {}

  /** ඔය user ID එකට save කරලා තියෙන සියලු favourite මාලු list කරන්න */
  async getAll(userId: string): Promise<FavoriteFish[]> {
    return this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  /**
   * නව favourite එකක් add කරන්න.
   * දැනටමත් ඒ fish_id එකක් save කරලා තිබ්බොත් update කරනවා (upsert).
   */
  async add(userId: string, dto: FavoriteFishDto): Promise<FavoriteFish[]> {
    await this.model
      .updateOne(
        { userId: new Types.ObjectId(userId), fish_id: dto.fish_id },
        {
          $set: {
            sinhala_name: dto.sinhala_name,
            common_name: dto.common_name,
            predicted_price: dto.predicted_price,
            date_added: dto.date_added,
          },
        },
        { upsert: true },
      )
      .exec();
    return this.getAll(userId);
  }

  /** Favourite list එකෙන් fish_id එකක් remove කරන්න */
  async remove(userId: string, fishId: number): Promise<FavoriteFish[]> {
    await this.model
      .deleteOne({ userId: new Types.ObjectId(userId), fish_id: fishId })
      .exec();
    return this.getAll(userId);
  }

  /** User login වෙලා ඉන්නවාද කියලා check කරන්නේ නැතිව හිතා fish_id in a set */
  async getFishIds(userId: string): Promise<number[]> {
    const docs = await this.model
      .find({ userId: new Types.ObjectId(userId) })
      .select('fish_id')
      .lean()
      .exec();
    return docs.map((d) => d.fish_id);
  }
}
