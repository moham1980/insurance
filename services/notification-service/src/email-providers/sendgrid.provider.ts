import { IEmailProvider } from './email-provider.interface';
import sgMail from '@sendgrid/mail';

export class SendGridProvider implements IEmailProvider {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    options?: {
      from?: string;
      html?: string;
      attachments?: Array<{ filename: string; content: string; contentType: string }>;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const msg = {
        to,
        from: options?.from || process.env.SENDGRID_FROM_EMAIL || 'noreply@insurance.com',
        subject,
        text: body,
        html: options?.html || body,
        attachments: options?.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType,
          disposition: 'attachment',
        })),
      };

      const response = await sgMail.send(msg);
      const messageId = response[0]?.headers['x-message-id'] || '';
      return { success: true, messageId };
    } catch (error: any) {
      const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'SendGrid send failed';
      return { success: false, error: errorMessage };
    }
  }
}
