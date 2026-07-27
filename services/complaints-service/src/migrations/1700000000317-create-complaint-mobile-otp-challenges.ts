import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateComplaintMobileOtpChallenges1700000000317 implements MigrationInterface {
  name = 'CreateComplaintMobileOtpChallenges1700000000317';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS complaint_mobile_otp_challenges (
        challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        complaint_id UUID NOT NULL,
        mobile TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        code_salt TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'sent',
        attempts INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 5,
        last_attempt_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        verified_at TIMESTAMPTZ,
        requested_by TEXT,
        verified_by TEXT,
        correlation_id TEXT,
        tenant_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaint_mobile_otp_complaint_created_at ON complaint_mobile_otp_challenges(complaint_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaint_mobile_otp_mobile_created_at ON complaint_mobile_otp_challenges(mobile, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_complaint_mobile_otp_status_expires_at ON complaint_mobile_otp_challenges(status, expires_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS complaint_mobile_otp_challenges;`);
  }
}
