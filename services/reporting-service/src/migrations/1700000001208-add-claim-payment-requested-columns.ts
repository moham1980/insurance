import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClaimPaymentRequestedColumns1700000001208 implements MigrationInterface {
  name = 'AddClaimPaymentRequestedColumns1700000001208';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE rm_claim_payment ADD COLUMN IF NOT EXISTS payment_requested_at TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE rm_claim_payment ADD COLUMN IF NOT EXISTS approved_amount NUMERIC;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_rm_claim_payment_payment_requested_at ON rm_claim_payment(payment_requested_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rm_claim_payment_payment_requested_at;`);
    await queryRunner.query(`ALTER TABLE rm_claim_payment DROP COLUMN IF EXISTS approved_amount;`);
    await queryRunner.query(`ALTER TABLE rm_claim_payment DROP COLUMN IF EXISTS payment_requested_at;`);
  }
}
