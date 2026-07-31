import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransitionAudits1760000000409 implements MigrationInterface {
  name = 'CreateTransitionAudits1760000000409';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transition_audits (
        transition_audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        actor_user_id TEXT,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        from_state TEXT NOT NULL,
        to_state TEXT NOT NULL,
        correlation_id TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_transition_audits_resource ON transition_audits(tenant_id, resource_type, resource_id, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS transition_audits;`);
  }
}
