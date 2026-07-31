import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3AddServicingOrgProducerParty1830000000004 implements MigrationInterface {
  name = 'P3AddServicingOrgProducerParty1830000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE policies
        ADD COLUMN IF NOT EXISTS servicing_organization_id UUID,
        ADD COLUMN IF NOT EXISTS producer_party_id UUID;

      CREATE INDEX IF NOT EXISTS idx_policies_servicing_organization_id
        ON policies(servicing_organization_id);
      CREATE INDEX IF NOT EXISTS idx_policies_producer_party_id
        ON policies(producer_party_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_policies_producer_party_id;
      DROP INDEX IF EXISTS idx_policies_servicing_organization_id;

      ALTER TABLE policies
        DROP COLUMN IF EXISTS producer_party_id,
        DROP COLUMN IF EXISTS servicing_organization_id;
    `);
  }
}
