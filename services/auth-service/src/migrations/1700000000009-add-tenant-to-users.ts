import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantToUsers1700000000009 implements MigrationInterface {
  name = 'AddTenantToUsers1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS tenant_id UUID;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_tenant_id;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS tenant_id;`);
  }
}
