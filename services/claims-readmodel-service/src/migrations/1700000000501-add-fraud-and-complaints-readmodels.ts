import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFraudAndComplaintsReadModels1700000000501 implements MigrationInterface {
  name = 'AddFraudAndComplaintsReadModels1700000000501';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rm_fraud_cases (
        claim_id UUID PRIMARY KEY,
        fraud_case_id UUID,
        claim_number TEXT,
        latest_score INT,
        hold_claim BOOLEAN,
        status TEXT,
        assigned_to TEXT,
        score_computed_at TIMESTAMPTZ,
        case_opened_at TIMESTAMPTZ,
        case_closed_at TIMESTAMPTZ,
        case_resolution TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_fraud_cases_status_updated_at ON rm_fraud_cases(status, updated_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_fraud_cases_score_updated_at ON rm_fraud_cases(latest_score, updated_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rm_complaints (
        complaint_id UUID PRIMARY KEY,
        complaint_type TEXT NOT NULL,
        status TEXT NOT NULL,
        policy_id UUID,
        claim_id UUID,
        policy_number TEXT,
        assigned_to TEXT,
        sla_first_response_due_at TIMESTAMPTZ,
        sla_resolution_due_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ,
        last_event_id UUID
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_complaints_status_updated_at ON rm_complaints(status, updated_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_complaints_type_updated_at ON rm_complaints(complaint_type, updated_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS rm_complaints;`);
    await queryRunner.query(`DROP TABLE IF EXISTS rm_fraud_cases;`);
  }
}
