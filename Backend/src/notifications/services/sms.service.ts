import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export interface SmsOptions {
  to: string; // Phone number with country code
  message: string;
  from?: string; // Optional sender ID
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
}

/**
 * SMS Notification Service using QuickSend
 *
 * Provides SMS messaging capabilities for critical notifications like:
 * - OTP/verification codes
 * - Payment confirmations
 * - Emergency alerts
 * - Class cancellations
 * - Exam reminders
 *
 * Features:
 * - Mock mode for development without QuickSend credentials
 * - International phone number support
 * - Template-based messages
 * - Delivery status tracking
 * - Error handling and logging
 * - Bulk SMS support
 *
 * Configuration (Environment Variables):
 * - QUICKSEND_API_KEY: Your QuickSend API key
 * - QUICKSEND_SENDER_ID: Default sender ID/name (e.g., 'SmartFisherLanka')
 * - QUICKSEND_API_URL: QuickSend API endpoint (default: https://www.quicksend.lk/api)
 * - SMS_ENABLED: Enable/disable SMS sending (default: false)
 *
 * @example
 * await smsService.sendSms({
 *   to: '94771234567',
 *   message: 'Your OTP is: 123456'
 * });
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private httpClient: AxiosInstance;
  private isEnabled: boolean = false;
  private isMockMode: boolean = false;
  private apiKey: string;
  private senderId: string;
  private apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("QUICKSEND_API_KEY", "");
    this.senderId = this.configService.get<string>(
      "QUICKSEND_SENDER_ID",
      "SmartFisherLanka"
    );
    this.apiUrl = this.configService.get<string>(
      "QUICKSEND_API_URL",
      "https://www.quicksend.lk/api"
    );
    this.isEnabled = this.configService.get<boolean>("SMS_ENABLED", false);

    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (this.isEnabled) {
      if (!this.apiKey) {
        this.logger.warn(
          "SMS is enabled but QuickSend API key is missing. Running in MOCK mode. " +
            "Set QUICKSEND_API_KEY environment variable."
        );
        this.isMockMode = true;
      } else {
        this.logger.log("QuickSend SMS service initialized successfully");
        this.logger.log(`Sender ID: ${this.senderId}`);
      }
    } else {
      this.logger.log(
        "SMS service is disabled. Set SMS_ENABLED=true to enable."
      );
    }
  }

  /**
   * Send SMS message via QuickSend API
   */
  async sendSms(options: SmsOptions): Promise<SmsResult> {
    if (!this.isEnabled) {
      this.logger.debug("SMS disabled - message not sent");
      return {
        success: false,
        error: "SMS service is disabled",
      };
    }

    // Validate phone number
    if (!this.isValidPhoneNumber(options.to)) {
      this.logger.error(`Invalid phone number format: ${options.to}`);
      return {
        success: false,
        error: "Invalid phone number format",
      };
    }

    if (this.isMockMode) {
      return this.sendMockSms(options);
    }

    try {
      const payload = {
        api_key: this.apiKey,
        sender_id: options.from || this.senderId,
        to: this.normalizePhoneNumber(options.to),
        message: options.message,
      };

      const response = await this.httpClient.post("/send", payload);

      if (response.data && response.data.status === "success") {
        this.logger.log(
          `SMS sent successfully to ${options.to}. Message ID: ${response.data.message_id || "N/A"}`
        );

        return {
          success: true,
          messageId: response.data.message_id,
          status: "sent",
        };
      } else {
        this.logger.error(
          `QuickSend API error: ${response.data?.message || "Unknown error"}`
        );
        return {
          success: false,
          error: response.data?.message || "Failed to send SMS",
        };
      }
    } catch (error) {
      const err = error as Error & {
        response?: { data?: { message?: string } };
      };
      this.logger.error(
        `Failed to send SMS to ${options.to}:`,
        err.response?.data || err.message || error
      );

      return {
        success: false,
        error:
          err.response?.data?.message || err.message || "Failed to send SMS",
      };
    }
  }

  /**
   * Send OTP/verification code via SMS
   */
  async sendOtp(
    phoneNumber: string,
    otp: string,
    expiryMinutes: number = 10
  ): Promise<SmsResult> {
    const message = `Your SmartFisherLanka verification code is: ${otp}. Valid for ${expiryMinutes} minutes. Do not share this code with anyone.`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmation(
    phoneNumber: string,
    amount: number,
    transactionId: string
  ): Promise<SmsResult> {
    const message = `Payment Successful! Amount: $${amount.toFixed(2)}. Transaction ID: ${transactionId}. Thank you for using SmartFisherLanka.`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send class enrollment confirmation
   */
  async sendEnrollmentConfirmation(
    phoneNumber: string,
    studentName: string,
    className: string,
    startDate: Date
  ): Promise<SmsResult> {
    const formattedDate = startDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const message = `Hi ${studentName}! You're enrolled in ${className}. Classes start on ${formattedDate}. Welcome to SmartFisherLanka!`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send emergency alert
   */
  async sendEmergencyAlert(
    phoneNumber: string,
    alertMessage: string
  ): Promise<SmsResult> {
    const message = `⚠️ ALERT: ${alertMessage} - SmartFisherLanka`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send class cancellation notice
   */
  async sendClassCancellation(
    phoneNumber: string,
    studentName: string,
    className: string,
    date: Date,
    reason?: string
  ): Promise<SmsResult> {
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let message = `Hi ${studentName}, ${className} on ${formattedDate} has been cancelled.`;
    if (reason) {
      message += ` Reason: ${reason}.`;
    }
    message += " You will be notified of the reschedule.";

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send exam reminder
   */
  async sendExamReminder(
    phoneNumber: string,
    studentName: string,
    examName: string,
    examDate: Date,
    hoursBeforeExam: number
  ): Promise<SmsResult> {
    const formattedDate = examDate.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const message = `Hi ${studentName}, reminder: ${examName} is in ${hoursBeforeExam} hours on ${formattedDate}. Good luck!`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send attendance alert to parent
   */
  async sendAttendanceAlert(
    phoneNumber: string,
    studentName: string,
    className: string,
    status: "absent" | "late",
    date: Date
  ): Promise<SmsResult> {
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const statusText = status === "absent" ? "was absent from" : "was late to";
    const message = `Alert: ${studentName} ${statusText} ${className} on ${formattedDate}. For questions, contact SmartFisherLanka support.`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send password reset code
   */
  async sendPasswordReset(
    phoneNumber: string,
    name: string,
    resetCode: string
  ): Promise<SmsResult> {
    const message = `Hi ${name}, your SmartFisherLanka password reset code is: ${resetCode}. Valid for 15 minutes. If you didn't request this, ignore this message.`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  async sendBulkSms(
    phoneNumbers: string[],
    message: string
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: SmsResult[];
  }> {
    const results: SmsResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const phoneNumber of phoneNumbers) {
      const result = await this.sendSms({ to: phoneNumber, message });
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Add small delay between messages to avoid rate limiting
      await this.sleep(100);
    }

    this.logger.log(
      `Bulk SMS completed: ${successful} sent, ${failed} failed out of ${phoneNumbers.length} total`
    );

    return {
      total: phoneNumbers.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Check SMS delivery status via QuickSend API
   */
  async getMessageStatus(messageId: string): Promise<string | null> {
    if (!this.isEnabled || this.isMockMode) {
      return null;
    }

    try {
      const response = await this.httpClient.get("/status", {
        params: {
          api_key: this.apiKey,
          message_id: messageId,
        },
      });

      return response.data?.status || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to fetch message status for ${messageId}:`,
        message
      );
      return null;
    }
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Accept various formats: +94771234567, 94771234567, 0771234567
    const phoneRegex =
      /^(\+?\d{1,3})?[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}$/;
    return (
      phoneRegex.test(phoneNumber) && phoneNumber.replace(/\D/g, "").length >= 9
    );
  }

  /**
   * Normalize phone number (remove +, spaces, dashes)
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove +, spaces, dashes, parentheses
    return phoneNumber.replace(/[+\s\-()]/g, "");
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(
    phoneNumber: string,
    defaultCountryCode: string = "94"
  ): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "");

    // If doesn't start with country code, add default (Sri Lanka: 94)
    if (!cleaned.startsWith(defaultCountryCode)) {
      // Remove leading 0 if present
      if (cleaned.startsWith("0")) {
        cleaned = cleaned.substring(1);
      }
      cleaned = `${defaultCountryCode}${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Mock SMS sending (for development)
   */
  private async sendMockSms(options: SmsOptions): Promise<SmsResult> {
    const mockMessageId = `QS_MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log("📱 [MOCK SMS - QuickSend]");
    this.logger.log(`To: ${options.to}`);
    this.logger.log(`Sender ID: ${options.from || this.senderId}`);
    this.logger.log(`Message: ${options.message}`);
    this.logger.log(`Message ID: ${mockMessageId}`);
    this.logger.log("─────────────────────────────────────");

    return {
      success: true,
      messageId: mockMessageId,
      status: "sent",
    };
  }

  /**
   * Helper: Sleep function for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if SMS service is enabled
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Check if running in mock mode
   */
  isMockModeEnabled(): boolean {
    return this.isMockMode;
  }

  /**
   * Get service configuration info
   */
  getServiceInfo(): {
    enabled: boolean;
    mockMode: boolean;
    senderId: string;
    configured: boolean;
    apiUrl: string;
  } {
    return {
      enabled: this.isEnabled,
      mockMode: this.isMockMode,
      senderId: this.senderId || "Not configured",
      configured: !!this.apiKey,
      apiUrl: this.apiUrl,
    };
  }
}
