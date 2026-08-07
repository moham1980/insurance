import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P1 #5 (SoD): Add approval state machine fields to rules table.
 * Adds pending_approval, approved, rejected to rule_status enum.
 * Adds submitted_by and approved_by columns for Segregation of Duties.
 */
export class AddSodApprovalFields1700000001101 implements MigrationInterface {
  name = 'AddSodApprovalFields1700000001101';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new enum values for approval state machine
    await queryRunner.query(`ALTER TYPE rule_status ADD VALUE IF NOT EXISTS 'pending_approval'`);
    await queryRunner.query(`ALTER TYPE rule_status ADD VALUE IF NOT EXISTS 'approved'`);
    await queryRunner.query(`ALTER TYPE rule_status ADD VALUE IF NOT EXISTS 'rejected'`);

    // Add SoD tracking columns
    await queryRunner.query(`ALTER TABLE rules ADD COLUMN IF NOT EXISTS submitted_by TEXT`);
    await queryRunner.query(`ALTER TABLE rules ADD COLUMN IF NOT EXISTS approved_by TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE rules DROP COLUMN IF EXISTS approved_by`);
    await queryRunner.query(`ALTER TABLE rules DROP COLUMN IF EXISTS submitted_by`);
    // Note: PostgreSQL does not support removing individual enum values
  }
}
