import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3AddPolicyOwnerFields1830000000000 implements MigrationInterface {
  name = 'P3AddPolicyOwnerFields1830000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE policies
        ADD COLUMN IF NOT EXISTS record_owner_organization_id UUID,
        ADD COLUMN IF NOT EXISTS authoritative_tenant_id TEXT,
        ADD COLUMN IF NOT EXISTS sales_channel_type TEXT DEFAULT 'DIRECT',
        ADD COLUMN IF NOT EXISTS source_system_id TEXT,
        ADD COLUMN IF NOT EXISTS external_policy_id TEXT,
        ADD COLUMN IF NOT EXISTS placement_id UUID,
        ADD COLUMN IF NOT EXISTS customer_party_id UUID,
        ADD COLUMN IF NOT EXISTS product_id UUID,
        ADD COLUMN IF NOT EXISTS product_version INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS sub_agent_party_id UUID,
        ADD COLUMN IF NOT EXISTS marketer_party_id UUID,
        ADD COLUMN IF NOT EXISTS premium_currency TEXT DEFAULT 'IRR',
        ADD COLUMN IF NOT EXISTS taxes_amount NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS taxes_currency TEXT DEFAULT 'IRR',
        ADD COLUMN IF NOT EXISTS total_payable_amount NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_payable_currency TEXT DEFAULT 'IRR',
        ADD COLUMN IF NOT EXISTS fees JSONB,
        ADD COLUMN IF NOT EXISTS policy_terms JSONB,
        ADD COLUMN IF NOT EXISTS commission_split_snapshot JSONB;

      CREATE INDEX IF NOT EXISTS idx_policies_placement_id ON policies(placement_id);
      CREATE INDEX IF NOT EXISTS idx_policies_customer_party_id ON policies(customer_party_id);
      CREATE INDEX IF NOT EXISTS idx_policies_product_id ON policies(product_id);
      CREATE INDEX IF NOT EXISTS idx_policies_authoritative_tenant_id ON policies(authoritative_tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_policies_authoritative_tenant_id;
      DROP INDEX IF EXISTS idx_policies_product_id;
      DROP INDEX IF EXISTS idx_policies_customer_party_id;
      DROP INDEX IF EXISTS idx_policies_placement_id;

      ALTER TABLE policies
        DROP COLUMN IF EXISTS commission_split_snapshot,
        DROP COLUMN IF EXISTS policy_terms,
        DROP COLUMN IF EXISTS fees,
        DROP COLUMN IF EXISTS total_payable_currency,
        DROP COLUMN IF EXISTS total_payable_amount,
        DROP COLUMN IF EXISTS taxes_currency,
        DROP COLUMN IF EXISTS taxes_amount,
        DROP COLUMN IF EXISTS premium_currency,
        DROP COLUMN IF EXISTS marketer_party_id,
        DROP COLUMN IF EXISTS sub_agent_party_id,
        DROP COLUMN IF EXISTS product_version,
        DROP COLUMN IF EXISTS product_id,
        DROP COLUMN IF EXISTS customer_party_id,
        DROP COLUMN IF EXISTS placement_id,
        DROP COLUMN IF EXISTS external_policy_id,
        DROP COLUMN IF EXISTS source_system_id,
        DROP COLUMN IF EXISTS sales_channel_type,
        DROP COLUMN IF EXISTS authoritative_tenant_id,
        DROP COLUMN IF EXISTS record_owner_organization_id;
    `);
  }
}
