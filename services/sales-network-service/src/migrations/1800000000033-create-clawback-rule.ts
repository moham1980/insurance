import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClawbackRule1800000000033 implements MigrationInterface {
  name = 'CreateClawbackRule1800000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS clawback_rules (
        rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agreement_id UUID NOT NULL,
        trigger_event TEXT NOT NULL,
        window_days INT NOT NULL DEFAULT 0,
        rate_bps INT,
        fixed_amount_minor NUMERIC,
        currency TEXT NOT NULL DEFAULT 'IRR',
        rules JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clawback_rules_agreement
      ON clawback_rules(agreement_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS clawback_rules;`);
  }
}
