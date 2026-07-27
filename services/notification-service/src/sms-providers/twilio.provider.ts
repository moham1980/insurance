import { ISmsProvider } from './sms-provider.interface';
import { Twilio } from 'twilio';

export class TwilioProvider implements ISmsProvider {
  private client: Twilio;

  constructor(accountSid: string, authToken: string) {
    this.client = new Twilio(accountSid, authToken);
  }

  async sendSms(recipient: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: recipient,
      });
      return { success: true, messageId: response.sid };
    } catch (error: any) {
      return { success: false, error: error.message || 'Twilio send failed' };
    }
  }

  async sendOtp(recipient: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Your verification code is: ${otp}. Valid for 5 minutes.`;
    return this.sendSms(recipient, message);
  }
}
