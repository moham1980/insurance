import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrgUnitsTable1700000000003 implements MigrationInterface {
  name = 'CreateOrgUnitsTable1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS org_units (
        org_unit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        parent_org_unit_id UUID,
        tenant_id UUID,
        level INTEGER NOT NULL DEFAULT 0,
        path TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (parent_org_unit_id) REFERENCES org_units(org_unit_id) ON DELETE SET NULL
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_units_parent_org_unit_id ON org_units(parent_org_unit_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_units_tenant_id ON org_units(tenant_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_units_code ON org_units(code);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_units_level ON org_units(level);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_units_path ON org_units(path);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS org_units;`);
  }
}
