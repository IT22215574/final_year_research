import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@common/guards";
import { RolesGuard } from "@common/guards";
import { Roles } from "@common/decorators";
import { PrismaService } from "@database/prisma.service";
import { NotificationStatus, UserRole } from "@prisma/client";
import {
  NotificationsService,
  CreateBulkNotificationDto,
  NotificationTargeting,
} from "./notifications.service";

interface NotificationResponse {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

@ApiTags("Notifications")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  @Get()
  @ApiOperation({
    summary: "Get all notifications for current user",
    description: "Retrieves all notifications for the authenticated user",
  })
  @ApiQuery({
    name: "isRead",
    required: false,
    description: "Filter by read status",
    example: false,
  })
  @ApiQuery({
    name: "type",
    required: false,
    description: "Filter by notification type",
    example: "INFO",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Notifications retrieved successfully",
  })
  async getAll(
    @Request() req: any,
    @Query("isRead") isRead?: string,
    @Query("type") type?: string
  ): Promise<{ notifications: NotificationResponse[] }> {
    const where: any = { userId: req.user.id };

    if (isRead !== undefined) {
      where.status =
        isRead === "true" ? NotificationStatus.READ : NotificationStatus.UNREAD;
    }

    if (type) {
      where.type = type;
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Transform to match frontend interface
    const transformed = notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.status === NotificationStatus.READ,
      link: n.data ? JSON.parse(n.data).link : undefined,
      metadata: n.data ? JSON.parse(n.data) : undefined,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));

    return { notifications: transformed };
  }

  @Get("unread-count")
  @ApiOperation({
    summary: "Get unread notification count",
    description:
      "Returns the count of unread notifications for the current user",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Unread count retrieved successfully",
  })
  async getUnreadCount(@Request() req: any): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        userId: req.user.id,
        status: NotificationStatus.UNREAD,
      },
    });

    return { count };
  }

  @Patch(":id/read")
  @ApiOperation({
    summary: "Mark notification as read",
    description: "Marks a specific notification as read",
  })
  @ApiParam({
    name: "id",
    description: "Notification ID",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Notification marked as read",
  })
  async markAsRead(
    @Request() req: any,
    @Param("id") id: string
  ): Promise<{ notification: NotificationResponse }> {
    const notification = await this.prisma.notification.update({
      where: {
        id,
        userId: req.user.id, // Ensure user owns this notification
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return {
      notification: {
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: true,
        link: notification.data
          ? JSON.parse(notification.data).link
          : undefined,
        metadata: notification.data ? JSON.parse(notification.data) : undefined,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
      },
    };
  }

  @Patch("mark-all-read")
  @ApiOperation({
    summary: "Mark all notifications as read",
    description: "Marks all notifications for the current user as read",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "All notifications marked as read",
  })
  async markAllAsRead(@Request() req: any): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete notification",
    description: "Deletes a specific notification",
  })
  @ApiParam({
    name: "id",
    description: "Notification ID",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Notification deleted successfully",
  })
  async delete(
    @Request() req: any,
    @Param("id") id: string
  ): Promise<{ message: string }> {
    await this.prisma.notification.delete({
      where: {
        id,
        userId: req.user.id, // Ensure user owns this notification
      },
    });

    return { message: "Notification deleted successfully" };
  }

  @Get("preferences")
  @ApiOperation({
    summary: "Get notification preferences",
    description: "Retrieves notification preferences for the current user",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Preferences retrieved successfully",
  })
  async getPreferences(@Request() req: any): Promise<any> {
    // Placeholder - implement when notification preferences schema exists
    return {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      notificationTypes: ["INFO", "SUCCESS", "WARNING", "ERROR"],
    };
  }

  @Patch("preferences")
  @ApiOperation({
    summary: "Update notification preferences",
    description: "Updates notification preferences for the current user",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Preferences updated successfully",
  })
  async updatePreferences(
    @Request() req: any,
    @Body() preferences: any
  ): Promise<any> {
    // Placeholder - implement when notification preferences schema exists
    return {
      message: "Preferences updated successfully",
      preferences,
    };
  }

  // ============ ADMIN ENDPOINTS ============

  @Get("admin/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get all notifications (Admin)",
    description:
      "Retrieves all notifications across all users with filtering - Admin only",
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number",
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Items per page",
    example: 50,
  })
  @ApiQuery({
    name: "type",
    required: false,
    description: "Filter by notification type",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Filter by status (UNREAD/READ/ARCHIVED)",
  })
  @ApiQuery({
    name: "role",
    required: false,
    description: "Filter by user role",
  })
  @ApiQuery({
    name: "dateFrom",
    required: false,
    description: "Start date filter (ISO format)",
  })
  @ApiQuery({
    name: "dateTo",
    required: false,
    description: "End date filter (ISO format)",
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search in title or message",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Notifications retrieved successfully",
  })
  async getAllAdmin(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("role") role?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("search") search?: string
  ): Promise<{
    notifications: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const pageNum = parseInt(page || "1", 10);
    const limitNum = parseInt(limit || "50", 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (role) {
      where.user = { role };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get notification detail (Admin)",
    description:
      "Retrieves detailed information for a specific notification - Admin only",
  })
  @ApiParam({ name: "id", description: "Notification ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Notification detail retrieved successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Notification not found",
  })
  async getAdminDetail(@Param("id") id: string): Promise<any> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    return notification;
  }

  @Get("admin/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get notification statistics (Admin)",
    description: "Retrieves overall notification statistics - Admin only",
  })
  @ApiQuery({
    name: "dateFrom",
    required: false,
    description: "Start date filter (ISO format)",
  })
  @ApiQuery({
    name: "dateTo",
    required: false,
    description: "End date filter (ISO format)",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Statistics retrieved successfully",
  })
  async getAdminStats(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string
  ): Promise<any> {
    const where: any = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [total, byStatus, byType] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      this.prisma.notification.groupBy({
        by: ["type"],
        where,
        _count: true,
      }),
    ]);

    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    const typeCounts = byType.reduce(
      (acc, item) => {
        acc[item.type] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total,
      byStatus: statusCounts,
      byType: typeCounts,
    };
  }

  @Post("admin/create-targeted")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: "Create targeted notification (Admin)",
    description: "Send notifications to users based on targeting criteria",
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Notifications sent successfully",
  })
  async createTargetedNotification(
    @Body() dto: CreateBulkNotificationDto,
    @Request() req: any
  ) {
    return this.notificationsService.createTargetedNotification(
      dto,
      req.user.id
    );
  }

  @Post("admin/preview-targeting")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: "Preview notification recipients (Admin)",
    description:
      "Get count and list of users who will receive the notification",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Recipients preview retrieved successfully",
  })
  async previewTargeting(@Body() targeting: NotificationTargeting) {
    const count =
      await this.notificationsService.getTargetedUserCount(targeting);
    const users = await this.notificationsService.getTargetedUsers(targeting);
    return {
      count,
      users: users.slice(0, 10), // Return first 10 for preview
      totalCount: count,
    };
  }
}
