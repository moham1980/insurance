import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrokerLicenseToPolicy1760000000407 implements MigrationInterface {
  name = 'AddBrokerLicenseToPolicy1760000000407';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE policies
      ADD COLUMN IF NOT EXISTS broker_license_id UUID,
      ADD COLUMN IF NOT EXISTS distribution_organization_id UUID;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_policies_broker_license_id ON policies(broker_license_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_policies_distribution_organization_id ON policies(distribution_organization_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE policies
      DROP COLUMN IF EXISTS broker_license_id,
      DROP COLUMN IF EXISTS distribution_organization_id;
    `);
  }
}
