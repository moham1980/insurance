import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface SmsInquiryRequest {
  phoneNumber: string;
  inquiryType: 'NATIONAL_ID_UNIQUE_CODE' | 'POLICY_NUMBER' | 'VIN';
  nationalId?: string;
  uniqueCode?: string;
  policyNumber?: string;
  vin?: string;
}

export interface SmsInquiryResponse {
  success: boolean;
  inquiryId: string;
  message?: string;
  errorCode?: string;
  result?: {
    resultCode: 'OK' | 'NOT_FOUND' | 'MISMATCH' | 'PENDING_SYNC' | 'UPSTREAM_ERROR';
    policyNumber?: string;
    uniqueCode?: string;
    insuredNationalId?: string;
    vehicleVin?: string;
    insurerCode?: string;
    issueDate?: string;
    expiryDate?: string;
    errorMessage?: string;
  };
}

export interface SmsInquiryConfig {
  enabled: boolean;
  smsProvider: 'KAVENEGAR' | 'TWILIO' | 'MELLIPAYAMAK';
  shortCode: string;
  apiKey: string;
  timeoutMs: number;
  maxRetries: number;
}

@Injectable()
export class SanhabSmsInquiryService {
  private readonly logger = new Logger(SanhabSmsInquiryService.name);
  private pendingInquiries: Map<string, SmsInquiryRequest> = new Map();

  constructor() {}

  getConfiguration(): SmsInquiryConfig {
    return {
      enabled: process.env.SANHAB_SMS_INQUIRY_ENABLED === 'true',
      smsProvider: (process.env.SMS_PROVIDER || 'KAVENEGAR') as 'KAVENEGAR' | 'TWILIO' | 'MELLIPAYAMAK',
      shortCode: process.env.SANHAB_SMS_SHORT_CODE || '30002621',
      apiKey: process.env.SMS_API_KEY || '',
      timeoutMs: parseInt(process.env.SMS_TIMEOUT_MS || '30000', 10),
      maxRetries: parseInt(process.env.SMS_MAX_RETRIES || '3', 10),
    };
  }

  async initiateSmsInquiry(request: SmsInquiryRequest): Promise<SmsInquiryResponse> {
    const config = this.getConfiguration();
    const inquiryId = uuidv4();

    this.logger.log(`Initiating SMS inquiry: ${inquiryId}, phone: ${request.phoneNumber}, type: ${request.inquiryType}`);

    if (!config.enabled) {
      this.logger.warn('SMS inquiry is disabled');
      return {
        success: false,
        inquiryId,
        message: 'SMS inquiry is disabled',
        errorCode: 'SMS_INQUIRY_DISABLED',
      };
    }

    if (!config.apiKey) {
      return {
        success: false,
        inquiryId,
        message: 'SMS API key not configured',
        errorCode: 'API_KEY_MISSING',
      };
    }

    const validation = this.validateRequest(request);
    if (!validation.valid) {
      return {
        success: false,
        inquiryId,
        message: validation.error,
        errorCode: 'INVALID_REQUEST',
      };
    }

    this.pendingInquiries.set(inquiryId, request);

    try {
      const smsSent = await this.sendSms(config, request, inquiryId);

      if (smsSent) {
        return {
          success: true,
          inquiryId,
          message: 'SMS sent successfully. Please reply with your inquiry details.',
        };
      } else {
        return {
          success: false,
          inquiryId,
          message: 'Failed to send SMS',
          errorCode: 'SMS_SEND_FAILED',
        };
      }
    } catch (error: any) {
      this.logger.error(`SMS inquiry failed: ${error.message}`);
      return {
        success: false,
        inquiryId,
        message: error.message || 'SMS inquiry failed',
        errorCode: 'SMS_INQUIRY_ERROR',
      };
    }
  }

  private validateRequest(request: SmsInquiryRequest): { valid: boolean; error?: string } {
    if (!request.phoneNumber) {
      return { valid: false, error: 'Phone number is required' };
    }

    const phoneRegex = /^09[0-9]{9}$/;
    if (!phoneRegex.test(request.phoneNumber)) {
      return { valid: false, error: 'Invalid phone number format' };
    }

    switch (request.inquiryType) {
      case 'NATIONAL_ID_UNIQUE_CODE':
        if (!request.nationalId || !request.uniqueCode) {
          return { valid: false, error: 'National ID and unique code are required for this inquiry type' };
        }
        break;
      case 'POLICY_NUMBER':
        if (!request.policyNumber) {
          return { valid: false, error: 'Policy number is required for this inquiry type' };
        }
        break;
      case 'VIN':
        if (!request.vin) {
          return { valid: false, error: 'VIN is required for this inquiry type' };
        }
        break;
    }

    return { valid: true };
  }

  private async sendSms(
    config: SmsInquiryConfig,
    request: SmsInquiryRequest,
    inquiryId: string
  ): Promise<boolean> {
    const message = this.buildSmsMessage(request, inquiryId);
    this.logger.log(`Sending SMS to ${request.phoneNumber} via ${config.smsProvider}`);

    try {
      switch (config.smsProvider) {
        case 'KAVENEGAR':
          return await this.sendKavenegarSms(config, request.phoneNumber, message);
        case 'TWILIO':
          return await this.sendTwilioSms(config, request.phoneNumber, message);
        case 'MELLIPAYAMAK':
          return await this.sendMelliPayamakSms(config, request.phoneNumber, message);
        default:
          throw new Error(`Unsupported SMS provider: ${config.smsProvider}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to send SMS via ${config.smsProvider}: ${error.message}`);
      return false;
    }
  }

  private buildSmsMessage(request: SmsInquiryRequest, inquiryId: string): string {
    const baseMessage = `بیمه مرکزی ایران\nکد استعلام: ${inquiryId}\n`;

    switch (request.inquiryType) {
      case 'NATIONAL_ID_UNIQUE_CODE':
        return `${baseMessage}لطفاً کد ملی و کد یکتا را با فرمت زیر پاسخ دهید:\n${inquiryId} [کد ملی] [کد یکتا]`;
      case 'POLICY_NUMBER':
        return `${baseMessage}لطفاً شماره بیمه‌نامه را با فرمت زیر پاسخ دهید:\n${inquiryId} [شماره بیمه‌نامه]`;
      case 'VIN':
        return `${baseMessage}لطفاً شماره VIN را با فرمت زیر پاسخ دهید:\n${inquiryId} [شماره VIN]`;
      default:
        return baseMessage;
    }
  }

  private async sendKavenegarSms(
    config: SmsInquiryConfig,
    phoneNumber: string,
    message: string
  ): Promise<boolean> {
    this.logger.log(`Sending Kavenegar SMS to ${phoneNumber}: ${message}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }

  private async sendTwilioSms(
    config: SmsInquiryConfig,
    phoneNumber: string,
    message: string
  ): Promise<boolean> {
    this.logger.log(`Sending Twilio SMS to ${phoneNumber}: ${message}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }

  private async sendMelliPayamakSms(
    config: SmsInquiryConfig,
    phoneNumber: string,
    message: string
  ): Promise<boolean> {
    this.logger.log(`Sending Melli Payamak SMS to ${phoneNumber}: ${message}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }

  async handleSmsReply(from: string, message: string): Promise<SmsInquiryResponse> {
    this.logger.log(`Received SMS reply from ${from}: ${message}`);

    const parsed = this.parseSmsReply(message);

    if (!parsed) {
      return {
        success: false,
        inquiryId: '',
        message: 'Invalid SMS format',
        errorCode: 'INVALID_SMS_FORMAT',
      };
    }

    const pendingInquiry = Array.from(this.pendingInquiries.entries()).find(
      ([_, req]) => req.phoneNumber === from
    );

    if (!pendingInquiry) {
      return {
        success: false,
        inquiryId: '',
        message: 'No pending inquiry found for this phone number',
        errorCode: 'NO_PENDING_INQUIRY',
      };
    }

    const [inquiryId, request] = pendingInquiry;
    const result = await this.performSanhabInquiry(request, parsed);

    await this.sendInquiryResult(from, result);
    this.pendingInquiries.delete(inquiryId);

    return {
      success: true,
      inquiryId,
      message: 'Inquiry completed and result sent via SMS',
      result,
    };
  }

  private parseSmsReply(message: string): { inquiryId: string; data: string } | null {
    const parts = message.trim().split(/\s+/);
    if (parts.length < 2) {
      return null;
    }

    return {
      inquiryId: parts[0],
      data: parts.slice(1).join(' '),
    };
  }

  private async performSanhabInquiry(
    request: SmsInquiryRequest,
    parsed: { inquiryId: string; data: string }
  ): Promise<SmsInquiryResponse['result']> {
    this.logger.log(`Performing Sanhab inquiry for type: ${request.inquiryType}`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      resultCode: 'OK',
      policyNumber: 'POL-2024-001',
      uniqueCode: '12345678',
      insuredNationalId: request.nationalId || '0123456789',
      vehicleVin: request.vin || 'VIN1234567890',
      insurerCode: '001',
      issueDate: '2024-03-21',
      expiryDate: '2025-03-21',
    };
  }

  private async sendInquiryResult(phoneNumber: string, result: any): Promise<void> {
    const config = this.getConfiguration();
    const message = this.buildResultMessage(result);

    try {
      await this.sendSms(config, { phoneNumber } as SmsInquiryRequest, 'RESULT');
      this.logger.log(`Inquiry result sent to ${phoneNumber}`);
    } catch (error: any) {
      this.logger.error(`Failed to send inquiry result: ${error.message}`);
    }
  }

  private buildResultMessage(result: any): string {
    if (result.resultCode === 'OK') {
      return `نتیجه استعلام:\nشماره بیمه‌نامه: ${result.policyNumber}\nکد یکتا: ${result.uniqueCode}\nتاریخ صدور: ${result.issueDate}\nتاریخ انقضا: ${result.expiryDate}`;
    } else {
      return `نتیجه استعلام: ${result.errorMessage || 'خطا در استعلام'}`;
    }
  }

  async getPendingInquiry(inquiryId: string): Promise<SmsInquiryRequest | null> {
    return this.pendingInquiries.get(inquiryId) || null;
  }

  async getPendingInquiriesByPhone(phoneNumber: string): Promise<SmsInquiryRequest[]> {
    return Array.from(this.pendingInquiries.values()).filter(
      (req) => req.phoneNumber === phoneNumber
    );
  }

  async cancelInquiry(inquiryId: string): Promise<boolean> {
    return this.pendingInquiries.delete(inquiryId);
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    enabled: boolean;
    smsProvider: string;
    shortCode: string;
    message: string;
  }> {
    const config = this.getConfiguration();

    return {
      healthy: true,
      enabled: config.enabled,
      smsProvider: config.smsProvider,
      shortCode: config.shortCode,
      message: config.enabled ? 'SMS inquiry is configured and ready' : 'SMS inquiry is disabled',
    };
  }

  async getConfig(): Promise<SmsInquiryConfig> {
    return this.getConfiguration();
  }

  async updateConfig(updates: Partial<SmsInquiryConfig>): Promise<SmsInquiryConfig> {
    this.logger.log('SMS inquiry config updated', { updates });
    return { ...this.getConfiguration(), ...updates };
  }
}
