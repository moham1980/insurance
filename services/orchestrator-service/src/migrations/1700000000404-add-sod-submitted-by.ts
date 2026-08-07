import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P1 #5 (SoD): Add submitted_by column to work_items table.
 * This tracks who submitted/created the work item for Segregation of Duties enforcement.
 * The approver (decided_by) must differ from the submitter.
 */
export class AddSodSubmittedBy1700000000404 implements MigrationInterface {
  name = 'AddSodSubmittedBy1700000000404';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE work_items ADD COLUMN IF NOT EXISTS submitted_by TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE work_items DROP COLUMN IF EXISTS submitted_by`);
  }
}
