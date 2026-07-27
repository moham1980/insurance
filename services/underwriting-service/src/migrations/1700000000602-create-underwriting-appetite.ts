import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUnderwritingAppetite1700000000602 implements MigrationInterface {
  name = 'CreateUnderwritingAppetite1700000000602';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS underwriting_appetite (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        line_of_business TEXT NOT NULL,
        product_id TEXT,
        risk_level TEXT NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
        decision TEXT NOT NULL CHECK (decision IN ('auto_accept','auto_reject','refer')),
        min_sum_insured NUMERIC,
        max_sum_insured NUMERIC,
        min_premium NUMERIC,
        max_premium NUMERIC,
        authority_level TEXT,
        approver_role TEXT,
        priority INT NOT NULL DEFAULT 0,
        sla_hours INT NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_underwriting_appetite_tenant_lob_product ON underwriting_appetite(tenant_id, line_of_business, product_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_underwriting_appetite_tenant_priority ON underwriting_appetite(tenant_id, priority DESC, created_at DESC);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS underwriting_appetite;`);
  }
}
