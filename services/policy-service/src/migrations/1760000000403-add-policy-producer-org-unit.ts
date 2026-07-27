import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPolicyProducerOrgUnit1760000000403 implements MigrationInterface {
  name = 'AddPolicyProducerOrgUnit1760000000403';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS producer_org_unit_id uuid;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policies_producer_org_unit_id ON policies(producer_org_unit_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_policies_producer_org_unit_id;`);
    await queryRunner.query(`ALTER TABLE policies DROP COLUMN IF EXISTS producer_org_unit_id;`);
  }
}
