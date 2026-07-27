import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentDisputes1700000000505 implements MigrationInterface {
  name = 'AddPaymentDisputes1700000000505';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'public';
    await queryRunner.query(`SET search_path TO ${schema}, public;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_disputes (
        dispute_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        payment_id UUID NOT NULL,
        reason TEXT NOT NULL,
        evidence JSONB,
        status TEXT NOT NULL DEFAULT 'open',
        resolution_notes TEXT,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_disputes_tenant_id ON payment_disputes(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_disputes_payment_id ON payment_disputes(payment_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_disputes_status_created_at ON payment_disputes(status, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payment_disputes;`);
  }
}
