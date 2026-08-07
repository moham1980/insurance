import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P1 #10: Create audit_log and entity_version tables for workflow definitions.
 */
export class AddAuditLogAndEntityVersion1700000000001 implements MigrationInterface {
  name = 'AddAuditLogAndEntityVersion1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        before JSONB,
        after JSONB,
        tenant_id TEXT,
        correlation_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_wf_audit_resource ON workflow_audit_log (resource_type, resource_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_wf_audit_actor ON workflow_audit_log (actor)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_wf_audit_created ON workflow_audit_log (created_at)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_entity_version (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        snapshot JSONB NOT NULL,
        actor TEXT NOT NULL,
        tenant_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_wf_version_resource ON workflow_entity_version (resource_type, resource_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_wf_version_resource_version ON workflow_entity_version (resource_type, resource_id, version)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_entity_version`);
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_audit_log`);
  }
}
