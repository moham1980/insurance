import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SanhabSmsInquiry } from '../entities/SanhabSmsInquiry';
import { RegulatoryService } from '../regulatory.service';

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

  constructor(
    @InjectRepository(SanhabSmsInquiry)
    private readonly inquiryRepo: Repository<SanhabSmsInquiry>,
    private readonly regulatoryService: RegulatoryService
  ) {}

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

    const entity = this.inquiryRepo.create({
      inquiryId,
      phoneNumber: request.phoneNumber,
      inquiryType: request.inquiryType,
      nationalId: request.nationalId || null,
      uniqueCode: request.uniqueCode || null,
      policyNumber: request.policyNumber || null,
      vin: request.vin || null,
      status: 'pending',
    });
    await this.inquiryRepo.save(entity);

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
    return this.sendRawSms(config, request.phoneNumber, message);
  }

  private async sendRawSms(
    config: SmsInquiryConfig,
    phoneNumber: string,
    message: string
  ): Promise<boolean> {
    this.logger.log(`Sending SMS to ${phoneNumber} via ${config.smsProvider}`);

    try {
      switch (config.smsProvider) {
        case 'KAVENEGAR':
          return await this.sendKavenegarSms(config, phoneNumber, message);
        case 'TWILIO':
          return await this.sendTwilioSms(config, phoneNumber, message);
        case 'MELLIPAYAMAK':
          return await this.sendMelliPayamakSms(config, phoneNumber, message);
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
    const baseUrl = process.env.KAVENEGAR_BASE_URL || 'https://api.kavenegar.com/v1';
    const url = `${baseUrl}/${config.apiKey}/sms/send.json`;
    const params = new URLSearchParams({ receptor: phoneNumber, message, sender: config.shortCode });

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(t);
      return response.ok;
    } catch (error: any) {
      clearTimeout(t);
      this.logger.error(`Kavenegar SMS send failed: ${error.message}`);
      return false;
    }
  }

  private async sendTwilioSms(
    config: SmsInquiryConfig,
    phoneNumber: string,
    message: string
  ): Promise<boolean> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    const authToken = process.env.TWILIO_AUTH_TOKEN || '';
    const fromNumber = process.env.TWILIO_FROM_NUMBER || config.shortCode;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: new URLSearchParams({ To: phoneNumber, From: fromNumber, Body: message }).toString(),
        signal: controller.signal,
      });
      clearTimeout(t);
      return response.ok;
    } catch (error: any) {
      clearTimeout(t);
      this.logger.error(`Twilio SMS send failed: ${error.message}`);
      return false;
    }
  }

  private async sendMelliPayamakSms(
    config: SmsInquiryConfig,
    phoneNumber: string,
    message: string
  ): Promise<boolean> {
    const url = process.env.MELLIPAYAMAK_SEND_URL || 'https://rest.payamak-panel.com/api/Send/SendSMS';
    const username = process.env.MELLIPAYAMAK_USERNAME || '';
    const password = process.env.MELLIPAYAMAK_PASSWORD || '';

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username,
          password,
          to: phoneNumber,
          from: config.shortCode,
          text: message,
          isflash: 'false',
        }).toString(),
        signal: controller.signal,
      });
      clearTimeout(t);
      return response.ok;
    } catch (error: any) {
      clearTimeout(t);
      this.logger.error(`MelliPayamak SMS send failed: ${error.message}`);
      return false;
    }
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

    const inquiry = await this.inquiryRepo.findOne({ where: { inquiryId: parsed.inquiryId, status: 'pending' } });
    if (!inquiry) {
      return {
        success: false,
        inquiryId: parsed.inquiryId,
        message: 'No pending inquiry found for this inquiry ID',
        errorCode: 'NO_PENDING_INQUIRY',
      };
    }

    const inquiryRequest: SmsInquiryRequest = {
      phoneNumber: inquiry.phoneNumber,
      inquiryType: inquiry.inquiryType,
      nationalId: inquiry.nationalId || undefined,
      uniqueCode: inquiry.uniqueCode || undefined,
      policyNumber: inquiry.policyNumber || undefined,
      vin: inquiry.vin || undefined,
    };

    const result = await this.performSanhabInquiry(inquiryRequest, parsed);

    await this.sendInquiryResult(from, result);
    inquiry.status = 'completed';
    inquiry.resultJson = result as object;
    await this.inquiryRepo.save(inquiry);

    return {
      success: true,
      inquiryId: inquiry.inquiryId,
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

    const inquiryBody = this.buildSanhabInquiryBody(request, parsed.data);
    try {
      const { status, result } = await this.regulatoryService.inquiry({
        correlationId: parsed.inquiryId,
        tenantId: undefined,
        actorUserId: 'sms-gateway',
        authorization: '',
        body: inquiryBody,
      });

      if (status !== 200 || !result?.success) {
        return {
          resultCode: 'UPSTREAM_ERROR',
          errorMessage: result?.error?.message || 'Sanhab inquiry failed',
        };
      }

      const responseData = result.data || {};
      return {
        resultCode: responseData.resultCode || 'OK',
        policyNumber: responseData.payload?.policyNumber,
        uniqueCode: responseData.payload?.uniqueCode,
        insuredNationalId: responseData.payload?.insuredNationalId,
        vehicleVin: responseData.payload?.vehicleVin,
        insurerCode: responseData.payload?.insurerCode,
        issueDate: responseData.payload?.issueDate,
        expiryDate: responseData.payload?.expiryDate,
        errorMessage: responseData.payload?.errorMessage,
      };
    } catch (error: any) {
      this.logger.error(`Sanhab inquiry failed: ${error.message}`);
      return {
        resultCode: 'UPSTREAM_ERROR',
        errorMessage: error.message || 'Sanhab inquiry failed',
      };
    }
  }

  private buildSanhabInquiryBody(
    request: SmsInquiryRequest,
    data: string
  ): { nationalId?: string; uniqueCode?: string; policyNumber?: string; vin?: string } {
    switch (request.inquiryType) {
      case 'NATIONAL_ID_UNIQUE_CODE': {
        const [nationalId, uniqueCode] = data.split(/\s+/);
        return { nationalId, uniqueCode };
      }
      case 'POLICY_NUMBER':
        return { policyNumber: data.trim() };
      case 'VIN':
        return { vin: data.trim() };
      default:
        return {};
    }
  }

  private async sendInquiryResult(phoneNumber: string, result: any): Promise<void> {
    const config = this.getConfiguration();
    const message = this.buildResultMessage(result);

    try {
      await this.sendRawSms(config, phoneNumber, message);
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
    const entity = await this.inquiryRepo.findOne({ where: { inquiryId, status: 'pending' } });
    return entity ? this.mapEntityToRequest(entity) : null;
  }

  async getPendingInquiriesByPhone(phoneNumber: string): Promise<SmsInquiryRequest[]> {
    const entities = await this.inquiryRepo.find({ where: { phoneNumber, status: 'pending' } });
    return entities.map((e) => this.mapEntityToRequest(e));
  }

  async cancelInquiry(inquiryId: string): Promise<boolean> {
    const entity = await this.inquiryRepo.findOne({ where: { inquiryId } });
    if (!entity) return false;
    entity.status = 'cancelled';
    await this.inquiryRepo.save(entity);
    return true;
  }

  private mapEntityToRequest(entity: SanhabSmsInquiry): SmsInquiryRequest {
    return {
      phoneNumber: entity.phoneNumber,
      inquiryType: entity.inquiryType,
      nationalId: entity.nationalId || undefined,
      uniqueCode: entity.uniqueCode || undefined,
      policyNumber: entity.policyNumber || undefined,
      vin: entity.vin || undefined,
    };
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
