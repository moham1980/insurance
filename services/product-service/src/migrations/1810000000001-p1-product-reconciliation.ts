import { MigrationInterface, QueryRunner } from 'typeorm';

export class P1ProductReconciliation1810000000001 implements MigrationInterface {
  name = 'P1ProductReconciliation1810000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure current_version is consistent with latest active product version
    await queryRunner.query(`
      UPDATE products p
      SET current_version = COALESCE((
        SELECT MAX(version)
        FROM product_versions pv
        WHERE pv.product_id = p.product_id
          AND pv.status = 'active'
      ), p.version, 1)
      WHERE current_version IS NULL OR current_version = 0;
    `);

    // Set owner from tenant for pre-P1 products where owner is missing
    await queryRunner.query(`
      UPDATE products
      SET owner_tenant_id = tenant_id,
          owner_organization_id = COALESCE(owner_organization_id, tenant_id)
      WHERE owner_tenant_id IS NULL;
    `);

    // P1-8.1: Backfill ProductVisibility for existing distributors
    // Create visibility records based on existing SalesPartner relationships
    await queryRunner.query(`
      INSERT INTO product_visibilities (visibility_id, tenant_id, product_id, product_version, distributor_organization_id, visibility_type, distribution_agreement_id, agreement_version_at_creation, markup_rules, allowed_territories, allowed_sales_channels, status, effective_from, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        p.tenant_id,
        p.product_id,
        p.current_version,
        sp.organization_id,
        'marketplace',
        COALESCE(
          (SELECT agreement_id FROM distribution_agreements da
           WHERE da.tenant_id = p.tenant_id
             AND da.distributor_organization_id = sp.organization_id
             AND da.status = 'active'
           LIMIT 1),
          '00000000-0000-0000-0000-000000000000'
        ),
        1,
        NULL,
        ARRAY[]::text[],
        ARRAY[]::text[],
        'active',
        COALESCE(p.effective_from, now()),
        now(),
        now()
      FROM products p
      CROSS JOIN sales_partners sp
      WHERE sp.tenant_id = p.tenant_id
        AND sp.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM product_visibilities pv
          WHERE pv.product_id = p.product_id
            AND pv.distributor_organization_id = sp.organization_id
            AND pv.status = 'active'
        )
      ON CONFLICT DO NOTHING;
    `);

    // P1-8.2: Create migration_quarantine table for ambiguous records
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS migration_quarantine (
        quarantine_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        source_table TEXT NOT NULL,
        source_record_id TEXT,
        reason TEXT NOT NULL,
        details JSONB,
        resolved BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // P1-8.2: Quarantine products without valid owner
    await queryRunner.query(`
      INSERT INTO migration_quarantine (tenant_id, source_table, source_record_id, reason, details)
      SELECT product_id, 'products', product_id::text, 'missing_owner_organization',
        jsonb_build_object('tenant_id', tenant_id, 'code', code, 'status', status)
      FROM products
      WHERE owner_organization_id IS NULL;
    `);

    // P1-8.2: Quarantine product versions without valid product
    await queryRunner.query(`
      INSERT INTO migration_quarantine (tenant_id, source_table, source_record_id, reason, details)
      SELECT pv.tenant_id, 'product_versions', pv.product_version_id::text, 'orphaned_product_version',
        jsonb_build_object('product_id', pv.product_id, 'version', pv.version)
      FROM product_versions pv
      LEFT JOIN products p ON p.product_id = pv.product_id
      WHERE p.product_id IS NULL;
    `);

    // P1-8.1: Create initial ProductVersion (v1, active) for products without any version
    await queryRunner.query(`
      INSERT INTO product_versions (product_version_id, tenant_id, product_id, code, name_fa, name_en, line_of_business, status, version, effective_from, created_at)
      SELECT
        gen_random_uuid(),
        p.tenant_id,
        p.product_id,
        p.code,
        p.name_fa,
        p.name_en,
        p.line_of_business,
        'active',
        1,
        COALESCE(p.effective_from, p.created_at, now()),
        now()
      FROM products p
      WHERE NOT EXISTS (
        SELECT 1 FROM product_versions pv
        WHERE pv.product_id = p.product_id
          AND pv.tenant_id = p.tenant_id
      )
      ON CONFLICT DO NOTHING;
    `);

    // P1-8.1: Migrate existing coverages to coverage_definitions linked to ProductVersion v1
    await queryRunner.query(`
      INSERT INTO coverage_definitions (coverage_definition_id, tenant_id, product_version_id, code, name_fa, name_en, description, type, deductible_options, default_selected, status, created_by, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        c.tenant_id,
        pv.product_version_id,
        c.code,
        c.name_fa,
        NULL,
        COALESCE(c.terms::text, NULL),
        'mandatory',
        NULL,
        false,
        c.status,
        c.created_by,
        c.created_at,
        c.updated_at
      FROM coverages c
      JOIN product_versions pv ON pv.product_id = c.product_id AND pv.tenant_id = c.tenant_id AND pv.version = 1
      WHERE NOT EXISTS (
        SELECT 1 FROM coverage_definitions cd
        WHERE cd.product_version_id = pv.product_version_id
          AND cd.code = c.code
          AND cd.tenant_id = c.tenant_id
      )
      ON CONFLICT DO NOTHING;
    `);

    // P1-8.1: Migrate existing pricing_rules to rate_table_versions linked to ProductVersion v1
    await queryRunner.query(`
      INSERT INTO rate_table_versions (rate_table_version_id, tenant_id, product_version_id, version, algorithm_type, parameters_schema, status, created_by, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        pr.tenant_id,
        pv.product_version_id,
        1,
        'table',
        pr.rule,
        pr.status,
        pr.created_by,
        pr.created_at,
        pr.updated_at
      FROM pricing_rules pr
      JOIN product_versions pv ON pv.product_id = pr.product_id AND pv.tenant_id = pr.tenant_id AND pv.version = 1
      WHERE NOT EXISTS (
        SELECT 1 FROM rate_table_versions rtv
        WHERE rtv.product_version_id = pv.product_version_id
          AND rtv.tenant_id = pr.tenant_id
      )
      ON CONFLICT DO NOTHING;
    `);

    // Ensure every active product has at least a draft version record for P1 traceability
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_status_lob
      ON products(status, line_of_business);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_status_lob;`);
    await queryRunner.query(`DROP TABLE IF EXISTS migration_quarantine;`);
  }
}
