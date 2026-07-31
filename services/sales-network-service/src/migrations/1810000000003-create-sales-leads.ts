import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalesLeadsTable1810000000003 implements MigrationInterface {
  name = 'CreateSalesLeadsTable1810000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sales_leads (
        lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        agent_id UUID,
        partner_id UUID NOT NULL,
        organization_id UUID,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        product_interest TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        priority TEXT NOT NULL DEFAULT 'medium',
        notes TEXT,
        assigned_to UUID,
        converted_submission_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sales_leads_tenant ON sales_leads(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sales_leads_agent ON sales_leads(agent_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sales_leads_partner ON sales_leads(partner_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sales_leads_status ON sales_leads(status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sales_leads;`);
  }
}
