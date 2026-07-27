import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateComplaintSlaBreaches1700000000316 implements MigrationInterface {
  name = 'CreateComplaintSlaBreaches1700000000316';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS complaint_sla_breaches (
        breach_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        complaint_id UUID NOT NULL,
        breach_type TEXT NOT NULL,
        sla_due_at TIMESTAMPTZ NOT NULL,
        breached_at TIMESTAMPTZ NOT NULL,
        sla_hours INT,
        elapsed_hours INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_complaint_sla_breaches_complaint_type UNIQUE (complaint_id, breach_type)
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaint_sla_breaches_breached_at ON complaint_sla_breaches(breached_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS complaint_sla_breaches;`);
  }
}
