import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarkupRule1800000000035 implements MigrationInterface {
  name = 'CreateMarkupRule1800000000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS markup_rules (
        markup_rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agreement_id UUID NOT NULL,
        name TEXT NOT NULL,
        line_of_business TEXT,
        premium_from_minor NUMERIC,
        premium_to_minor NUMERIC,
        markup_amount_minor NUMERIC,
        markup_rate_bp INT,
        currency TEXT NOT NULL,
        rules JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_markup_rules_agreement ON markup_rules(agreement_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS markup_rules;`);
  }
}
