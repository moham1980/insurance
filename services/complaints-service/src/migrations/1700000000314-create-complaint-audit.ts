import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateComplaintAudit1700000000314 implements MigrationInterface {
  name = 'CreateComplaintAudit1700000000314';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS complaint_audit (
        audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        complaint_id UUID NOT NULL,
        event_type TEXT NOT NULL,
        correlation_id TEXT,
        tenant_id TEXT,
        actor_user_id TEXT,
        from_status TEXT,
        to_status TEXT,
        reason TEXT,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_complaint_audit_complaint_created_at ON complaint_audit(complaint_id, created_at);`
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaint_audit_event_created_at ON complaint_audit(event_type, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS complaint_audit;`);
  }
}
