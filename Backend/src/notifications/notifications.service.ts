import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@database/prisma.service";
import { NotificationType, UserRole } from "@prisma/client";
import { EmailService, NotificationEmailData } from "./services/email.service";
import { AppException } from "../../common/errors/app-exception";
import { ErrorCode } from "../../common/errors/error-codes.enum";

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  sendRealtime?: boolean;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" | string;
}

export interface NotificationTargeting {
  grades?: string[];
  batches?: string[];
  subjects?: string[];
  teachers?: string[];
  studentTypes?: string[];
  roles?: UserRole[];
  specificUserIds?: string[];
}

export interface CreateBulkNotificationDto {
  title: string;
  message: string;
  type: NotificationType;
  targeting: NotificationTargeting;
  scheduleAt?: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private notificationsGateway: any; // Will be injected via setter to avoid circular dependency

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  /**
   * Set the notifications gateway (called by module to avoid circular dependency)
   */
  setNotificationsGateway(gateway: any): void {
    this.notificationsGateway = gateway;
  }

  async createNotification(notification: NotificationData): Promise<void> {
    // Create notification with sentAt timestamp (Single tick ✓)
    const created = await this.prisma.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type as NotificationType,
        title: notification.title,
        message: notification.message,
        data: notification.metadata
          ? JSON.stringify({ ...notification.metadata })
          : null,
        sentAt: new Date(), // Single tick ✓ - message sent to server
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Prepare notification with delivery status for real-time
    const notificationWithStatus = {
      ...created,
      deliveryStatus: "sent", // Single tick ✓
      notificationId: created.id,
    };

    // Send real-time notification if enabled and gateway is available
    if (notification.sendRealtime !== false && this.notificationsGateway) {
      try {
        await this.notificationsGateway.sendNotificationToUser(
          notification.userId,
          notificationWithStatus
        );
        // If user is online and received the notification, mark as delivered (Double tick ✓✓)
        await this.prisma.notification.update({
          where: { id: created.id },
          data: { deliveredAt: new Date() },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(
          `Failed to send real-time notification: ${errorMessage}`
        );
      }
    }

    // Send email notification if email service is available
    if (this.emailService.isAvailable() && created.user.email) {
      try {
        const emailData: NotificationEmailData = {
          recipientName: `${created.user.firstName} ${created.user.lastName}`,
          recipientEmail: created.user.email,
          title: created.title,
          message: created.message,
          type: created.type,
          actionUrl: notification.metadata?.actionUrl,
          actionText: notification.metadata?.actionText,
        };

        await this.emailService.sendNotificationEmail(emailData);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(`Failed to send email notification: ${errorMessage}`);
      }
    }
  }

  async sendBulkNotifications(
    notifications: NotificationData[]
  ): Promise<void> {
    const created = await this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        type: n.type as NotificationType,
        title: n.title,
        message: n.message,
        data: n.metadata ? JSON.stringify(n.metadata) : null,
        sentAt: new Date(),
      })),
    });

    // Send real-time notifications if gateway is available
    if (this.notificationsGateway) {
      const userIds = [...new Set(notifications.map((n) => n.userId))];
      try {
        // Fetch created notifications for real-time delivery
        const createdNotifications = await this.prisma.notification.findMany({
          where: {
            userId: { in: userIds },
            sentAt: { gte: new Date(Date.now() - 5000) }, // Last 5 seconds
          },
          orderBy: { createdAt: "desc" },
        });

        for (const notif of createdNotifications) {
          await this.notificationsGateway.sendNotificationToUser(
            notif.userId,
            notif
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(
          `Failed to send bulk real-time notifications: ${errorMessage}`
        );
      }
    }

    // Send bulk email notifications if email service is available
    if (this.emailService.isAvailable()) {
      try {
        const notificationsWithUsers = await this.prisma.notification.findMany({
          where: {
            userId: { in: notifications.map((n) => n.userId) },
            sentAt: { gte: new Date(Date.now() - 5000) },
          },
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const emailData = notificationsWithUsers
          .filter((notif) => notif.user.email) // Filter out users with null email
          .map((notif) => ({
            recipientName: `${notif.user.firstName} ${notif.user.lastName}`,
            recipientEmail: notif.user.email!,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            actionUrl: notif.data
              ? JSON.parse(notif.data).actionUrl
              : undefined,
            actionText: notif.data
              ? JSON.parse(notif.data).actionText
              : undefined,
          }));

        await this.emailService.sendBulkNotificationEmails(emailData);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(
          `Failed to send bulk email notifications: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Helper method to send notification about student enrollment
   */
  async notifyTeacherAboutEnrollment(
    teacherId: string,
    studentName: string,
    className: string
  ): Promise<void> {
    await this.createNotification({
      userId: teacherId,
      type: "SYSTEM",
      title: "New Student Enrollment",
      message: `${studentName} has enrolled in ${className}`,
      metadata: { action: "student_enrollment" },
      sendRealtime: true,
    });
  }

  /**
   * Helper method to notify about approval/rejection
   */
  async notifyAboutApproval(
    userId: string,
    resourceType: string,
    resourceName: string,
    approved: boolean,
    reason?: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: "SYSTEM",
      title: approved ? `${resourceType} Approved` : `${resourceType} Rejected`,
      message: approved
        ? `Your ${resourceType.toLowerCase()} "${resourceName}" has been approved`
        : `Your ${resourceType.toLowerCase()} "${resourceName}" was rejected${reason ? `: ${reason}` : ""}`,
      metadata: {
        resourceType,
        resourceName,
        approved,
        reason,
      },
      sendRealtime: true,
    });
  }

  /**
   * Helper method to notify about timetable changes
   */
  async notifyStudentsAboutTimetable(
    studentIds: string[],
    action: "created" | "updated" | "cancelled",
    timetableInfo: { subject: string; date: string; time: string }
  ): Promise<void> {
    const titles = {
      created: "New Class Scheduled",
      updated: "Class Schedule Updated",
      cancelled: "Class Cancelled",
    };

    const messages = {
      created: `${timetableInfo.subject} class scheduled for ${timetableInfo.date} at ${timetableInfo.time}`,
      updated: `${timetableInfo.subject} class schedule has been updated for ${timetableInfo.date} at ${timetableInfo.time}`,
      cancelled: `${timetableInfo.subject} class on ${timetableInfo.date} at ${timetableInfo.time} has been cancelled`,
    };

    await this.sendBulkNotifications(
      studentIds.map((studentId) => ({
        userId: studentId,
        type: "CLASS_UPDATE",
        title: titles[action],
        message: messages[action],
        metadata: { timetableInfo, action },
        sendRealtime: true,
      }))
    );
  }

  /**
   * Helper method to notify about exam updates
   */
  async notifyAboutExam(
    userId: string,
    action: "approved" | "rejected" | "scheduled" | "published",
    examTitle: string,
    additionalInfo?: string
  ): Promise<void> {
    const titles = {
      approved: "Exam Approved",
      rejected: "Exam Rejected",
      scheduled: "Exam Scheduled",
      published: "Exam Results Published",
    };

    const messages = {
      approved: `Your exam "${examTitle}" has been approved`,
      rejected: `Your exam "${examTitle}" was rejected${additionalInfo ? `: ${additionalInfo}` : ""}`,
      scheduled: `Exam "${examTitle}" has been scheduled${additionalInfo ? `: ${additionalInfo}` : ""}`,
      published: `Results for "${examTitle}" are now available`,
    };

    await this.createNotification({
      userId,
      type: "EXAM_UPDATE",
      title: titles[action],
      message: messages[action],
      metadata: { examTitle, action, additionalInfo },
      sendRealtime: true,
    });
  }

  async getTargetedUserCount(
    targeting: NotificationTargeting
  ): Promise<number> {
    const where = this.buildTargetingWhere(targeting);
    return this.prisma.user.count({ where });
  }

  async getTargetedUsers(
    targeting: NotificationTargeting
  ): Promise<{ id: string; name: string; email: string }[]> {
    const where = this.buildTargetingWhere(targeting);
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    return users.map((user) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email || "",
    }));
  }

  async createTargetedNotification(
    dto: CreateBulkNotificationDto,
    createdBy: string
  ) {
    // Get target users
    const users = await this.getTargetedUsers(dto.targeting);

    if (users.length === 0) {
      throw AppException.badRequest(
        ErrorCode.NO_TARGETING_CRITERIA_MATCH,
        "No users match the targeting criteria"
      );
    }

    // Create notifications for all targeted users
    const notifications = users.map((user) => ({
      userId: user.id,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.metadata
        ? JSON.stringify({ ...dto.metadata, createdBy })
        : JSON.stringify({ createdBy }),
      sentAt: dto.scheduleAt || new Date(),
    }));

    await this.prisma.notification.createMany({
      data: notifications,
    });

    return {
      success: true,
      recipientCount: users.length,
      recipients: users,
    };
  }

  private buildTargetingWhere(targeting: NotificationTargeting): any {
    const conditions: any[] = [];

    // Specific user IDs take precedence
    if (targeting.specificUserIds && targeting.specificUserIds.length > 0) {
      return { id: { in: targeting.specificUserIds } };
    }

    // Role filtering
    if (targeting.roles && targeting.roles.length > 0) {
      conditions.push({ role: { in: targeting.roles } });
    }

    // Student type filtering (for students only)
    if (targeting.studentTypes && targeting.studentTypes.length > 0) {
      conditions.push({
        role: { in: [UserRole.INTERNAL_STUDENT, UserRole.EXTERNAL_STUDENT] },
      });
    }

    // Grade filtering (for students)
    if (targeting.grades && targeting.grades.length > 0) {
      conditions.push({
        role: { in: [UserRole.INTERNAL_STUDENT, UserRole.EXTERNAL_STUDENT] },
        enrollments: {
          some: {
            class: {
              grade: { in: targeting.grades },
            },
          },
        },
      });
    }

    // Batch filtering (for students)
    if (targeting.batches && targeting.batches.length > 0) {
      conditions.push({
        role: { in: [UserRole.INTERNAL_STUDENT, UserRole.EXTERNAL_STUDENT] },
        enrollments: {
          some: {
            class: {
              batch: { in: targeting.batches },
            },
          },
        },
      });
    }

    // Subject filtering (for both students and teachers)
    if (targeting.subjects && targeting.subjects.length > 0) {
      conditions.push({
        OR: [
          {
            role: {
              in: [UserRole.INTERNAL_STUDENT, UserRole.EXTERNAL_STUDENT],
            },
            enrollments: {
              some: {
                class: {
                  subjectId: { in: targeting.subjects },
                },
              },
            },
          },
          {
            role: {
              in: [UserRole.INTERNAL_TEACHER, UserRole.EXTERNAL_TEACHER],
            },
            teacherClasses: {
              some: {
                class: {
                  subjectId: { in: targeting.subjects },
                },
              },
            },
          },
        ],
      });
    }

    // Specific teachers
    if (targeting.teachers && targeting.teachers.length > 0) {
      conditions.push({
        id: { in: targeting.teachers },
      });
    }

    // Combine all conditions with AND logic
    if (conditions.length === 0) {
      return {}; // No filters, return all users
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { AND: conditions };
  }

  /**
   * Notify all admins with a specific notification
   */
  async notifyAdmins(data: {
    title: string;
    message: string;
    type: string;
    priority: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    // Find all admin users
    const admins = await this.prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
        },
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (admins.length === 0) {
      this.logger.warn("No admins found to notify");
      return;
    }

    // Create notifications for all admins
    const notifications = admins.map((admin) => ({
      userId: admin.id,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: { ...data.metadata, priority: data.priority },
      sendRealtime: true,
    }));

    await this.sendBulkNotifications(notifications);

    this.logger.log(`Notified ${admins.length} admins: ${data.title}`);
  }

  /**
   * Mark a notification as read (Double blue tick ✓✓)
   * This indicates the user has opened/seen the notification
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      this.logger.warn(
        `Notification ${notificationId} not found for user ${userId}`
      );
      return;
    }

    await this.prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        status: "READ",
        readAt: new Date(),
        // Ensure delivered is also set if not already
        deliveredAt: notification.deliveredAt || new Date(),
      },
    });
    this.logger.debug(
      `Notification ${notificationId} marked as read (blue double tick) by user ${userId}`
    );
  }

  /**
   * Mark notification as delivered (Double tick ✓✓)
   * This indicates the notification reached the user's device
   */
  async markAsDelivered(notificationId: string, userId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      this.logger.warn(
        `Notification ${notificationId} not found for user ${userId}`
      );
      return;
    }

    // Only update if not already delivered
    if (!notification.deliveredAt) {
      await this.prisma.notification.update({
        where: {
          id: notificationId,
        },
        data: {
          deliveredAt: new Date(),
        },
      });
      this.logger.debug(
        `Notification ${notificationId} marked as delivered (double tick) to user ${userId}`
      );
    }
  }

  /**
   * Mark notification as sent (Single tick ✓)
   * This is called when the notification is created and stored in the server
   */
  async markAsSent(notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        sentAt: new Date(),
      },
    });
    this.logger.debug(
      `Notification ${notificationId} marked as sent (single tick)`
    );
  }

  /**
   * Get notification delivery status
   * Returns: 'pending' | 'sent' | 'delivered' | 'read'
   */
  getDeliveryStatus(notification: {
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
  }): string {
    if (notification.readAt) return "read"; // Double blue tick ✓✓
    if (notification.deliveredAt) return "delivered"; // Double tick ✓✓
    if (notification.sentAt) return "sent"; // Single tick ✓
    return "pending"; // Clock/pending icon
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const now = new Date();
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        status: "UNREAD",
      },
      data: {
        status: "READ",
        readAt: now,
        deliveredAt: now, // Ensure delivered is set when read
      },
    });
    return result.count;
  }

  /**
   * Mark all notifications as delivered for a user (when they come online)
   */
  async markAllAsDelivered(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        deliveredAt: null,
        sentAt: { not: null },
      },
      data: {
        deliveredAt: new Date(),
      },
    });
    this.logger.debug(
      `Marked ${result.count} notifications as delivered for user ${userId}`
    );
    return result.count;
  }
}
