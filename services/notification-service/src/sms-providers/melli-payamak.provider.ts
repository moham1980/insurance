import { ISmsProvider } from './sms-provider.interface';

/**
 * MelliPayamak SMS Provider
 * Integrates with MelliPayamak (ملی پیامک) REST API for sending SMS and OTP.
 *
 * Environment variables:
 * - MELLIPAYAMAK_USERNAME: API username
 * - MELLIPAYAMAK_PASSWORD: API password
 * - MELLIPAYAMAK_SENDER_NUMBER: Sender number (default: 30002621)
 * - MELLIPAYAMAK_OTP_TEMPLATE: OTP template name (default: verify)
 */
export class MelliPayamakProvider implements ISmsProvider {
  private username: string;
  private password: string;
  private senderNumber: string;
  private otpTemplate: string;
  private baseUrl: string = 'https://rest.payamak-panel.com/api/SMS';

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
    this.senderNumber = process.env.MELLIPAYAMAK_SENDER_NUMBER || '30002621';
    this.otpTemplate = process.env.MELLIPAYAMAK_OTP_TEMPLATE || 'verify';
  }

  async sendSms(recipient: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/SendSMS`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.username,
          password: this.password,
          to: recipient,
          from: this.senderNumber,
          text: message,
          isFlash: false,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return { success: false, error: `MelliPayamak HTTP ${response.status}: ${errorBody}` };
      }

      const result = await response.json() as any;

      if (result.RetStatus && Number(result.RetStatus) !== 1) {
        return { success: false, error: `MelliPayamak error: ${result.StrRetStatus || 'Unknown'}` };
      }

      return { success: true, messageId: String(result.SMSId || result.id || '') };
    } catch (error: any) {
      return { success: false, error: error.message || 'MelliPayamak send failed' };
    }
  }

  async sendOtp(recipient: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/SendVerifySMS`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.username,
          password: this.password,
          receptor: recipient,
          template: this.otpTemplate,
          token: otp,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return { success: false, error: `MelliPayamak OTP HTTP ${response.status}: ${errorBody}` };
      }

      const result = await response.json() as any;

      if (result.RetStatus && Number(result.RetStatus) !== 1) {
        return { success: false, error: `MelliPayamak OTP error: ${result.StrRetStatus || 'Unknown'}` };
      }

      return { success: true, messageId: String(result.SMSId || result.id || '') };
    } catch (error: any) {
      return { success: false, error: error.message || 'MelliPayamak OTP failed' };
    }
  }
}
