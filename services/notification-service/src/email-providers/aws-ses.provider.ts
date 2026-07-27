import { IEmailProvider } from './email-provider.interface';
import AWS from 'aws-sdk';

export class AwsSesProvider implements IEmailProvider {
  private ses: AWS.SES;

  constructor(accessKeyId: string, secretAccessKey: string, region: string) {
    this.ses = new AWS.SES({
      accessKeyId,
      secretAccessKey,
      region,
    });
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
      const params: AWS.SES.SendEmailRequest = {
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: options?.html || body,
            },
            Text: {
              Charset: 'UTF-8',
              Data: body,
            },
          },
          Subject: {
            Charset: 'UTF-8',
            Data: subject,
          },
        },
        Source: options?.from || process.env.AWS_SES_FROM_EMAIL || 'noreply@insurance.com',
      };

      const result = await this.ses.sendEmail(params).promise();
      return { success: true, messageId: result.MessageId };
    } catch (error: any) {
      return { success: false, error: error.message || 'AWS SES send failed' };
    }
  }
}
