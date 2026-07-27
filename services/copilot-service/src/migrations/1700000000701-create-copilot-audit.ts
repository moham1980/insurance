import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCopilotAudit1700000000701 implements MigrationInterface {
  name = 'CreateCopilotAudit1700000000701';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS copilot_audit (
        audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type TEXT NOT NULL,
        resource_id UUID NOT NULL,
        correlation_id TEXT,
        tenant_id TEXT,
        actor_user_id TEXT,
        ai_enabled_header TEXT,
        policy_allowed BOOLEAN NOT NULL DEFAULT FALSE,
        decision TEXT NOT NULL,
        blocked_reason TEXT,
        output_preview TEXT,
        output_redacted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_copilot_audit_resource_type CHECK (resource_type IN ('claim','document')),
        CONSTRAINT chk_copilot_audit_decision CHECK (decision IN ('allowed','blocked'))
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_copilot_audit_resource_created_at ON copilot_audit(resource_type, resource_id, created_at);`
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_copilot_audit_decision_created_at ON copilot_audit(decision, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS copilot_audit;`);
  }
}
