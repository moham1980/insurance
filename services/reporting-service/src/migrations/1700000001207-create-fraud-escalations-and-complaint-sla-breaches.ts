import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFraudEscalationsAndComplaintSlaBreaches1700000001207 implements MigrationInterface {
  name = 'CreateFraudEscalationsAndComplaintSlaBreaches1700000001207';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS rm_fraud_case_escalations (
      event_id TEXT PRIMARY KEY,
      occurred_at TIMESTAMPTZ,
      correlation_id TEXT,
      fraud_case_id UUID NOT NULL,
      claim_id UUID NOT NULL,
      claim_number TEXT,
      escalated_at TIMESTAMPTZ,
      to_unit TEXT NOT NULL,
      reason_codes JSONB,
      requires_human_approval BOOLEAN,
      notes TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_fraud_case_escalations_occurred_at ON rm_fraud_case_escalations(occurred_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_fraud_case_escalations_claim_id ON rm_fraud_case_escalations(claim_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_fraud_case_escalations_fraud_case_id ON rm_fraud_case_escalations(fraud_case_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_fraud_case_escalations_to_unit ON rm_fraud_case_escalations(to_unit);`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS rm_complaint_sla_breaches (
      event_id TEXT PRIMARY KEY,
      occurred_at TIMESTAMPTZ,
      correlation_id TEXT,
      complaint_id UUID NOT NULL,
      complaint_type TEXT,
      status TEXT,
      assigned_to TEXT,
      policy_id UUID,
      claim_id UUID,
      sla_first_response_due_at TIMESTAMPTZ,
      sla_resolution_due_at TIMESTAMPTZ,
      breached_at TIMESTAMPTZ,
      sla_hours INT,
      elapsed_hours INT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_complaint_sla_breaches_occurred_at ON rm_complaint_sla_breaches(occurred_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_complaint_sla_breaches_complaint_id ON rm_complaint_sla_breaches(complaint_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_complaint_sla_breaches_status ON rm_complaint_sla_breaches(status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_complaint_sla_breaches_assigned_to ON rm_complaint_sla_breaches(assigned_to);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_complaint_sla_breaches_claim_id ON rm_complaint_sla_breaches(claim_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_complaint_sla_breaches_policy_id ON rm_complaint_sla_breaches(policy_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS rm_complaint_sla_breaches;`);
    await queryRunner.query(`DROP TABLE IF EXISTS rm_fraud_case_escalations;`);
  }
}
