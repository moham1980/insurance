import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingUserColumns1700000000008 implements MigrationInterface {
  name = 'AddMissingUserColumns1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['user']::text[];`);
    await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS department TEXT;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS position_title TEXT;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS national_id TEXT;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS tenant_id UUID;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS last_login_at;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS tenant_id;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS national_id;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS position_title;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS department;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS roles;`);
  }
}
