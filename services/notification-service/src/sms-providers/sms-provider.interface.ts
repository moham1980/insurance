export interface ISmsProvider {
  sendSms(recipient: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendOtp(recipient: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
