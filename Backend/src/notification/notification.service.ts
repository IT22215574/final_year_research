import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../schemas/notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async getAllNotifications(userId?: string) {
    const query = userId ? { userId } : {};
    return this.notificationModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async getUnreadCount(userId?: string) {
    const query = userId ? { userId, isRead: false } : { isRead: false };
    return this.notificationModel.countDocuments(query).exec();
  }

  async markAsRead(notificationId: string) {
    return this.notificationModel
      .findByIdAndUpdate(notificationId, { isRead: true }, { new: true })
      .exec();
  }

  async markAllAsRead(userId?: string) {
    const query = userId ? { userId } : {};
    return this.notificationModel.updateMany(query, { isRead: true }).exec();
  }

  async deleteNotification(notificationId: string) {
    return this.notificationModel.findByIdAndDelete(notificationId).exec();
  }

  async createNotification(
    title: string,
    message: string,
    userId?: string,
    type = 'info',
    data?: any,
  ) {
    const notification = new this.notificationModel({
      title,
      message,
      userId,
      type,
      data,
    });
    return notification.save();
  }

  // Create some sample notifications for demo
  async createSampleNotifications() {
    const sampleNotifications = [
      {
        title: 'Fish Market Update',
        message: "Today's fish prices have been updated for Colombo market.",
        type: 'info',
      },
      {
        title: 'Price Alert',
        message: 'Tuna prices have increased by 15% this week.',
        type: 'warning',
      },
      {
        title: 'System Update',
        message: 'Our prediction system has been improved with new data.',
        type: 'success',
      },
      {
        title: 'Weather Alert',
        message:
          'Strong winds expected tomorrow. Plan your fishing trips accordingly.',
        type: 'warning',
      },
    ];

    for (const notif of sampleNotifications) {
      await this.createNotification(
        notif.title,
        notif.message,
        undefined,
        notif.type,
      );
    }
  }
}
