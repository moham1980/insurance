import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationServiceFixes1760000000802 implements MigrationInterface {
  name = 'NotificationServiceFixes1760000000802';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'delivered' value to notification_status enum if it does not exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'notification_status'
            AND e.enumlabel = 'delivered'
        ) THEN
          ALTER TYPE notification_status ADD VALUE 'delivered';
        END IF;
      END $$;
    `);

    // Add any missing notification_type enum values
    const notificationTypeValues = [
      'claim_submitted', 'installment_due', 'installment_reminder', 'overdue_notice',
      'complaint_received', 'password_reset', 'welcome'
    ];

    for (const value of notificationTypeValues) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'notification_type'
              AND e.enumlabel = '${value}'
          ) THEN
            ALTER TYPE notification_type ADD VALUE '${value}';
          END IF;
        END $$;
      `);
    }

    // Add delivered_at column if it does not exist
    await queryRunner.query(`
      ALTER TABLE notification_logs
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
    `);

    // Add tenant_id column to email_templates if it does not exist
    await queryRunner.query(`
      ALTER TABLE email_templates
      ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    `);

    // Add html column to email_templates if it does not exist
    await queryRunner.query(`
      ALTER TABLE email_templates
      ADD COLUMN IF NOT EXISTS html TEXT;
    `);

    // Add tenant_id column to sms_templates if it does not exist
    await queryRunner.query(`
      ALTER TABLE sms_templates
      ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    `);

    // Re-create tenant-scoped indexes for templates
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_type_lang ON email_templates(tenant_id, type, language);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_active ON email_templates(tenant_id, is_active);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant_type_lang ON sms_templates(tenant_id, type, language);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant_active ON sms_templates(tenant_id, is_active);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sms_templates_tenant_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sms_templates_tenant_type_lang;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_templates_tenant_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_templates_tenant_type_lang;`);

    await queryRunner.query(`ALTER TABLE sms_templates DROP COLUMN IF EXISTS tenant_id;`);
    await queryRunner.query(`ALTER TABLE email_templates DROP COLUMN IF EXISTS html;`);
    await queryRunner.query(`ALTER TABLE email_templates DROP COLUMN IF EXISTS tenant_id;`);

    // Removing an enum value and dropping delivered_at are destructive;
    // they are preserved in down for safety.
    await queryRunner.query(`ALTER TABLE notification_logs DROP COLUMN IF EXISTS delivered_at;`);
  }
}
