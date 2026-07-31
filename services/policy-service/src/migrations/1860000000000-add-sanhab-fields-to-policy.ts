import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSanhabFieldsToPolicy1860000000000 implements MigrationInterface {
  name = 'AddSanhabFieldsToPolicy1860000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE policies
      ADD COLUMN IF NOT EXISTS sanhab_status TEXT NOT NULL DEFAULT 'not_submitted',
      ADD COLUMN IF NOT EXISTS sanhab_submission_id TEXT,
      ADD COLUMN IF NOT EXISTS sanhab_response JSONB;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_policies_sanhab_status ON policies(sanhab_status);
    `);

    await queryRunner.query(`
      UPDATE policies
      SET sanhab_status = CASE
        WHEN unique_code IS NOT NULL THEN 'confirmed'
        ELSE 'not_submitted'
      END
      WHERE sanhab_status = 'not_submitted';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_policies_sanhab_status;`);
    await queryRunner.query(`
      ALTER TABLE policies
      DROP COLUMN IF EXISTS sanhab_status,
      DROP COLUMN IF EXISTS sanhab_submission_id,
      DROP COLUMN IF EXISTS sanhab_response;
    `);
  }
}
