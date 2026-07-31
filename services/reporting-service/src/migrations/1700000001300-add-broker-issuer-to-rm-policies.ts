import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrokerIssuerToRmPolicies1700000001300 implements MigrationInterface {
  name = 'AddBrokerIssuerToRmPolicies1700000001300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rm_policies
        ADD COLUMN IF NOT EXISTS unique_code text,
        ADD COLUMN IF NOT EXISTS broker_organization_id uuid,
        ADD COLUMN IF NOT EXISTS issuer_organization_id uuid;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rm_policies_broker_org ON rm_policies(broker_organization_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rm_policies_issuer_org ON rm_policies(issuer_organization_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_policies_broker_org;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_policies_issuer_org;`);
    await queryRunner.query(`
      ALTER TABLE rm_policies
        DROP COLUMN IF EXISTS unique_code,
        DROP COLUMN IF EXISTS broker_organization_id,
        DROP COLUMN IF EXISTS issuer_organization_id;
    `);
  }
}
