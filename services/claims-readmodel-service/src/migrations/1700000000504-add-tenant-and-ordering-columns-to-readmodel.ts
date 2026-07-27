import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantAndOrderingColumnsToReadModel1700000000504 implements MigrationInterface {
  name = 'AddTenantAndOrderingColumnsToReadModel1700000000504';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // tenant_id for read model tenant isolation
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS tenant_id UUID;`);
    await queryRunner.query(`ALTER TABLE rm_fraud_cases ADD COLUMN IF NOT EXISTS tenant_id UUID;`);
    await queryRunner.query(`ALTER TABLE rm_complaints ADD COLUMN IF NOT EXISTS tenant_id UUID;`);

    // existing columns may be NOT NULL from prior migration; make nullable for pending recovery data
    await queryRunner.query(`ALTER TABLE rm_claims_cases ALTER COLUMN claim_number DROP NOT NULL;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ALTER COLUMN policy_id DROP NOT NULL;`);

    // event ordering/version columns for ordering protection
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS assessed_amount NUMERIC(18,2);`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(18,2);`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(18,2);`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS currency TEXT;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS adjuster_id UUID;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS fraud_case_id UUID;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS last_event_version INT;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases ADD COLUMN IF NOT EXISTS last_occurred_at TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE rm_fraud_cases ADD COLUMN IF NOT EXISTS last_event_id UUID;`);
    await queryRunner.query(`ALTER TABLE rm_fraud_cases ADD COLUMN IF NOT EXISTS last_event_version INT;`);
    await queryRunner.query(`ALTER TABLE rm_fraud_cases ADD COLUMN IF NOT EXISTS last_occurred_at TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE rm_complaints ADD COLUMN IF NOT EXISTS last_event_version INT;`);
    await queryRunner.query(`ALTER TABLE rm_complaints ADD COLUMN IF NOT EXISTS last_occurred_at TIMESTAMPTZ;`);

    // composite unique constraints for consumed event idempotency
    await queryRunner.query(`ALTER TABLE consumed_events ADD CONSTRAINT IF NOT EXISTS uq_consumed_events_event_consumer UNIQUE (event_id, consumer_name);`);

    // tenant indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_claims_cases_tenant_id ON rm_claims_cases(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_claims_cases_tenant_status ON rm_claims_cases(tenant_id, status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_fraud_cases_tenant_id ON rm_fraud_cases(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_fraud_cases_tenant_status ON rm_fraud_cases(tenant_id, status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_complaints_tenant_id ON rm_complaints(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_complaints_tenant_status ON rm_complaints(tenant_id, status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_complaints_tenant_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_complaints_tenant_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_fraud_cases_tenant_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_fraud_cases_tenant_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_claims_cases_tenant_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_claims_cases_tenant_id;`);
    await queryRunner.query(`ALTER TABLE consumed_events DROP CONSTRAINT IF EXISTS uq_consumed_events_event_consumer;`);
    await queryRunner.query(`ALTER TABLE rm_complaints DROP COLUMN IF EXISTS last_occurred_at;`);
    await queryRunner.query(`ALTER TABLE rm_complaints DROP COLUMN IF EXISTS last_event_version;`);
    await queryRunner.query(`ALTER TABLE rm_fraud_cases DROP COLUMN IF EXISTS last_occurred_at;`);
    await queryRunner.query(`ALTER TABLE rm_fraud_cases DROP COLUMN IF EXISTS last_event_version;`);
    await queryRunner.query(`ALTER TABLE rm_fraud_cases DROP COLUMN IF EXISTS last_event_id;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS last_occurred_at;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS last_event_version;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS fraud_case_id;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS adjuster_id;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS currency;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS paid_amount;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS approved_amount;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS assessed_amount;`);
    await queryRunner.query(`ALTER TABLE rm_complaints DROP COLUMN IF EXISTS tenant_id;`);
    await queryRunner.query(`ALTER TABLE rm_fraud_cases DROP COLUMN IF EXISTS tenant_id;`);
    await queryRunner.query(`ALTER TABLE rm_claims_cases DROP COLUMN IF EXISTS tenant_id;`);
  }
}
