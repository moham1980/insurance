import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenants1800000000015 implements MigrationInterface {
  name = 'CreateTenants1800000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        deployment_mode TEXT NOT NULL DEFAULT 'single_org',
        data_isolation TEXT NOT NULL DEFAULT 'row',
        primary_region TEXT NOT NULL,
        brand_key TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_organization_id ON tenants(organization_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_brand_key
      ON tenants(brand_key) WHERE brand_key IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS brand_configs (
        brand_config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        brand_key TEXT NOT NULL,
        display_name_fa TEXT NOT NULL,
        display_name_en TEXT NOT NULL,
        primary_color TEXT NOT NULL DEFAULT '#0d47a1',
        logo_url TEXT,
        favicon_url TEXT,
        rtl BOOLEAN NOT NULL DEFAULT true,
        calendar_type TEXT NOT NULL DEFAULT 'jalali',
        default_currency TEXT NOT NULL DEFAULT 'IRR',
        supported_locales TEXT[] NOT NULL DEFAULT ARRAY['fa','en']::text[],
        support_phone TEXT,
        support_email TEXT,
        smtp_credential_ref TEXT,
        sms_credential_ref TEXT,
        domain_allow_list TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_configs_tenant_brand
      ON brand_configs(tenant_id, brand_key);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_brand_configs_brand_key ON brand_configs(brand_key);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS brand_configs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants;`);
  }
}
