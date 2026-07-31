import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrokerOrgToCollections1850000000001 implements MigrationInterface {
  name = 'AddBrokerOrgToCollections1850000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE installment_plans
      ADD COLUMN IF NOT EXISTS tenant_id TEXT,
      ADD COLUMN IF NOT EXISTS broker_organization_id UUID;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_installment_plans_tenant_id ON installment_plans(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_installment_plans_broker_org ON installment_plans(broker_organization_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_installment_plans_broker_org;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_installment_plans_tenant_id;`);
    await queryRunner.query(`ALTER TABLE installment_plans DROP COLUMN IF EXISTS broker_organization_id, DROP COLUMN IF EXISTS tenant_id;`);
  }
}
