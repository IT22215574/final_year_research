import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsGateway } from "@infrastructure/websocket/notifications.gateway";
import { PrismaModule } from "@database/prisma.module";
import { EmailService } from "./services/email.service";
import { SocketNotificationService } from "./services/socket-notification.service";
import { SmsService } from "./services/sms.service";

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRATION", "7d"),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    EmailService,
    SocketNotificationService,
    SmsService,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
    EmailService,
    SocketNotificationService,
    SmsService,
  ],
})
export class NotificationsModule {
  constructor(
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private socketNotificationService: SocketNotificationService
  ) {
    // Wire up the gateway to the service to avoid circular dependency
    this.notificationsService.setNotificationsGateway(
      this.notificationsGateway
    );
    // Wire up the socket notification service with the notifications service
    this.socketNotificationService.setNotificationsService(
      this.notificationsService
    );
  }
}
