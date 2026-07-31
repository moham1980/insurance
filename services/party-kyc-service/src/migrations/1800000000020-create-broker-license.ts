import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBrokerLicense1800000000020 implements MigrationInterface {
  name = 'CreateBrokerLicense1800000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS broker_licenses (
        license_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        party_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        broker_central_code TEXT NOT NULL,
        license_number TEXT NOT NULL,
        license_type TEXT NOT NULL,
        scope TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
        issue_date TIMESTAMPTZ NOT NULL,
        expiry_date TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        verified_at TIMESTAMPTZ,
        verified_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS broker_licenses;`);
  }
}
