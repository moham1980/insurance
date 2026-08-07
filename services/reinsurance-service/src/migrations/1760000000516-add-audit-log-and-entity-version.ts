import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P1 #10: Create audit_log and entity_version tables for reinsurance treaties.
 */
export class AddAuditLogAndEntityVersion1760000000516 implements MigrationInterface {
  name = 'AddAuditLogAndEntityVersion1760000000516';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS re_audit_log (
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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_audit_resource ON re_audit_log (resource_type, resource_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_audit_actor ON re_audit_log (actor)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_audit_created ON re_audit_log (created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS re_entity_version (
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
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_version_resource ON re_entity_version (resource_type, resource_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_version_resource_version ON re_entity_version (resource_type, resource_id, version)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS re_entity_version`);
    await queryRunner.query(`DROP TABLE IF EXISTS re_audit_log`);
  }
}
