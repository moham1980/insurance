import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIdToReadmodels1700000001209 implements MigrationInterface {
  name = 'AddTenantIdToReadmodels1700000001209';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA || 'reporting';
    const tables = [
      'rm_policy_lifecycle',
      'rm_claim_payment',
      'rm_fraud_signal',
      'rm_ri_ceded',
      'rm_ri_borderaux',
      'rm_ri_recoveries',
      'rm_claim_documents_attached',
      'rm_fraud_case_escalation',
      'rm_complaint_sla_breach',
      'kpi_snapshots',
      'kpi_ingestion_audit',
      'kpi_governance_policies',
      'rm_policies',
      'rm_payments',
      'rm_sales_network',
      'rm_aml',
      'rm_underwriting',
      'external_system_connections',
    ];

    for (const table of tables) {
      const columnExists = await queryRunner.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = 'tenant_id'`,
        [schema, table]
      );
      if (columnExists.length === 0) {
        await queryRunner.query(`ALTER TABLE "${schema}"."${table}" ADD COLUMN tenant_id UUID;`);
      }
      const indexName = `idx_${table}_tenant_id`;
      const indexExists = await queryRunner.query(
        `SELECT 1 FROM pg_indexes WHERE schemaname = $1 AND tablename = $2 AND indexname = $3`,
        [schema, table, indexName]
      );
      if (indexExists.length === 0) {
        await queryRunner.query(`CREATE INDEX "${indexName}" ON "${schema}"."${table}"(tenant_id);`);
      }
    }

    // Backfill existing rows with a default tenant so non-null constraints/primary keys can be added
    await queryRunner.query(`UPDATE "${schema}"."kpi_governance_policies" SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;`);
    await queryRunner.query(`UPDATE "${schema}"."kpi_snapshots" SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;`);

    // kpi_governance_policies: switch primary key to (tenant_id, kpi_key)
    const pkConstraint = await queryRunner.query(
      `SELECT conname FROM pg_constraint WHERE conrelid = '"${schema}"."kpi_governance_policies"'::regclass AND contype = 'p'`
    );
    if (pkConstraint.length > 0) {
      await queryRunner.query(`ALTER TABLE "${schema}"."kpi_governance_policies" DROP CONSTRAINT "${pkConstraint[0].conname}";`);
    }
    await queryRunner.query(`ALTER TABLE "${schema}"."kpi_governance_policies" ALTER COLUMN tenant_id SET NOT NULL;`);
    await queryRunner.query(`ALTER TABLE "${schema}"."kpi_governance_policies" ADD PRIMARY KEY (tenant_id, kpi_key);`);

    // kpi_snapshots: replace unique index with tenant-scoped unique index
    const snapshotUniqueIndexes = await queryRunner.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND tablename = 'kpi_snapshots' AND indexdef LIKE '%UNIQUE%'`,
      [schema]
    );
    for (const idx of snapshotUniqueIndexes) {
      if (idx.indexname !== 'idx_kpi_snapshots_tenant_unique') {
        await queryRunner.query(`DROP INDEX IF EXISTS "${schema}"."${idx.indexname}";`);
      }
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_kpi_snapshots_tenant_unique" ON "${schema}"."kpi_snapshots"(tenant_id, kpi_key, period_start, period_end);`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Not reversible in full because tenant data has been written.
    const schema = process.env.DB_SCHEMA || 'reporting';
    await queryRunner.query(`DROP INDEX IF EXISTS "${schema}"."idx_kpi_snapshots_tenant_unique";`);
    const tables = [
      'rm_policy_lifecycle',
      'rm_claim_payment',
      'rm_fraud_signal',
      'rm_ri_ceded',
      'rm_ri_borderaux',
      'rm_ri_recoveries',
      'rm_claim_documents_attached',
      'rm_fraud_case_escalation',
      'rm_complaint_sla_breach',
      'kpi_snapshots',
      'kpi_ingestion_audit',
      'kpi_governance_policies',
      'rm_policies',
      'rm_payments',
      'rm_sales_network',
      'rm_aml',
      'rm_underwriting',
      'external_system_connections',
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${schema}"."idx_${table}_tenant_id";`);
      await queryRunner.query(`ALTER TABLE "${schema}"."${table}" DROP COLUMN IF EXISTS tenant_id;`);
    }
  }
}
