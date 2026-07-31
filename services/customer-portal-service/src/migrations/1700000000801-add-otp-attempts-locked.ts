import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpAttemptsLockedToCustomerSession1700000000801 implements MigrationInterface {
  name = 'AddOtpAttemptsLockedToCustomerSession1700000000801';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'locked';`);
    await queryRunner.query(`ALTER TABLE customer_sessions ADD COLUMN IF NOT EXISTS otp_attempts INT NOT NULL DEFAULT 0;`);
    await queryRunner.query(`ALTER TABLE customer_sessions ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE customer_sessions DROP COLUMN IF EXISTS locked_at;`);
    await queryRunner.query(`ALTER TABLE customer_sessions DROP COLUMN IF EXISTS otp_attempts;`);
  }
}
