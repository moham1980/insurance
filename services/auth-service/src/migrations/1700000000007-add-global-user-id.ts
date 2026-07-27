import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGlobalUserId1700000000007 implements MigrationInterface {
  name = 'AddGlobalUserId1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS global_user_id TEXT;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_global_user_id ON users(global_user_id) WHERE global_user_id IS NOT NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_global_user_id;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS global_user_id;`);
  }
}
