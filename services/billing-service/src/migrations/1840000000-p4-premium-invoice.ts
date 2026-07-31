import { MigrationInterface, QueryRunner } from 'typeorm';

export class P4PremiumInvoice1840000000 implements MigrationInterface {
  name = 'P4PremiumInvoice1840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS premium_invoices (
        invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        policy_id UUID NOT NULL,
        endorsement_id UUID,
        customer_party_id UUID NOT NULL,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        issue_date TIMESTAMPTZ NOT NULL,
        due_date TIMESTAMPTZ NOT NULL,
        total_premium_amount_minor NUMERIC NOT NULL,
        total_premium_currency TEXT NOT NULL,
        taxes_amount_minor NUMERIC NOT NULL,
        taxes_currency TEXT NOT NULL,
        fees JSONB NOT NULL DEFAULT '[]',
        total_amount_minor NUMERIC NOT NULL,
        total_amount_currency TEXT NOT NULL,
        currency TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        payment_method TEXT,
        installment_plan_id UUID,
        paid_amount_minor NUMERIC DEFAULT 0,
        paid_amount_currency TEXT DEFAULT 'IRR',
        paid_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_premium_invoices_tenant_org ON premium_invoices(tenant_id, organization_id);
      CREATE INDEX IF NOT EXISTS idx_premium_invoices_policy ON premium_invoices(policy_id);
      CREATE INDEX IF NOT EXISTS idx_premium_invoices_status ON premium_invoices(status);
      CREATE INDEX IF NOT EXISTS idx_premium_invoices_due_date ON premium_invoices(due_date);

      CREATE TABLE IF NOT EXISTS premium_invoice_lines (
        line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES premium_invoices(invoice_id) ON DELETE CASCADE,
        line_number INT NOT NULL,
        line_type TEXT NOT NULL,
        description TEXT NOT NULL,
        amount_minor NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        tax_amount_minor NUMERIC DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_premium_invoice_lines_invoice ON premium_invoice_lines(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_premium_invoice_lines_type ON premium_invoice_lines(line_type);

      CREATE TABLE IF NOT EXISTS installment_plans (
        plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES premium_invoices(invoice_id) ON DELETE CASCADE,
        number_of_installments INT NOT NULL,
        schedule JSONB NOT NULL DEFAULT '[]',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_installment_plans_invoice ON installment_plans(invoice_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_installment_plans_invoice;
      DROP TABLE IF EXISTS installment_plans;
      DROP INDEX IF EXISTS idx_premium_invoice_lines_type;
      DROP INDEX IF EXISTS idx_premium_invoice_lines_invoice;
      DROP TABLE IF EXISTS premium_invoice_lines;
      DROP INDEX IF EXISTS idx_premium_invoices_due_date;
      DROP INDEX IF EXISTS idx_premium_invoices_status;
      DROP INDEX IF EXISTS idx_premium_invoices_policy;
      DROP INDEX IF EXISTS idx_premium_invoices_tenant_org;
      DROP TABLE IF EXISTS premium_invoices;
    `);
  }
}
