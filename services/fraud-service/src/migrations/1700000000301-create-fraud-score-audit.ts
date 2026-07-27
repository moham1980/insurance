import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFraudScoreAudit1700000000301 implements MigrationInterface {
  name = 'CreateFraudScoreAudit1700000000301';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fraud_score_audit (
        audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id UUID NOT NULL,
        correlation_id TEXT,
        input JSONB NOT NULL,
        score INT NOT NULL,
        signals JSONB,
        threshold INT NOT NULL,
        hold_claim BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_score_audit_claim_created_at ON fraud_score_audit(claim_id, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS fraud_score_audit;`);
  }
}
