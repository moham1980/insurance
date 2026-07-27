import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantToOrgUnits1700000000011 implements MigrationInterface {
  name = 'AddTenantToOrgUnits1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE IF EXISTS org_units ADD COLUMN IF NOT EXISTS tenant_id UUID;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_org_units_tenant_id ON org_units(tenant_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_org_units_tenant_id;`);
    await queryRunner.query(`ALTER TABLE IF EXISTS org_units DROP COLUMN IF EXISTS tenant_id;`);
  }
}
