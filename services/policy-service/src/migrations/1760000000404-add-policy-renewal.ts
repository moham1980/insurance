import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPolicyRenewal1760000000404 implements MigrationInterface {
  name = 'AddPolicyRenewal1760000000404';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add auto-renewal columns to policies table
    await queryRunner.query(`
      ALTER TABLE policies
      ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS renewal_count INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS max_renewals INT NOT NULL DEFAULT 10,
      ADD COLUMN IF NOT EXISTS renewal_parent_id UUID,
      ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS renewal_notified_at TIMESTAMPTZ;
    `);

    // Create policy_renewals table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS policy_renewals (
        renewal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        policy_id UUID NOT NULL,
        parent_policy_id UUID,
        new_policy_id UUID,
        type TEXT NOT NULL DEFAULT 'automatic',
        status TEXT NOT NULL DEFAULT 'pending',
        previous_start_date TIMESTAMPTZ,
        previous_end_date TIMESTAMPTZ,
        new_start_date TIMESTAMPTZ,
        new_end_date TIMESTAMPTZ,
        previous_premium NUMERIC,
        new_premium NUMERIC,
        premium_adjustment_reason TEXT,
        due_date TIMESTAMPTZ,
        reminder_sent_at TIMESTAMPTZ,
        reminder_count INT NOT NULL DEFAULT 0,
        approved_by TEXT,
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_renewals_policy_id ON policy_renewals(policy_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_renewals_status_due ON policy_renewals(status, due_date);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_renewals_type ON policy_renewals(type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policies_auto_renew ON policies(auto_renew, end_date);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS policy_renewals;`);
    
    await queryRunner.query(`
      ALTER TABLE policies
      DROP COLUMN IF EXISTS auto_renew,
      DROP COLUMN IF EXISTS renewal_count,
      DROP COLUMN IF EXISTS max_renewals,
      DROP COLUMN IF EXISTS renewal_parent_id,
      DROP COLUMN IF EXISTS renewal_reminder_sent_at,
      DROP COLUMN IF EXISTS renewal_notified_at;
    `);
  }
}
