import { MigrationInterface, QueryRunner } from 'typeorm';

export class SalesKpiHardeningAndAttribution1700000000601 implements MigrationInterface {
  name = 'SalesKpiHardeningAndAttribution1700000000601';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sales_kpi_daily ADD COLUMN IF NOT EXISTS policies_renewed_count int NOT NULL DEFAULT 0;`);
    await queryRunner.query(`ALTER TABLE sales_kpi_daily ADD COLUMN IF NOT EXISTS policies_cancelled_count int NOT NULL DEFAULT 0;`);
    await queryRunner.query(`ALTER TABLE sales_kpi_daily ADD COLUMN IF NOT EXISTS complaints_created_count int NOT NULL DEFAULT 0;`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS sales_policy_attributions (
      policy_id uuid PRIMARY KEY,
      org_unit_id uuid NOT NULL,
      policy_number text,
      issued_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sales_policy_attr_org_issued_at ON sales_policy_attributions(org_unit_id, issued_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sales_policy_attributions;`);
    await queryRunner.query(`ALTER TABLE sales_kpi_daily DROP COLUMN IF EXISTS complaints_created_count;`);
    await queryRunner.query(`ALTER TABLE sales_kpi_daily DROP COLUMN IF EXISTS policies_cancelled_count;`);
    await queryRunner.query(`ALTER TABLE sales_kpi_daily DROP COLUMN IF EXISTS policies_renewed_count;`);
  }
}
