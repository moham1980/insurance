import { MigrationInterface, QueryRunner } from 'typeorm';

export class BrokerageKycEnhancements1700000000050 implements MigrationInterface {
  name = 'BrokerageKycEnhancements1700000000050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Issue 1.2: Add organization_id to parties
    await queryRunner.query(`ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "organization_id" uuid`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_parties_tenant_organization" ON "parties" ("tenant_id", "organization_id")`);

    // Issue 2.1: Add broker-specific KYC columns to kyc_reviews
    await queryRunner.query(`ALTER TABLE "kyc_reviews" ADD COLUMN IF NOT EXISTS "kyc_type" text NOT NULL DEFAULT 'standard'`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" ADD COLUMN IF NOT EXISTS "license_check_status" text NOT NULL DEFAULT 'not_started'`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" ADD COLUMN IF NOT EXISTS "license_verified_at" timestamptz`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" ADD COLUMN IF NOT EXISTS "license_id" uuid`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" ADD COLUMN IF NOT EXISTS "background_check_status" text NOT NULL DEFAULT 'not_started'`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" ADD COLUMN IF NOT EXISTS "background_checked_at" timestamptz`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" ADD COLUMN IF NOT EXISTS "financial_check_status" text NOT NULL DEFAULT 'not_started'`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" ADD COLUMN IF NOT EXISTS "financial_checked_at" timestamptz`);

    // Issue 5.3: Add organization columns to kyc_exception
    await queryRunner.query(`ALTER TABLE "kyc_exception" ADD COLUMN IF NOT EXISTS "organization_id" uuid`);
    await queryRunner.query(`ALTER TABLE "kyc_exception" ADD COLUMN IF NOT EXISTS "escalated_to_organization_id" uuid`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_kyc_exception_tenant_org" ON "kyc_exception" ("tenant_id", "organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_kyc_exception_tenant_status_org" ON "kyc_exception" ("tenant_id", "status", "organization_id")`);

    // Issue 3.1: Add cross-organization consent columns to consent_records
    await queryRunner.query(`ALTER TABLE "consent_records" ADD COLUMN IF NOT EXISTS "target_organization_id" uuid`);
    await queryRunner.query(`ALTER TABLE "consent_records" ADD COLUMN IF NOT EXISTS "source_organization_id" uuid`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_consent_records_tenant_party_targetorg_status" ON "consent_records" ("tenant_id", "party_id", "target_organization_id", "status")`);

    // Issue 2.2+2.3: Create transaction_aml_screenings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transaction_aml_screenings" (
        "screening_id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        "tenant_id" text NOT NULL,
        "party_id" uuid NOT NULL,
        "transaction_type" text NOT NULL,
        "transaction_id" text,
        "batch_id" text,
        "amount" numeric(18, 2) NOT NULL,
        "currency" text NOT NULL DEFAULT 'IRR',
        "status" text NOT NULL DEFAULT 'not_started',
        "screening_results" jsonb,
        "risk_level" text,
        "risk_factors" jsonb,
        "screened_at" timestamptz,
        "reviewed_by" text,
        "review_notes" text,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transaction_aml_tenant_type_created" ON "transaction_aml_screenings" ("tenant_id", "transaction_type", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transaction_aml_tenant_party_created" ON "transaction_aml_screenings" ("tenant_id", "party_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transaction_aml_tenant_status" ON "transaction_aml_screenings" ("tenant_id", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transaction_aml_tenant_batch" ON "transaction_aml_screenings" ("tenant_id", "batch_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_aml_tenant_batch"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_aml_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_aml_tenant_party_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transaction_aml_tenant_type_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transaction_aml_screenings"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_consent_records_tenant_party_targetorg_status"`);
    await queryRunner.query(`ALTER TABLE "consent_records" DROP COLUMN IF EXISTS "source_organization_id"`);
    await queryRunner.query(`ALTER TABLE "consent_records" DROP COLUMN IF EXISTS "target_organization_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kyc_exception_tenant_status_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_kyc_exception_tenant_org"`);
    await queryRunner.query(`ALTER TABLE "kyc_exception" DROP COLUMN IF EXISTS "escalated_to_organization_id"`);
    await queryRunner.query(`ALTER TABLE "kyc_exception" DROP COLUMN IF EXISTS "organization_id"`);

    await queryRunner.query(`ALTER TABLE "kyc_reviews" DROP COLUMN IF EXISTS "financial_checked_at"`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" DROP COLUMN IF EXISTS "financial_check_status"`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" DROP COLUMN IF EXISTS "background_checked_at"`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" DROP COLUMN IF EXISTS "background_check_status"`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" DROP COLUMN IF EXISTS "license_id"`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" DROP COLUMN IF EXISTS "license_verified_at"`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" DROP COLUMN IF EXISTS "license_check_status"`);
    await queryRunner.query(`ALTER TABLE "kyc_reviews" DROP COLUMN IF EXISTS "kyc_type"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_parties_tenant_organization"`);
    await queryRunner.query(`ALTER TABLE "parties" DROP COLUMN IF EXISTS "organization_id"`);
  }
}
