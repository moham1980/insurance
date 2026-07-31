import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantIdToBrokerLicenses1800000000021 implements MigrationInterface {
  name = 'AddTenantIdToBrokerLicenses1800000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE broker_licenses
      ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';
    `);

    // Drop old non-tenant-scoped indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_broker_licenses_party_org;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_broker_licenses_central_code;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_broker_licenses_license_number;`);

    // Create new tenant-scoped indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_broker_licenses_tenant_party_org
      ON broker_licenses(tenant_id, party_id, organization_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_licenses_tenant_central_code
      ON broker_licenses(tenant_id, broker_central_code);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_licenses_tenant_license_number
      ON broker_licenses(tenant_id, license_number);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_broker_licenses_tenant_party_org;
      DROP INDEX IF EXISTS idx_broker_licenses_tenant_central_code;
      DROP INDEX IF EXISTS idx_broker_licenses_tenant_license_number;
    `);
    await queryRunner.query(`
      ALTER TABLE broker_licenses DROP COLUMN IF EXISTS tenant_id;
    `);
    // Restore old indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_broker_licenses_party_org
      ON broker_licenses(party_id, organization_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_licenses_central_code
      ON broker_licenses(broker_central_code);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_licenses_license_number
      ON broker_licenses(license_number);
    `);
  }
}
