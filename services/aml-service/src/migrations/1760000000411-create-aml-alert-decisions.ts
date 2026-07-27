import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAmlAlertDecisions1760000000411 implements MigrationInterface {
  name = 'CreateAmlAlertDecisions1760000000411';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS aml_alert_decisions (
        decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_id UUID NOT NULL,
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        notes TEXT,
        snapshot JSONB,
        decided_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_aml_alert_decisions_alert_id FOREIGN KEY (alert_id) REFERENCES aml_alerts(alert_id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_alert_decisions_alert_created_at ON aml_alert_decisions(alert_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_alert_decisions_decided_by_created_at ON aml_alert_decisions(decided_by, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS aml_alert_decisions;`);
  }
}
