import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}

export interface NotificationEmailData {
  recipientName: string;
  recipientEmail: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  type: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get<string>(
      "EMAIL_FROM",
      "noreply@smartfisherlanka.com"
    );
    this.fromName = this.configService.get<string>(
      "EMAIL_FROM_NAME",
      "Smart Fisher Lanka"
    );

    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailHost = this.configService.get<string>("EMAIL_HOST");
    const emailPort = this.configService.get<number>("EMAIL_PORT", 587);
    const emailUser = this.configService.get<string>("EMAIL_USER");
    const emailPassword = this.configService.get<string>("EMAIL_PASSWORD");
    const emailSecure = this.configService.get<boolean>("EMAIL_SECURE", false);

    if (!emailHost || !emailUser || !emailPassword) {
      this.logger.warn(
        "Email configuration incomplete. Email service will run in mock mode."
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailSecure,
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });

      this.logger.log("Email service initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize email transporter", error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.warn(
          `Mock email send to ${options.to}: ${options.subject}`
        );
        return true;
      }

      const mailOptions = {
        from: options.from || `"${this.fromName}" <${this.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc.join(", ")
            : options.cc
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.join(", ")
            : options.bcc
          : undefined,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error("Failed to send email", error);
      return false;
    }
  }

  async sendWelcomeEmail(
    email: string,
    name: string,
    tempPassword?: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Smart Fisher lanka! </h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>We're excited to have you on board. Your account has been successfully created.</p>
              ${
                tempPassword
                  ? `
                <p><strong>Your temporary password:</strong> <code style="background: #e0e0e0; padding: 5px 10px; border-radius: 3px;">${tempPassword}</code></p>
                <p><em>Please change this password after your first login for security purposes.</em></p>
              `
                  : ""
              }
              <p>Get started by logging into your account:</p>
              <a href="${this.configService.get("FRONTEND_URL")}/login" class="button">Login Now</a>
              <p>If you have any questions, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Smart Fisher Lanka. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: "Welcome to Smart Fisher Lanka! 🎓",
      html,
    });
  }

  async sendPaymentConfirmation(
    email: string,
    name: string,
    amount: number,
    transactionId: string,
    description: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; }
            .receipt { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
            .total { font-size: 18px; font-weight: bold; color: #10b981; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Payment Received</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Your payment has been successfully processed.</p>
              <div class="receipt">
                <h3>Payment Receipt</h3>
                <div class="receipt-row">
                  <span>Transaction ID:</span>
                  <span><strong>${transactionId}</strong></span>
                </div>
                <div class="receipt-row">
                  <span>Description:</span>
                  <span>${description}</span>
                </div>
                <div class="receipt-row">
                  <span>Date:</span>
                  <span>${new Date().toLocaleDateString()}</span>
                </div>
                <div class="receipt-row total">
                  <span>Amount Paid:</span>
                  <span>$${amount.toFixed(2)}</span>
                </div>
              </div>
              <p>Thank you for your payment. You can view your receipt anytime in your account dashboard.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Smart Fisher Lanka. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: "Payment Confirmation - Smart Fisher Lanka",
      html,
    });
  }

  async sendClassEnrollmentConfirmation(
    email: string,
    studentName: string,
    className: string,
    teacherName: string,
    startDate: Date
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; }
            .class-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-row { padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
            .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Enrollment Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hello ${studentName}!</h2>
              <p>Congratulations! You have been successfully enrolled in the following class:</p>
              <div class="class-info">
                <div class="info-row">
                  <strong>Class:</strong> ${className}
                </div>
                <div class="info-row">
                  <strong>Teacher:</strong> ${teacherName}
                </div>
                <div class="info-row">
                  <strong>Start Date:</strong> ${startDate.toLocaleDateString()}
                </div>
              </div>
              <p>You can access your class materials and schedule in your dashboard.</p>
              <a href="${this.configService.get("FRONTEND_URL")}/dashboard/classes" class="button">Go to My Classes</a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Smart Fisher Lanka. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Enrollment Confirmed: ${className}`,
      html,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string
  ): Promise<boolean> {
    const resetUrl = `${this.configService.get("FRONTEND_URL")}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; }
            .button { display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e0e0e0; padding: 10px; border-radius: 5px;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email and your password will remain unchanged.
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Smart Fisher Lanka. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: "Password Reset Request - Smart Fisher Lanka",
      html,
    });
  }

  async sendAttendanceNotification(
    email: string,
    studentName: string,
    className: string,
    date: Date,
    status: "present" | "absent" | "late"
  ): Promise<boolean> {
    const statusColors = {
      present: "#10b981",
      absent: "#ef4444",
      late: "#f59e0b",
    };

    const statusIcons = {
      present: "✓",
      absent: "✗",
      late: "⚠",
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${statusColors[status]}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusIcons[status]} Attendance Update</h1>
            </div>
            <div class="content">
              <h2>Hello!</h2>
              <p><strong>${studentName}</strong> was marked <strong style="color: ${statusColors[status]};">${status.toUpperCase()}</strong> for the class:</p>
              <p><strong>Class:</strong> ${className}</p>
              <p><strong>Date:</strong> ${date.toLocaleDateString()}</p>
              <p>You can view the full attendance history in your dashboard.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Smart Fisher Lanka. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Attendance Update: ${className}`,
      html,
    });
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  isAvailable(): boolean {
    return this.transporter !== null;
  }

  async sendNotificationEmail(data: NotificationEmailData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Smart Fisher Lanka</h1>
            </div>
            <div class="content">
              <h2>${data.title}</h2>
              <p>Hi ${data.recipientName},</p>
              <p>${data.message}</p>
              ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">${data.actionText || "View Details"}</a>` : ""}
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Smart Fisher Lanka. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: data.recipientEmail,
      subject: data.title,
      html,
    });
  }

  async sendBulkNotificationEmails(
    notifications: NotificationEmailData[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const notification of notifications) {
      try {
        const result = await this.sendNotificationEmail(notification);
        if (result) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to send notification email to ${notification.recipientEmail}`,
          error
        );
        failed++;
      }
    }

    return { success, failed };
  }
}
