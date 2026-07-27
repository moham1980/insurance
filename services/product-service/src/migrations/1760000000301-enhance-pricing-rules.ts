import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhancePricingRules1760000000301 implements MigrationInterface {
  name = 'EnhancePricingRules1760000000301';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pricing_rules
      ADD COLUMN IF NOT EXISTS rule_type VARCHAR(32) NOT NULL DEFAULT 'base',
      ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS conditions JSONB,
      ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS regions JSONB;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pricing_rules_type_status ON pricing_rules(rule_type, status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pricing_rules_valid_dates ON pricing_rules(valid_from, valid_to);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pricing_rules_type_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pricing_rules_valid_dates;`);
    
    await queryRunner.query(`
      ALTER TABLE pricing_rules
      DROP COLUMN IF EXISTS rule_type,
      DROP COLUMN IF EXISTS priority,
      DROP COLUMN IF EXISTS conditions,
      DROP COLUMN IF EXISTS valid_from,
      DROP COLUMN IF EXISTS valid_to,
      DROP COLUMN IF EXISTS regions;
    `);
  }
}
