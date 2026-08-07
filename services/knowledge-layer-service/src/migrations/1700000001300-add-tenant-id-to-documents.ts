import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `tenant_id` column to the `documents` table for multi-tenant isolation.
 *
 * Background: the `Document` entity previously had no tenant scoping, which meant
 * all documents were shared across tenants (P0 data-isolation defect, see analysis
 * section 7.1). This migration:
 *   1. Adds a nullable `tenant_id` column (nullable so existing rows backfill cleanly).
 *   2. Drops the old single-column unique constraint on `external_id`.
 *   3. Creates a composite unique index on `(tenant_id, external_id)` so that upsert
 *      deduplication is scoped per tenant.
 *   4. Adds an index on `tenant_id` for filtered list/search/stats queries.
 *
 * Note: existing rows get `tenant_id = NULL`. Operators should backfill the column
 * for historical data; new writes always set it from the authenticated request.
 */
export class AddTenantIdToDocuments1700000001300 implements MigrationInterface {
  name = 'AddTenantIdToDocuments1700000001300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN IF NOT EXISTS "tenantId" uuid;
    `);

    // Drop the old single-column unique constraint on externalId if present.
    // (TypeORM auto-generates the constraint as UQ_<table>_<column>.)
    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP CONSTRAINT IF EXISTS "UQ_documents_externalId";
    `);
    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP CONSTRAINT IF EXISTS "documents_externalId_key";
    `);

    // Composite uniqueness: a given externalId is unique within a tenant.
    // NULL tenantId values are allowed to coexist (system-scoped documents).
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_documents_tenant_external"
        ON "documents" ("tenantId", "externalId");
    `);

    // Index for tenant-filtered list/search/stats queries.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_documents_tenant_id"
        ON "documents" ("tenantId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_tenant_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_tenant_external";`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN IF EXISTS "tenantId";`);
    // Restore the original single-column unique constraint.
    await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "UQ_documents_externalId" UNIQUE ("externalId");`);
  }
}
