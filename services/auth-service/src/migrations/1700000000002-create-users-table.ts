import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1700000000002 implements MigrationInterface {
  name = 'CreateUsersTable1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        roles TEXT[] NOT NULL DEFAULT ARRAY['user']::text[],
        department TEXT,
        position_title TEXT,
        national_id TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        org_unit_id UUID,
        tenant_id UUID,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_org_unit_id ON users(org_unit_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
  }
}
