import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBrokerCarrierOrgToUnderwritingRequest1700000000604 implements MigrationInterface {
  name = 'AddBrokerCarrierOrgToUnderwritingRequest1700000000604';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE underwriting_requests ADD COLUMN IF NOT EXISTS broker_organization_id UUID;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests ADD COLUMN IF NOT EXISTS carrier_organization_id UUID;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_underwriting_requests_carrier_org ON underwriting_requests(carrier_organization_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_underwriting_requests_broker_org ON underwriting_requests(broker_organization_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_underwriting_requests_broker_org;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_underwriting_requests_carrier_org;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests DROP COLUMN IF EXISTS carrier_organization_id;`);
    await queryRunner.query(`ALTER TABLE underwriting_requests DROP COLUMN IF EXISTS broker_organization_id;`);
  }
}
