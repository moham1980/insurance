import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P1 #5 (SoD): Add approval state machine fields to re_treaties table.
 * Adds pending_approval, approved, rejected to the treaty status (text column, no enum).
 * Adds submitted_by and approved_by columns for Segregation of Duties.
 */
export class AddSodApprovalFields1760000000515 implements MigrationInterface {
  name = 'AddSodApprovalFields1760000000515';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add SoD tracking columns
    await queryRunner.query(`ALTER TABLE re_treaties ADD COLUMN IF NOT EXISTS submitted_by TEXT`);
    await queryRunner.query(`ALTER TABLE re_treaties ADD COLUMN IF NOT EXISTS approved_by TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE re_treaties DROP COLUMN IF EXISTS approved_by`);
    await queryRunner.query(`ALTER TABLE re_treaties DROP COLUMN IF EXISTS submitted_by`);
  }
}
