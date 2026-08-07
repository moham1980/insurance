import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P1 #10: Create audit_log and entity_version tables for notification templates.
 */
export class AddAuditLogAndEntityVersion1760000000804 implements MigrationInterface {
  name = 'AddAuditLogAndEntityVersion1760000000804';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_audit_log (
        audit_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        before JSONB,
        after JSONB,
        tenant_id UUID,
        correlation_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notif_audit_resource ON notification_audit_log (resource_type, resource_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notif_audit_actor ON notification_audit_log (actor)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notif_audit_created ON notification_audit_log (created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_entity_version (
        entity_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        snapshot JSONB NOT NULL,
        actor TEXT NOT NULL,
        tenant_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notif_version_resource ON notification_entity_version (resource_type, resource_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notif_version_resource_version ON notification_entity_version (resource_type, resource_id, version)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notification_entity_version`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_audit_log`);
  }
}
