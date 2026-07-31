import { MigrationInterface, QueryRunner } from 'typeorm';

export class P4PaymentsEscrowRefundSettlement1840000010 implements MigrationInterface {
  name = 'P4PaymentsEscrowRefundSettlement1840000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_events (
        event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        payment_id UUID NOT NULL,
        event_type TEXT NOT NULL,
        status TEXT NOT NULL,
        amount_minor NUMERIC,
        currency TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id);

      CREATE TABLE IF NOT EXISTS escrow_holdings (
        holding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        escrow_account_ref TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id UUID NOT NULL,
        amount_minor NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        status TEXT DEFAULT 'held',
        expected_release_at TIMESTAMPTZ,
        released_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_escrow_holdings_tenant_ref ON escrow_holdings(tenant_id, escrow_account_ref);
      CREATE INDEX IF NOT EXISTS idx_escrow_holdings_source ON escrow_holdings(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_escrow_holdings_status ON escrow_holdings(status);

      CREATE TABLE IF NOT EXISTS escrow_releases (
        release_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        holding_id UUID NOT NULL REFERENCES escrow_holdings(holding_id),
        release_type TEXT NOT NULL,
        amount_minor NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        destination_account_ref TEXT NOT NULL,
        payment_id TEXT,
        status TEXT DEFAULT 'pending',
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_escrow_releases_holding ON escrow_releases(holding_id);
      CREATE INDEX IF NOT EXISTS idx_escrow_releases_status ON escrow_releases(status);

      CREATE TABLE IF NOT EXISTS refund_requests (
        refund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        source_type TEXT NOT NULL,
        source_id UUID NOT NULL,
        original_payment_id UUID NOT NULL,
        amount_minor NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        approved_by_party_id UUID,
        payment_id TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_refund_requests_tenant_org ON refund_requests(tenant_id, organization_id);
      CREATE INDEX IF NOT EXISTS idx_refund_requests_source ON refund_requests(source_type, source_id);

      CREATE TABLE IF NOT EXISTS settlement_batch_lines (
        batch_line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        batch_id UUID NOT NULL REFERENCES brokerage_settlement_batches(batch_id) ON DELETE CASCADE,
        organization_id UUID NOT NULL,
        party_id UUID,
        line_type TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id UUID NOT NULL,
        amount_minor NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        netted_amount_minor NUMERIC NOT NULL,
        status TEXT DEFAULT 'included',
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_settlement_batch_lines_batch ON settlement_batch_lines(batch_id);
      CREATE INDEX IF NOT EXISTS idx_settlement_batch_lines_org ON settlement_batch_lines(organization_id);
      CREATE INDEX IF NOT EXISTS idx_settlement_batch_lines_source ON settlement_batch_lines(source_type, source_id);

      -- Add columns to existing payment_transactions to support P4 state machine and idempotency
      ALTER TABLE payment_transactions
        ADD COLUMN IF NOT EXISTS correlation_id TEXT,
        ADD COLUMN IF NOT EXISTS payment_state TEXT,
        ADD COLUMN IF NOT EXISTS rail TEXT,
        ADD COLUMN IF NOT EXISTS source_account TEXT,
        ADD COLUMN IF NOT EXISTS destination_account_ref TEXT;

      CREATE INDEX IF NOT EXISTS idx_payment_transactions_correlation ON payment_transactions(correlation_id);
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_state ON payment_transactions(payment_state);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_payment_transactions_state;
      DROP INDEX IF EXISTS idx_payment_transactions_correlation;
      ALTER TABLE payment_transactions
        DROP COLUMN IF EXISTS correlation_id,
        DROP COLUMN IF EXISTS payment_state,
        DROP COLUMN IF EXISTS rail,
        DROP COLUMN IF EXISTS source_account,
        DROP COLUMN IF EXISTS destination_account_ref;

      DROP INDEX IF EXISTS idx_settlement_batch_lines_source;
      DROP INDEX IF EXISTS idx_settlement_batch_lines_org;
      DROP INDEX IF EXISTS idx_settlement_batch_lines_batch;
      DROP TABLE IF EXISTS settlement_batch_lines;

      DROP INDEX IF EXISTS idx_refund_requests_source;
      DROP INDEX IF EXISTS idx_refund_requests_tenant_org;
      DROP TABLE IF EXISTS refund_requests;

      DROP INDEX IF EXISTS idx_escrow_releases_status;
      DROP INDEX IF EXISTS idx_escrow_releases_holding;
      DROP TABLE IF EXISTS escrow_releases;

      DROP INDEX IF EXISTS idx_escrow_holdings_status;
      DROP INDEX IF EXISTS idx_escrow_holdings_source;
      DROP INDEX IF EXISTS idx_escrow_holdings_tenant_ref;
      DROP TABLE IF EXISTS escrow_holdings;

      DROP INDEX IF EXISTS idx_payment_events_payment;
      DROP TABLE IF EXISTS payment_events;
    `);
  }
}
