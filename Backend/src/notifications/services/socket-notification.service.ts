import {
  Injectable,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import { NotificationsService } from "../notifications.service";

export interface NotificationPayload {
  userId: string;
  type:
    | "payment"
    | "attendance"
    | "enrollment"
    | "assignment"
    | "exam"
    | "announcement"
    | "message"
    | "general";
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: "low" | "medium" | "high" | "urgent";
  actionUrl?: string;
  createdAt?: Date;
}

export interface OnlineUser {
  userId: string;
  socketId: string;
  connectedAt: Date;
  userAgent?: string;
}

/**
 * Socket.IO Real-time Notification Service
 *
 * Provides real-time push notifications to connected users via WebSocket.
 * Supports user authentication, room-based messaging, and notification delivery tracking.
 *
 * Features:
 * - User authentication and session management
 * - Room-based notifications (user-specific, role-based, broadcast)
 * - Notification delivery confirmation and read receipts
 * - Online user tracking and presence detection
 * - Automatic reconnection handling
 * - Notification history and persistence (delegates to NotificationsService)
 *
 * @example
 * // Send notification to specific user
 * await socketNotificationService.sendNotificationToUser(userId, {
 *   type: 'payment',
 *   title: 'Payment Successful',
 *   message: 'Your payment of $100 has been processed',
 *   priority: 'high'
 * });
 *
 * // Broadcast to all users
 * await socketNotificationService.broadcastNotification({
 *   type: 'announcement',
 *   title: 'System Maintenance',
 *   message: 'Platform will be under maintenance tonight'
 * });
 */
@Injectable()
export class SocketNotificationService implements OnModuleInit {
  private readonly logger = new Logger(SocketNotificationService.name);
  private io: Server | null = null;
  private onlineUsers: Map<string, OnlineUser[]> = new Map(); // userId -> array of socket connections
  private socketToUser: Map<string, string> = new Map(); // socketId -> userId
  private isEnabled: boolean = true;
  private notificationsService: NotificationsService | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {
    // Check if Socket.IO should be enabled (can be disabled in config)
    this.isEnabled = this.configService.get<boolean>("SOCKET_ENABLED", true);
  }

  /**
   * Set the notifications service (called by module to avoid circular dependency)
   */
  setNotificationsService(service: NotificationsService): void {
    this.notificationsService = service;
  }

  async onModuleInit() {
    if (this.isEnabled) {
      this.logger.log("Socket.IO Notification Service initialized");
      this.logger.warn(
        "Note: Socket.IO server instance must be set via setServer() method"
      );
    } else {
      this.logger.warn("Socket.IO is disabled via configuration");
    }
  }

  /**
   * Set the Socket.IO server instance
   * This should be called from main.ts after creating the Socket.IO adapter
   */
  setServer(io: Server): void {
    if (!this.isEnabled) {
      this.logger.warn("Cannot set Socket.IO server - Socket.IO is disabled");
      return;
    }

    this.io = io;
    this.setupEventHandlers();
    this.logger.log("Socket.IO server instance configured successfully");
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", (socket: Socket) => {
      this.logger.log(`New socket connection: ${socket.id}`);

      // Handle authentication
      socket.on("authenticate", (data: { userId: string; token?: string }) => {
        this.handleAuthentication(socket, data);
      });

      // Handle notification acknowledgment
      socket.on("notification:read", (data: { notificationId: string }) => {
        this.handleNotificationRead(socket, data);
      });

      // Handle notification delivery confirmation
      socket.on(
        "notification:delivered",
        (data: { notificationId: string }) => {
          this.handleNotificationDelivered(socket, data);
        }
      );

      // Handle typing indicators (for chat notifications)
      socket.on("typing:start", (data: { roomId: string }) => {
        this.handleTypingStart(socket, data);
      });

      socket.on("typing:stop", (data: { roomId: string }) => {
        this.handleTypingStop(socket, data);
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });

      // Handle errors
      socket.on("error", (error) => {
        this.logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Handle user authentication
   */
  private async handleAuthentication(
    socket: Socket,
    data: { userId: string; token?: string }
  ): Promise<void> {
    try {
      const { userId, token } = data;

      if (!userId) {
        socket.emit("error", {
          message: "userId is required for authentication",
        });
        return;
      }

      // Validate token with JWT service if provided
      if (token) {
        try {
          const payload = this.jwtService.verify(token, {
            secret: this.configService.get<string>("jwt.secret"),
          });

          // Verify the token belongs to the claimed user
          if (payload.sub !== userId) {
            this.logger.warn(
              `Socket auth: Token userId mismatch. Token: ${payload.sub}, Claimed: ${userId}`
            );
            socket.emit("error", { message: "Invalid authentication token" });
            return;
          }

          this.logger.debug(`Socket auth: Token validated for user ${userId}`);
        } catch (jwtError) {
          const errorMessage =
            jwtError instanceof Error ? jwtError.message : "Unknown error";
          this.logger.warn(
            `Socket auth: Token validation failed for user ${userId}: ${errorMessage}`
          );
          socket.emit("error", {
            message: "Invalid or expired authentication token",
          });
          return;
        }
      } else {
        // No token provided - log warning but allow connection for backward compatibility
        this.logger.warn(
          `Socket auth: No token provided for user ${userId}. Consider requiring tokens in production.`
        );
      }

      // Store user connection
      const onlineUser: OnlineUser = {
        userId,
        socketId: socket.id,
        connectedAt: new Date(),
        userAgent: socket.handshake.headers["user-agent"],
      };

      const existingConnections = this.onlineUsers.get(userId) || [];
      existingConnections.push(onlineUser);
      this.onlineUsers.set(userId, existingConnections);
      this.socketToUser.set(socket.id, userId);

      // Join user-specific room
      socket.join(`user:${userId}`);

      // Mark all undelivered notifications as delivered (Double tick ✓✓)
      // User is now online, so all pending notifications are considered delivered
      if (this.notificationsService) {
        try {
          const deliveredCount =
            await this.notificationsService.markAllAsDelivered(userId);
          if (deliveredCount > 0) {
            this.logger.debug(
              `Marked ${deliveredCount} notifications as delivered for user ${userId}`
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to mark notifications as delivered: ${error}`
          );
        }
      }

      // Emit authentication success
      socket.emit("authenticated", {
        userId,
        socketId: socket.id,
        message: "Successfully authenticated",
      });

      this.logger.log(`User ${userId} authenticated with socket ${socket.id}`);

      // Emit user online status to relevant rooms (optional)
      this.io?.emit("user:online", { userId, timestamp: new Date() });
    } catch (error) {
      this.logger.error("Authentication error:", error);
      socket.emit("error", { message: "Authentication failed" });
    }
  }

  /**
   * Handle notification read event
   */
  private async handleNotificationRead(
    socket: Socket,
    data: { notificationId: string }
  ): Promise<void> {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) return;

    this.logger.debug(
      `User ${userId} marked notification ${data.notificationId} as read`
    );

    // Update notification status in database via NotificationsService
    if (this.notificationsService) {
      try {
        await this.notificationsService.markAsRead(data.notificationId, userId);
        socket.emit("notification:read:success", {
          notificationId: data.notificationId,
        });
      } catch (error) {
        this.logger.error(`Failed to mark notification as read: ${error}`);
        socket.emit("notification:read:error", {
          notificationId: data.notificationId,
          error: "Failed to mark as read",
        });
      }
    } else {
      socket.emit("notification:read:success", {
        notificationId: data.notificationId,
      });
    }
  }

  /**
   * Handle notification delivered event
   */
  private async handleNotificationDelivered(
    socket: Socket,
    data: { notificationId: string }
  ): Promise<void> {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) return;

    this.logger.debug(
      `Notification ${data.notificationId} delivered to user ${userId}`
    );

    // Update delivery status in database
    if (this.notificationsService) {
      try {
        await this.notificationsService.markAsDelivered(
          data.notificationId,
          userId
        );
      } catch (error) {
        this.logger.error(`Failed to mark notification as delivered: ${error}`);
      }
    }
  }

  /**
   * Handle typing start event
   */
  private handleTypingStart(socket: Socket, data: { roomId: string }): void {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) return;

    socket
      .to(data.roomId)
      .emit("typing:start", { userId, roomId: data.roomId });
  }

  /**
   * Handle typing stop event
   */
  private handleTypingStop(socket: Socket, data: { roomId: string }): void {
    const userId = this.socketToUser.get(socket.id);
    if (!userId) return;

    socket.to(data.roomId).emit("typing:stop", { userId, roomId: data.roomId });
  }

  /**
   * Handle socket disconnect
   */
  private handleDisconnect(socket: Socket): void {
    const userId = this.socketToUser.get(socket.id);

    if (userId) {
      // Remove this specific socket connection
      const connections = this.onlineUsers.get(userId) || [];
      const updatedConnections = connections.filter(
        (conn) => conn.socketId !== socket.id
      );

      if (updatedConnections.length > 0) {
        this.onlineUsers.set(userId, updatedConnections);
      } else {
        // User has no more active connections
        this.onlineUsers.delete(userId);
        this.io?.emit("user:offline", { userId, timestamp: new Date() });
        this.logger.log(`User ${userId} is now offline`);
      }

      this.socketToUser.delete(socket.id);
      this.logger.log(`Socket ${socket.id} disconnected (user: ${userId})`);
    } else {
      this.logger.log(`Socket ${socket.id} disconnected (unauthenticated)`);
    }
  }

  /**
   * Send notification to a specific user
   */
  async sendNotificationToUser(
    userId: string,
    notification: NotificationPayload
  ): Promise<boolean> {
    if (!this.isEnabled || !this.io) {
      this.logger.warn(
        "Socket.IO not available - notification not sent via WebSocket"
      );
      return false;
    }

    try {
      const payload = {
        ...notification,
        userId,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: notification.createdAt || new Date(),
        timestamp: new Date(),
      };

      // Send to all user's connected sockets
      this.io.to(`user:${userId}`).emit("notification", payload);

      const connections = this.onlineUsers.get(userId);
      const isOnline = connections && connections.length > 0;

      this.logger.debug(
        `Notification sent to user ${userId} (${isOnline ? "online" : "offline"}): ${notification.title}`
      );

      return isOnline || false;
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${userId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToUsers(
    userIds: string[],
    notification: NotificationPayload
  ): Promise<number> {
    if (!this.isEnabled || !this.io) {
      this.logger.warn(
        "Socket.IO not available - notifications not sent via WebSocket"
      );
      return 0;
    }

    let successCount = 0;

    for (const userId of userIds) {
      const sent = await this.sendNotificationToUser(userId, {
        ...notification,
        userId,
      });
      if (sent) successCount++;
    }

    this.logger.log(
      `Sent notification to ${successCount}/${userIds.length} users: ${notification.title}`
    );
    return successCount;
  }

  /**
   * Broadcast notification to all connected users
   */
  async broadcastNotification(
    notification: NotificationPayload
  ): Promise<void> {
    if (!this.isEnabled || !this.io) {
      this.logger.warn("Socket.IO not available - broadcast not sent");
      return;
    }

    try {
      const payload = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: notification.createdAt || new Date(),
        timestamp: new Date(),
      };

      this.io.emit("notification", payload);

      const onlineCount = this.getOnlineUsersCount();
      this.logger.log(
        `Broadcast notification sent to ${onlineCount} online users: ${notification.title}`
      );
    } catch (error) {
      this.logger.error("Failed to broadcast notification:", error);
    }
  }

  /**
   * Send notification to users with specific role
   */
  async sendNotificationToRole(
    role: string,
    notification: NotificationPayload
  ): Promise<void> {
    if (!this.isEnabled || !this.io) {
      this.logger.warn("Socket.IO not available - role notification not sent");
      return;
    }

    try {
      const payload = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: notification.createdAt || new Date(),
        timestamp: new Date(),
      };

      this.io.to(`role:${role}`).emit("notification", payload);

      this.logger.log(
        `Notification sent to role ${role}: ${notification.title}`
      );
    } catch (error) {
      this.logger.error(`Failed to send notification to role ${role}:`, error);
    }
  }

  /**
   * Send notification to a specific room
   */
  async sendNotificationToRoom(
    roomId: string,
    notification: NotificationPayload
  ): Promise<void> {
    if (!this.isEnabled || !this.io) {
      this.logger.warn("Socket.IO not available - room notification not sent");
      return;
    }

    try {
      const payload = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: notification.createdAt || new Date(),
        timestamp: new Date(),
      };

      this.io.to(roomId).emit("notification", payload);

      this.logger.log(
        `Notification sent to room ${roomId}: ${notification.title}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification to room ${roomId}:`,
        error
      );
    }
  }

  /**
   * Check if a user is currently online
   */
  isUserOnline(userId: string): boolean {
    const connections = this.onlineUsers.get(userId);
    return connections ? connections.length > 0 : false;
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  /**
   * Get count of online users
   */
  getOnlineUsersCount(): number {
    return this.onlineUsers.size;
  }

  /**
   * Get all socket connections for a user
   */
  getUserConnections(userId: string): OnlineUser[] {
    return this.onlineUsers.get(userId) || [];
  }

  /**
   * Disconnect a specific user (all their sockets)
   */
  async disconnectUser(userId: string, reason?: string): Promise<void> {
    if (!this.isEnabled || !this.io) {
      this.logger.warn("Socket.IO not available - cannot disconnect user");
      return;
    }

    const connections = this.onlineUsers.get(userId);
    if (!connections) return;

    for (const connection of connections) {
      const socket = this.io.sockets.sockets.get(connection.socketId);
      if (socket) {
        socket.emit("force_disconnect", {
          reason: reason || "Disconnected by server",
        });
        socket.disconnect(true);
      }
    }

    this.onlineUsers.delete(userId);
    this.logger.log(
      `Disconnected user ${userId}. Reason: ${reason || "Not specified"}`
    );
  }

  /**
   * Add user to a room
   */
  async joinRoom(userId: string, roomId: string): Promise<void> {
    if (!this.isEnabled || !this.io) {
      this.logger.warn("Socket.IO not available - cannot join room");
      return;
    }

    const connections = this.onlineUsers.get(userId);
    if (!connections) {
      this.logger.warn(
        `User ${userId} is not online - cannot join room ${roomId}`
      );
      return;
    }

    for (const connection of connections) {
      const socket = this.io.sockets.sockets.get(connection.socketId);
      if (socket) {
        socket.join(roomId);
      }
    }

    this.logger.debug(`User ${userId} joined room ${roomId}`);
  }

  /**
   * Remove user from a room
   */
  async leaveRoom(userId: string, roomId: string): Promise<void> {
    if (!this.isEnabled || !this.io) {
      this.logger.warn("Socket.IO not available - cannot leave room");
      return;
    }

    const connections = this.onlineUsers.get(userId);
    if (!connections) return;

    for (const connection of connections) {
      const socket = this.io.sockets.sockets.get(connection.socketId);
      if (socket) {
        socket.leave(roomId);
      }
    }

    this.logger.debug(`User ${userId} left room ${roomId}`);
  }

  /**
   * Get Socket.IO server instance (for advanced usage)
   */
  getServer(): Server | null {
    return this.io;
  }

  /**
   * Check if Socket.IO is enabled and available
   */
  isAvailable(): boolean {
    return this.isEnabled && this.io !== null;
  }
}
