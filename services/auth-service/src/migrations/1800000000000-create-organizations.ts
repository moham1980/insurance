import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizations1800000000000 implements MigrationInterface {
  name = 'CreateOrganizations1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        legal_type TEXT NOT NULL,
        national_id_blind_index TEXT,
        regulatory_code TEXT,
        country TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        legal_address JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_national_id_blind_index
      ON organizations(national_id_blind_index) WHERE national_id_blind_index IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_regulatory_code
      ON organizations(regulatory_code) WHERE regulatory_code IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_organizations_country_status ON organizations(country, status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS organizations;`);
  }
}
