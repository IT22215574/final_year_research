import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "@database/prisma.service";
import { EmailService } from "./services/email.service";
import { NotificationType, UserRole } from "@prisma/client";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
    sendBulkEmail: jest.fn(),
    isAvailable: jest.fn().mockReturnValue(false),
  };

  const mockGateway = {
    sendNotificationToUser: jest.fn(),
    sendNotificationToUsers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Set the gateway
    service.setNotificationsGateway(mockGateway);

    // Clear all mocks
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createNotification", () => {
    it("should create a notification successfully", async () => {
      const notificationData = {
        userId: "user-123",
        type: "SYSTEM",
        title: "Test Notification",
        message: "This is a test",
        metadata: { key: "value" },
      };

      const createdNotification = {
        id: "notif-123",
        ...notificationData,
        type: "SYSTEM" as NotificationType,
        status: "UNREAD",
        data: JSON.stringify(notificationData.metadata),
        sentAt: new Date(),
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          firstName: "John",
          lastName: "Doe",
          email: null,
        },
      };

      mockPrismaService.notification.create.mockResolvedValue(
        createdNotification
      );

      await service.createNotification(notificationData);

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: notificationData.userId,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            data: JSON.stringify(notificationData.metadata),
            sentAt: expect.any(Date),
          }),
        })
      );

      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        notificationData.userId,
        expect.objectContaining({
          id: createdNotification.id,
          userId: notificationData.userId,
          type: "SYSTEM",
          title: notificationData.title,
          message: notificationData.message,
          deliveryStatus: "sent",
          notificationId: createdNotification.id,
        })
      );
    });

    it("should create notification without real-time delivery if disabled", async () => {
      const notificationData = {
        userId: "user-123",
        type: "SYSTEM",
        title: "Test Notification",
        message: "This is a test",
        sendRealtime: false,
      };

      const createdNotification = {
        id: "notif-123",
        userId: notificationData.userId,
        type: "SYSTEM" as NotificationType,
        title: notificationData.title,
        message: notificationData.message,
        data: null,
        status: "UNREAD",
        sentAt: new Date(),
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notification.create.mockResolvedValue(
        createdNotification
      );

      await service.createNotification(notificationData);

      expect(mockPrismaService.notification.create).toHaveBeenCalled();
      expect(mockGateway.sendNotificationToUser).not.toHaveBeenCalled();
    });
  });

  describe("sendBulkNotifications", () => {
    it("should send bulk notifications to multiple users", async () => {
      const notifications = [
        {
          userId: "user-1",
          type: "CLASS_UPDATE",
          title: "Class Update",
          message: "Your class has been updated",
        },
        {
          userId: "user-2",
          type: "CLASS_UPDATE",
          title: "Class Update",
          message: "Your class has been updated",
        },
      ];

      mockPrismaService.notification.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.notification.findMany.mockResolvedValue([
        { id: "1", ...notifications[0], userId: "user-1" },
        { id: "2", ...notifications[1], userId: "user-2" },
      ]);

      await service.sendBulkNotifications(notifications);

      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
        data: notifications.map((n) => ({
          userId: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          data: null,
          sentAt: expect.any(Date),
        })),
      });
    });
  });

  describe("Helper Methods", () => {
    it("should notify teacher about enrollment", async () => {
      mockPrismaService.notification.create.mockResolvedValue({
        id: "notif-123",
        userId: "teacher-1",
        type: "SYSTEM",
        title: "New Student Enrollment",
        message: "John Doe has enrolled in Math 101",
        data: JSON.stringify({ action: "student_enrollment" }),
        status: "UNREAD",
        sentAt: new Date(),
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.notifyTeacherAboutEnrollment(
        "teacher-1",
        "John Doe",
        "Math 101"
      );

      expect(mockPrismaService.notification.create).toHaveBeenCalled();
    });

    it("should notify about approval", async () => {
      mockPrismaService.notification.create.mockResolvedValue({
        id: "notif-123",
        userId: "teacher-1",
        type: "SYSTEM",
        title: "Exam Approved",
        message: 'Your exam "Math Final" has been approved',
        data: expect.any(String),
        status: "UNREAD",
        sentAt: new Date(),
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.notifyAboutApproval(
        "teacher-1",
        "Exam",
        "Math Final",
        true
      );

      expect(mockPrismaService.notification.create).toHaveBeenCalled();
    });

    it("should notify about rejection with reason", async () => {
      mockPrismaService.notification.create.mockResolvedValue({
        id: "notif-123",
        userId: "teacher-1",
        type: "SYSTEM",
        title: "Exam Rejected",
        message: 'Your exam "Math Final" was rejected: Contains errors',
        data: expect.any(String),
        status: "UNREAD",
        sentAt: new Date(),
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.notifyAboutApproval(
        "teacher-1",
        "Exam",
        "Math Final",
        false,
        "Contains errors"
      );

      expect(mockPrismaService.notification.create).toHaveBeenCalled();
    });

    it("should notify about exam update", async () => {
      mockPrismaService.notification.create.mockResolvedValue({
        id: "notif-123",
        userId: "teacher-1",
        type: "EXAM_UPDATE",
        title: "Exam Approved",
        message: 'Your exam "Math Final" has been approved',
        data: expect.any(String),
        status: "UNREAD",
        sentAt: new Date(),
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.notifyAboutExam("teacher-1", "approved", "Math Final");

      expect(mockPrismaService.notification.create).toHaveBeenCalled();
    });
  });

  describe("getTargetedUsers", () => {
    it("should get users by specific IDs", async () => {
      const users = [
        {
          id: "user-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        {
          id: "user-2",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(users);

      const result = await service.getTargetedUsers({
        specificUserIds: ["user-1", "user-2"],
      });

      expect(result).toEqual([
        { id: "user-1", name: "John Doe", email: "john@example.com" },
        { id: "user-2", name: "Jane Smith", email: "jane@example.com" },
      ]);
    });

    it("should get users by role", async () => {
      const users = [
        {
          id: "teacher-1",
          firstName: "John",
          lastName: "Teacher",
          email: "teacher@example.com",
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(users);

      const result = await service.getTargetedUsers({
        roles: [UserRole.INTERNAL_TEACHER],
      });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });
  });

  describe("getTargetedUserCount", () => {
    it("should return count of targeted users", async () => {
      mockPrismaService.user.count.mockResolvedValue(50);

      const count = await service.getTargetedUserCount({
        roles: [UserRole.INTERNAL_STUDENT],
      });

      expect(count).toBe(50);
      expect(mockPrismaService.user.count).toHaveBeenCalled();
    });
  });
});
