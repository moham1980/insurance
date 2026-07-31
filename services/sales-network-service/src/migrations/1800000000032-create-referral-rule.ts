import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReferralRule1800000000032 implements MigrationInterface {
  name = 'CreateReferralRule1800000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS referral_rules (
        rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agreement_id UUID NOT NULL,
        rule_name TEXT NOT NULL,
        condition JSONB NOT NULL,
        action TEXT NOT NULL,
        priority INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_rules_agreement
      ON referral_rules(agreement_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS referral_rules;`);
  }
}
