import { MigrationInterface, QueryRunner } from 'typeorm';

export class P1DistributionProduct1810000000000 implements MigrationInterface {
  name = 'P1DistributionProduct1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Product owner/effective fields
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS owner_tenant_id UUID,
      ADD COLUMN IF NOT EXISTS owner_organization_id UUID,
      ADD COLUMN IF NOT EXISTS current_version INT NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS effective_to TIMESTAMPTZ;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_owner_org ON products(owner_organization_id);`);

    // ProductVersion P1 fields
    await queryRunner.query(`
      ALTER TABLE product_versions
      ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS effective_to TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS form_schema JSONB,
      ADD COLUMN IF NOT EXISTS required_documents JSONB,
      ADD COLUMN IF NOT EXISTS approved_by VARCHAR(128),
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
    `);

    // Coverage definitions per product version
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coverage_definitions (
        coverage_definition_id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        product_version_id UUID NOT NULL,
        code VARCHAR(64) NOT NULL,
        name_fa VARCHAR(256) NOT NULL,
        name_en VARCHAR(256),
        description TEXT,
        type VARCHAR(32) NOT NULL,
        min_limit_amount_minor NUMERIC(24,0),
        min_limit_currency VARCHAR(8),
        max_limit_amount_minor NUMERIC(24,0),
        max_limit_currency VARCHAR(8),
        deductible_options JSONB,
        default_selected BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(32) NOT NULL,
        created_by VARCHAR(128),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coverage_definitions_tenant ON coverage_definitions(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coverage_definitions_pv ON coverage_definitions(product_version_id);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_coverage_definitions_unique ON coverage_definitions(tenant_id, product_version_id, code);`);

    // Rate table versions per product version
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rate_table_versions (
        rate_table_version_id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        product_version_id UUID NOT NULL,
        version INT NOT NULL,
        algorithm_type VARCHAR(32) NOT NULL,
        parameters_schema JSONB,
        status VARCHAR(32) NOT NULL,
        created_by VARCHAR(128),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rate_table_versions_tenant ON rate_table_versions(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rate_table_versions_pv ON rate_table_versions(product_version_id);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_table_versions_unique ON rate_table_versions(tenant_id, product_version_id, version);`);

    // Product visibility
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_visibilities (
        visibility_id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        product_id UUID NOT NULL,
        product_version INT NOT NULL,
        distributor_organization_id UUID,
        visibility_type VARCHAR(32) NOT NULL,
        distribution_agreement_id UUID NOT NULL,
        agreement_version_at_creation INT NOT NULL,
        markup_rules JSONB,
        allowed_territories TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        allowed_sales_channels TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        status VARCHAR(32) NOT NULL,
        effective_from TIMESTAMPTZ NOT NULL,
        effective_to TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_visibilities_tenant ON product_visibilities(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_visibilities_product ON product_visibilities(product_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_visibilities_distributor ON product_visibilities(distributor_organization_id);`);

    // Broker product offering
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS broker_product_offerings (
        offering_id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        broker_tenant_id UUID NOT NULL,
        broker_organization_id UUID NOT NULL,
        name VARCHAR(256) NOT NULL,
        description TEXT,
        included_product_ids UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
        markup_rules JSONB,
        allowed_sales_channels TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        effective_from TIMESTAMPTZ NOT NULL,
        effective_to TIMESTAMPTZ,
        status VARCHAR(32) NOT NULL,
        agreement_version_snapshot INT NOT NULL,
        distribution_agreement_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bpo_tenant ON broker_product_offerings(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bpo_broker_org ON broker_product_offerings(broker_organization_id);`);

    // Bundle rules
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bundle_rules (
        rule_id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        offering_id UUID NOT NULL,
        product_ids UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
        discount_bps INT,
        reason_code VARCHAR(128) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bundle_rules_offering ON bundle_rules(offering_id);`);

    // Recommendation rules
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recommendation_rules (
        rule_id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        offering_id UUID NOT NULL,
        priority INT NOT NULL,
        criteria JSONB NOT NULL,
        rank_weight JSONB NOT NULL,
        reason_code VARCHAR(128) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_recommendation_rules_offering ON recommendation_rules(offering_id);`);

    // Backfill current_version and owner from existing products
    await queryRunner.query(`UPDATE products SET current_version = version WHERE current_version IS NULL OR current_version = 0;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS recommendation_rules;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bundle_rules;`);
    await queryRunner.query(`DROP TABLE IF EXISTS broker_product_offerings;`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_visibilities;`);
    await queryRunner.query(`DROP TABLE IF EXISTS rate_table_versions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS coverage_definitions;`);

    await queryRunner.query(`
      ALTER TABLE product_versions
      DROP COLUMN IF EXISTS effective_from,
      DROP COLUMN IF EXISTS effective_to,
      DROP COLUMN IF EXISTS form_schema,
      DROP COLUMN IF EXISTS required_documents,
      DROP COLUMN IF EXISTS approved_by,
      DROP COLUMN IF EXISTS approved_at;
    `);

    await queryRunner.query(`
      ALTER TABLE products
      DROP COLUMN IF EXISTS owner_tenant_id,
      DROP COLUMN IF EXISTS owner_organization_id,
      DROP COLUMN IF EXISTS current_version,
      DROP COLUMN IF EXISTS effective_from,
      DROP COLUMN IF EXISTS effective_to;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_owner_org;`);
  }
}
