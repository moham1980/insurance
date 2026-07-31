import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGlobalSubject1800000000012 implements MigrationInterface {
  name = 'CreateGlobalSubject1800000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS global_subjects (
        global_subject_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        iam_subject_id TEXT NOT NULL,
        assurance_level TEXT NOT NULL DEFAULT 'low',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_global_subjects_iam_subject
      ON global_subjects(iam_subject_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS global_subjects;`);
  }
}
