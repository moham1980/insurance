export interface IEmailProvider {
  sendEmail(
    to: string,
    subject: string,
    body: string,
    options?: {
      from?: string;
      html?: string;
      attachments?: Array<{ filename: string; content: string; contentType: string }>;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
