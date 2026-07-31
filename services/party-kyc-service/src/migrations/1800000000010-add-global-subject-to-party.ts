import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGlobalSubjectToParty1800000000010 implements MigrationInterface {
  name = 'AddGlobalSubjectToParty1800000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE parties
      ADD COLUMN IF NOT EXISTS mobile_blind_index TEXT,
      ADD COLUMN IF NOT EXISTS global_subject_id TEXT;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_parties_global_subject_id ON parties(tenant_id, global_subject_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_parties_mobile_blind_index ON parties(mobile_blind_index);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE parties
      DROP COLUMN IF EXISTS mobile_blind_index,
      DROP COLUMN IF EXISTS global_subject_id;
    `);
  }
}
