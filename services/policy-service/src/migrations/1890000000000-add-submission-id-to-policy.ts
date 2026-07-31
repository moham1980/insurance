import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubmissionIdToPolicy1890000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE policies
      ADD COLUMN IF NOT EXISTS submission_id UUID;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_policies_submission_id ON policies(submission_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_policies_submission_id;
    `);
    await queryRunner.query(`
      ALTER TABLE policies
      DROP COLUMN IF EXISTS submission_id;
    `);
  }
}
