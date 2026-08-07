import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P1 #10: Create audit_log and entity_version tables for feature flags.
 * These tables provide immutable audit trail and versioning for all flag changes.
 */
export class AddAuditLogAndEntityVersion1700000001002 implements MigrationInterface {
  name = 'AddAuditLogAndEntityVersion1700000001002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Audit log table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS feature_flag_audit_log (
        audit_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        before JSONB,
        after JSONB,
        correlation_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ff_audit_resource ON feature_flag_audit_log (resource_type, resource_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ff_audit_actor ON feature_flag_audit_log (actor)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ff_audit_created ON feature_flag_audit_log (created_at)`);

    // Entity version table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS feature_flag_entity_version (
        entity_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        snapshot JSONB NOT NULL,
        actor TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ff_version_resource ON feature_flag_entity_version (resource_type, resource_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ff_version_resource_version ON feature_flag_entity_version (resource_type, resource_id, version)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS feature_flag_entity_version`);
    await queryRunner.query(`DROP TABLE IF EXISTS feature_flag_audit_log`);
  }
}
