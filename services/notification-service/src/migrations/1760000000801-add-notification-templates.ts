import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTemplates1760000000801 implements MigrationInterface {
  name = 'AddNotificationTemplates1760000000801';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create email_templates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        type VARCHAR(50) NOT NULL,
        language VARCHAR(10) NOT NULL DEFAULT 'en',
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        html TEXT,
        variables JSONB,
        is_active BOOLEAN NOT NULL DEFAULT true,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create sms_templates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sms_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        type VARCHAR(50) NOT NULL,
        language VARCHAR(10) NOT NULL DEFAULT 'en',
        message TEXT NOT NULL,
        variables JSONB,
        is_active BOOLEAN NOT NULL DEFAULT true,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_type_lang ON email_templates(tenant_id, type, language);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_active ON email_templates(tenant_id, is_active);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant_type_lang ON sms_templates(tenant_id, type, language);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant_active ON sms_templates(tenant_id, is_active);`);

    // Default templates are now seeded per-tenant via the /templates/seed-defaults endpoint.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sms_templates;`);
    await queryRunner.query(`DROP TABLE IF EXISTS email_templates;`);
  }
}
