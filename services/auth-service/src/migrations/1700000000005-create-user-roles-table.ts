import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserRolesTable1700000000005 implements MigrationInterface {
  name = 'CreateUserRolesTable1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id UUID NOT NULL,
        role_id UUID NOT NULL,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        assigned_by UUID,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_roles;`);
  }
}
