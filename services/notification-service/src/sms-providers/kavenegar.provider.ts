import { ISmsProvider } from './sms-provider.interface';
import Kavenegar from 'kavenegar';

export class KavenegarProvider implements ISmsProvider {
  private client: any;

  constructor(apiKey: string) {
    this.client = Kavenegar.KavenegarApi({ apikey: apiKey });
  }

  async sendSms(recipient: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await this.client.Send({
        message: message,
        receptor: recipient,
        sender: process.env.KAVENEGAR_SENDER || '10008666',
      });
      return { success: true, messageId: response.messageid };
    } catch (error: any) {
      return { success: false, error: error.message || 'Kavenegar send failed' };
    }
  }

  async sendOtp(recipient: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await this.client.VerifyLookup({
        receptor: recipient,
        token: otp,
        template: process.env.KAVENEGAR_OTP_TEMPLATE || 'verify',
      });
      return { success: true, messageId: response.messageid };
    } catch (error: any) {
      return { success: false, error: error.message || 'Kavenegar OTP failed' };
    }
  }
}
