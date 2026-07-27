import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantAndProductVersions1760000000620 implements MigrationInterface {
  name = 'AddTenantAndProductVersions1760000000620';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tenant_id to existing tables
    for (const table of ['products', 'coverages', 'deductibles', 'pricing_rules']) {
      await queryRunner.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id UUID;`);
      // backfill with a placeholder tenant for existing rows before NOT NULL enforcement
      await queryRunner.query(`UPDATE ${table} SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;`);
      await queryRunner.query(`ALTER TABLE ${table} ALTER COLUMN tenant_id SET NOT NULL;`);
    }

    // Update unique indexes to be tenant-scoped
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_code_unique;`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_code_unique ON products(tenant_id, code);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_coverages_product_code_unique;`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_coverages_tenant_product_code_unique ON coverages(tenant_id, product_id, code);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coverages_tenant_id ON coverages(tenant_id);`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_deductibles_product_code_unique;`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_deductibles_tenant_product_code_unique ON deductibles(tenant_id, product_id, code);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_deductibles_tenant_id ON deductibles(tenant_id);`);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_pricing_rules_product_code_unique;`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_rules_tenant_product_code_unique ON pricing_rules(tenant_id, product_id, code);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant_id ON pricing_rules(tenant_id);`);

    // Add product_versions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_versions (
        product_version_id uuid PRIMARY KEY,
        tenant_id uuid NOT NULL,
        product_id uuid NOT NULL,
        code varchar(64) NOT NULL,
        name_fa varchar(256) NOT NULL,
        name_en varchar(256),
        line_of_business varchar(64) NOT NULL,
        status varchar(32) NOT NULL,
        version int NOT NULL,
        change_reason text,
        changed_by varchar(128),
        snapshot jsonb,
        effective_date timestamptz,
        published_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_product_versions_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_versions_tenant_id ON product_versions(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_versions_product_id ON product_versions(product_id);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_product_versions_tenant_product_version_unique ON product_versions(tenant_id, product_id, version);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_versions;`);

    for (const table of ['products', 'coverages', 'deductibles', 'pricing_rules']) {
      await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS tenant_id;`);
    }

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code_unique ON products(code);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_coverages_product_code_unique ON coverages(product_id, code);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_deductibles_product_code_unique ON deductibles(product_id, code);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_rules_product_code_unique ON pricing_rules(product_id, code);`);
  }
}
