import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReinsuranceTenantAndColumns1760000000514 implements MigrationInterface {
  name = 'ReinsuranceTenantAndColumns1760000000514';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // tenant_id for all reinsurance tables
    await queryRunner.query(`ALTER TABLE re_treaties ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';`);
    await queryRunner.query(`ALTER TABLE re_cessions ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';`);
    await queryRunner.query(`ALTER TABLE re_statements ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';`);
    await queryRunner.query(`ALTER TABLE re_reconciliations ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';`);
    await queryRunner.query(`ALTER TABLE re_claim_recoveries ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';`);
    await queryRunner.query(`ALTER TABLE re_tickets ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';`);
    await queryRunner.query(`ALTER TABLE re_ticket_messages ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';`);
    await queryRunner.query(`ALTER TABLE re_ticket_attachments ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';`);

    // ReTreaty missing columns
    await queryRunner.query(`ALTER TABLE re_treaties ADD COLUMN IF NOT EXISTS retention_rate NUMERIC;`);
    await queryRunner.query(`ALTER TABLE re_treaties ADD COLUMN IF NOT EXISTS cession_rate NUMERIC;`);
    await queryRunner.query(`ALTER TABLE re_treaties ADD COLUMN IF NOT EXISTS config JSONB;`);

    // ReCession missing columns
    await queryRunner.query(`ALTER TABLE re_cessions ADD COLUMN IF NOT EXISTS policy_number TEXT;`);
    await queryRunner.query(`ALTER TABLE re_cessions ADD COLUMN IF NOT EXISTS cession_type TEXT;`);
    await queryRunner.query(`ALTER TABLE re_cessions ADD COLUMN IF NOT EXISTS ceded_premium NUMERIC(18,2);`);
    await queryRunner.query(`ALTER TABLE re_cessions ADD COLUMN IF NOT EXISTS ceded_sum_insured NUMERIC(18,2);`);
    await queryRunner.query(`ALTER TABLE re_cessions ADD COLUMN IF NOT EXISTS retention_rate NUMERIC;`);
    await queryRunner.query(`ALTER TABLE re_cessions ADD COLUMN IF NOT EXISTS cession_rate NUMERIC;`);
    await queryRunner.query(`ALTER TABLE re_cessions ADD COLUMN IF NOT EXISTS effective_from DATE;`);
    await queryRunner.query(`ALTER TABLE re_cessions ADD COLUMN IF NOT EXISTS effective_to DATE;`);

    // shared event tables
    await queryRunner.query(`ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';`);
    await queryRunner.query(`ALTER TABLE consumed_events ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';`);

    // Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_treaties_tenant_id ON re_treaties(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_cessions_tenant_id ON re_cessions(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_statements_tenant_id ON re_statements(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_reconciliations_tenant_id ON re_reconciliations(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_claim_recoveries_tenant_id ON re_claim_recoveries(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_tickets_tenant_id ON re_tickets(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_ticket_messages_tenant_id ON re_ticket_messages(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_ticket_attachments_tenant_id ON re_ticket_attachments(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_tenant_status ON outbox_events(tenant_id, status, occurred_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_consumed_events_tenant ON consumed_events(tenant_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Not reversible safely due to IF NOT EXISTS additions
    await queryRunner.query(`SELECT 1;`);
  }
}
