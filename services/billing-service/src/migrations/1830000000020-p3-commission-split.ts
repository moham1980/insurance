import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3CommissionSplit1830000000020 implements MigrationInterface {
  name = 'P3CommissionSplit1830000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS commission_splits (
        split_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        journal_entry_id UUID,
        party_id UUID,
        organization_id UUID NOT NULL,
        role TEXT NOT NULL,
        base TEXT NOT NULL,
        share_bps INTEGER NOT NULL,
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        effective_from TIMESTAMPTZ NOT NULL,
        status TEXT DEFAULT 'accrued',
        commission_schedule_snapshot JSONB,
        source_type TEXT NOT NULL,
        source_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_commission_splits_journal_entry_id ON commission_splits(journal_entry_id);
      CREATE INDEX IF NOT EXISTS idx_commission_splits_org_status ON commission_splits(organization_id, status);
      CREATE INDEX IF NOT EXISTS idx_commission_splits_source ON commission_splits(source_type, source_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_commission_splits_source;
      DROP INDEX IF EXISTS idx_commission_splits_org_status;
      DROP INDEX IF EXISTS idx_commission_splits_journal_entry_id;
      DROP TABLE IF EXISTS commission_splits;
    `);
  }
}
