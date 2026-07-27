import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAbacPoliciesTable1700000000013 implements MigrationInterface {
  name = 'CreateAbacPoliciesTable1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS abac_policies (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        effect VARCHAR(10) NOT NULL DEFAULT 'allow',
        conditions JSONB NOT NULL,
        priority INT NOT NULL DEFAULT 0,
        enabled BOOLEAN NOT NULL DEFAULT true,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_by VARCHAR(128),
        updated_by VARCHAR(128),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_abac_policies_enabled ON abac_policies(enabled);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_abac_policies_priority ON abac_policies(priority);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_abac_policies_status ON abac_policies(status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS abac_policies;`);
  }
}
