import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalculatedByPartyToSettlementBatch1850000000001 implements MigrationInterface {
  name = 'AddCalculatedByPartyToSettlementBatch1850000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE brokerage_settlement_batches
      ADD COLUMN IF NOT EXISTS calculated_by_party_id UUID;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE brokerage_settlement_batches DROP COLUMN IF EXISTS calculated_by_party_id;`);
  }
}
