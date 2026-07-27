import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantToPolicy1760000000405 implements MigrationInterface {
  name = 'AddTenantToPolicy1760000000405';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tenant column on all policy-related tables
    await queryRunner.query(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS tenant_id TEXT;`);
    await queryRunner.query(`ALTER TABLE policy_changes ADD COLUMN IF NOT EXISTS tenant_id TEXT;`);
    await queryRunner.query(`ALTER TABLE policy_changes ADD COLUMN IF NOT EXISTS correlation_id TEXT;`);
    await queryRunner.query(`ALTER TABLE policy_changes ADD COLUMN IF NOT EXISTS reason TEXT;`);
    await queryRunner.query(`ALTER TABLE policy_changes ADD COLUMN IF NOT EXISTS "before" JSONB;`);
    await queryRunner.query(`ALTER TABLE policy_changes ADD COLUMN IF NOT EXISTS "after" JSONB;`);
    await queryRunner.query(`ALTER TABLE policy_inquiries ADD COLUMN IF NOT EXISTS tenant_id TEXT;`);
    await queryRunner.query(`ALTER TABLE policy_inquiries ADD COLUMN IF NOT EXISTS query_hash TEXT;`);
    await queryRunner.query(`ALTER TABLE policy_inquiries ADD COLUMN IF NOT EXISTS provider_correlation_id TEXT;`);
    await queryRunner.query(`ALTER TABLE policy_inquiries ADD COLUMN IF NOT EXISTS provider_signature TEXT;`);
    await queryRunner.query(`ALTER TABLE policy_inquiries ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE policy_renewals ADD COLUMN IF NOT EXISTS tenant_id TEXT;`);

    // Versioning for optimistic concurrency on policies
    await queryRunner.query(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 0;`);

    // Tenant-scoped unique indexes
    await queryRunner.query(`DROP INDEX IF EXISTS uq_policies_policy_number;`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_policies_unique_code;`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_policies_tenant_policy_number ON policies(tenant_id, policy_number);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_policies_tenant_unique_code ON policies(tenant_id, unique_code) WHERE unique_code IS NOT NULL;`);

    // Tenant indexes for query performance
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policies_tenant_id ON policies(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_changes_tenant_id ON policy_changes(tenant_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_inquiries_tenant_id ON policy_inquiries(tenant_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_renewals_tenant_id ON policy_renewals(tenant_id, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_policies_tenant_policy_number;`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_policies_tenant_unique_code;`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_policies_policy_number ON policies(policy_number);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_policies_unique_code ON policies(unique_code) WHERE unique_code IS NOT NULL;`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_policies_tenant_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_policy_changes_tenant_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_policy_inquiries_tenant_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_policy_renewals_tenant_id;`);

    await queryRunner.query(`ALTER TABLE policies DROP COLUMN IF EXISTS tenant_id;`);
    await queryRunner.query(`ALTER TABLE policies DROP COLUMN IF EXISTS version;`);
    await queryRunner.query(`ALTER TABLE policy_changes DROP COLUMN IF EXISTS tenant_id;`);
    await queryRunner.query(`ALTER TABLE policy_changes DROP COLUMN IF EXISTS correlation_id;`);
    await queryRunner.query(`ALTER TABLE policy_changes DROP COLUMN IF EXISTS reason;`);
    await queryRunner.query(`ALTER TABLE policy_changes DROP COLUMN IF EXISTS "before";`);
    await queryRunner.query(`ALTER TABLE policy_changes DROP COLUMN IF EXISTS "after";`);
    await queryRunner.query(`ALTER TABLE policy_inquiries DROP COLUMN IF EXISTS tenant_id;`);
    await queryRunner.query(`ALTER TABLE policy_inquiries DROP COLUMN IF EXISTS query_hash;`);
    await queryRunner.query(`ALTER TABLE policy_inquiries DROP COLUMN IF EXISTS provider_correlation_id;`);
    await queryRunner.query(`ALTER TABLE policy_inquiries DROP COLUMN IF EXISTS provider_signature;`);
    await queryRunner.query(`ALTER TABLE policy_inquiries DROP COLUMN IF EXISTS expires_at;`);
    await queryRunner.query(`ALTER TABLE policy_renewals DROP COLUMN IF EXISTS tenant_id;`);
  }
}
