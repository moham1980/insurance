import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000700 implements MigrationInterface {
  name = 'Init1700000000700';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'retrying');
      CREATE TYPE notification_channel AS ENUM ('sms', 'email', 'push');
      CREATE TYPE notification_type AS ENUM (
        'claim_registered', 'claim_submitted', 'claim_approved', 'claim_paid',
        'policy_issued', 'payment_due', 'payment_received',
        'installment_due', 'installment_reminder', 'overdue_notice',
        'complaint_created', 'complaint_received', 'complaint_resolved',
        'password_reset', 'welcome', 'otp'
      );

      CREATE TABLE notification_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID,
        correlation_id UUID,
        channel notification_channel NOT NULL,
        type notification_type NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB,
        status notification_status DEFAULT 'pending',
        error_message TEXT,
        retry_count INT DEFAULT 0,
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_notification_logs_status_created ON notification_logs(status, created_at);
      CREATE INDEX idx_notification_logs_channel_recipient ON notification_logs(channel, recipient);
      CREATE INDEX idx_notification_logs_tenant ON notification_logs(tenant_id);
      CREATE INDEX idx_notification_logs_correlation ON notification_logs(correlation_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_logs_correlation;
      DROP INDEX IF EXISTS idx_notification_logs_tenant;
      DROP INDEX IF EXISTS idx_notification_logs_channel_recipient;
      DROP INDEX IF EXISTS idx_notification_logs_status_created;
      DROP TABLE IF EXISTS notification_logs;
      DROP TYPE IF EXISTS notification_type;
      DROP TYPE IF EXISTS notification_channel;
      DROP TYPE IF EXISTS notification_status;
    `);
  }
}
