import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGlobalUserIdToParty1700000000302 implements MigrationInterface {
  name = 'AddGlobalUserIdToParty1700000000302';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE IF EXISTS parties ADD COLUMN IF NOT EXISTS global_user_id TEXT;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_parties_global_user_id ON parties(global_user_id) WHERE global_user_id IS NOT NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parties_global_user_id;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS parties DROP COLUMN IF EXISTS global_user_id;`);
  }
}
