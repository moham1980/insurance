import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductTables1760000000610 implements MigrationInterface {
  name = 'CreateProductTables1760000000610';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id uuid PRIMARY KEY,
        code varchar(64) NOT NULL,
        name_fa varchar(256) NOT NULL,
        name_en varchar(256),
        line_of_business varchar(64) NOT NULL,
        status varchar(32) NOT NULL,
        metadata jsonb,
        created_by varchar(128),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code_unique ON products(code);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_lob ON products(line_of_business);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coverages (
        coverage_id uuid PRIMARY KEY,
        product_id uuid NOT NULL,
        code varchar(64) NOT NULL,
        name_fa varchar(256) NOT NULL,
        status varchar(32) NOT NULL,
        terms jsonb,
        created_by varchar(128),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_coverages_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coverages_product_id ON coverages(product_id);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_coverages_product_code_unique ON coverages(product_id, code);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coverages_status ON coverages(status);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deductibles (
        deductible_id uuid PRIMARY KEY,
        product_id uuid NOT NULL,
        code varchar(64) NOT NULL,
        name_fa varchar(256) NOT NULL,
        kind varchar(32) NOT NULL,
        value numeric(18,6) NOT NULL,
        status varchar(32) NOT NULL,
        created_by varchar(128),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_deductibles_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_deductibles_product_id ON deductibles(product_id);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_deductibles_product_code_unique ON deductibles(product_id, code);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_deductibles_status ON deductibles(status);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pricing_rules (
        pricing_rule_id uuid PRIMARY KEY,
        product_id uuid NOT NULL,
        code varchar(64) NOT NULL,
        name_fa varchar(256) NOT NULL,
        status varchar(32) NOT NULL,
        rule jsonb NOT NULL,
        created_by varchar(128),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_pricing_rules_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pricing_rules_product_id ON pricing_rules(product_id);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_rules_product_code_unique ON pricing_rules(product_id, code);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pricing_rules_status ON pricing_rules(status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pricing_rules;`);
    await queryRunner.query(`DROP TABLE IF EXISTS deductibles;`);
    await queryRunner.query(`DROP TABLE IF EXISTS coverages;`);
    await queryRunner.query(`DROP TABLE IF EXISTS products;`);
  }
}
