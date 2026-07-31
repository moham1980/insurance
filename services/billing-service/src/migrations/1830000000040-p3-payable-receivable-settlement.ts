import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3PayableReceivableSettlement1830000000040 implements MigrationInterface {
  name = 'P3PayableReceivableSettlement1830000000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS brokerage_payables (
        payable_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        debtor_organization_id UUID NOT NULL,
        creditor_organization_id UUID NOT NULL,
        related_policy_id UUID,
        type TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        due_date TIMESTAMPTZ NOT NULL,
        status TEXT DEFAULT 'open',
        source_type TEXT NOT NULL,
        source_id UUID NOT NULL,
        journal_entry_id UUID,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_brokerage_payables_debtor_status ON brokerage_payables(debtor_organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_brokerage_payables_policy ON brokerage_payables(related_policy_id);

      CREATE TABLE IF NOT EXISTS brokerage_receivables (
        receivable_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        creditor_organization_id UUID NOT NULL,
        debtor_organization_id UUID NOT NULL,
        related_policy_id UUID,
        type TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        due_date TIMESTAMPTZ NOT NULL,
        status TEXT DEFAULT 'open',
        source_type TEXT NOT NULL,
        source_id UUID NOT NULL,
        journal_entry_id UUID,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_brokerage_receivables_creditor_status ON brokerage_receivables(creditor_organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_brokerage_receivables_policy ON brokerage_receivables(related_policy_id);

      CREATE TABLE IF NOT EXISTS brokerage_settlement_batches (
        batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        from_organization_id UUID NOT NULL,
        to_organization_id UUID NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        total_premium_amount NUMERIC DEFAULT 0,
        total_premium_currency TEXT DEFAULT 'IRR',
        total_commission_amount NUMERIC DEFAULT 0,
        total_commission_currency TEXT DEFAULT 'IRR',
        net_settlement_amount NUMERIC DEFAULT 0,
        net_settlement_currency TEXT DEFAULT 'IRR',
        reconciliation_hash TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        approved_by_party_id UUID,
        payment_id TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_brokerage_settlement_batches_orgs ON brokerage_settlement_batches(from_organization_id, to_organization_id);
      CREATE INDEX IF NOT EXISTS idx_brokerage_settlement_batches_period ON brokerage_settlement_batches(period_start, period_end);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_brokerage_settlement_batches_period;
      DROP INDEX IF EXISTS idx_brokerage_settlement_batches_orgs;
      DROP TABLE IF EXISTS brokerage_settlement_batches;
      DROP INDEX IF EXISTS idx_brokerage_receivables_policy;
      DROP INDEX IF EXISTS idx_brokerage_receivables_creditor_status;
      DROP TABLE IF EXISTS brokerage_receivables;
      DROP INDEX IF EXISTS idx_brokerage_payables_policy;
      DROP INDEX IF EXISTS idx_brokerage_payables_debtor_status;
      DROP TABLE IF EXISTS brokerage_payables;
    `);
  }
}
