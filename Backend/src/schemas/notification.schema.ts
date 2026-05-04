import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  userId: string;

  @Prop({ default: 'info' })
  type: string; // 'info', 'warning', 'success', 'error'

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Object })
  data: any; // Additional data for the notification
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
