import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditRecords1760000000408 implements MigrationInterface {
  name = 'CreateAuditRecords1760000000408';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_records (
        audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        actor_user_id TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        correlation_id TEXT,
        before JSONB,
        after JSONB,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_tenant_action_created ON audit_records(tenant_id, action, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON audit_records(actor_user_id, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_records;`);
  }
}
