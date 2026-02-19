import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Headers,
} from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getAllNotifications(
    @Headers('x-client-type') clientType?: string,
  ) {
    const notifications = await this.notificationService.getAllNotifications();

    if (clientType?.toLowerCase() === 'mobile') {
      return {
        success: true,
        data: notifications,
      };
    }

    return notifications;
  }

  @Get('unread-count')
  async getUnreadCount(
    @Headers('x-client-type') clientType?: string,
  ) {
    const count = await this.notificationService.getUnreadCount();

    if (clientType?.toLowerCase() === 'mobile') {
      return {
        success: true,
        data: { count },
      };
    }

    return { count };
  }

  @Post(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Headers('x-client-type') clientType?: string,
  ) {
    const notification = await this.notificationService.markAsRead(id);

    if (clientType?.toLowerCase() === 'mobile') {
      return {
        success: true,
        data: notification,
        message: 'Notification marked as read',
      };
    }

    return notification;
  }

  @Post('mark-all-read')
  async markAllAsRead(
    @Headers('x-client-type') clientType?: string,
  ) {
    const result = await this.notificationService.markAllAsRead();

    if (clientType?.toLowerCase() === 'mobile') {
      return {
        success: true,
        data: result,
        message: 'All notifications marked as read',
      };
    }

    return result;
  }

  @Delete(':id')
  async deleteNotification(
    @Param('id') id: string,
    @Headers('x-client-type') clientType?: string,
  ) {
    const result = await this.notificationService.deleteNotification(id);

    if (clientType?.toLowerCase() === 'mobile') {
      return {
        success: true,
        message: 'Notification deleted',
      };
    }

    return result;
  }

  @Post('sample-data')
  async createSampleNotifications(@Headers('x-client-type') clientType?: string) {
    await this.notificationService.createSampleNotifications();
    
    if (clientType?.toLowerCase() === 'mobile') {
      return {
        success: true,
        message: 'Sample notifications created',
      };
    }

    return { message: 'Sample notifications created' };
  }
}