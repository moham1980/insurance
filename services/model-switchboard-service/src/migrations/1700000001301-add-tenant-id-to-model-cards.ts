import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIdToModelCards1700000001301 implements MigrationInterface {
  name = 'AddTenantIdToModelCards1700000001301';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // P0 security: add tenantId column to model_cards for tenant isolation.
    // Nullable for backward compatibility with pre-existing rows.
    await queryRunner.query(`
      ALTER TABLE model_cards ADD COLUMN IF NOT EXISTS tenant_id UUID NULL;
      CREATE INDEX IF NOT EXISTS idx_model_cards_tenant ON model_cards(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_model_cards_tenant;
      ALTER TABLE model_cards DROP COLUMN IF EXISTS tenant_id;
    `);
  }
}
