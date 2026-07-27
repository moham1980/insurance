import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePolicyInquiries1760000000402 implements MigrationInterface {
  name = 'CreatePolicyInquiries1760000000402';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS policy_inquiries (
        inquiry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        policy_id UUID,
        method TEXT NOT NULL,
        query JSONB NOT NULL,
        result_code TEXT NOT NULL,
        payload JSONB,
        work_item_id UUID,
        work_item_saga_id UUID,
        correlation_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_inquiries_policy_created_at ON policy_inquiries(policy_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_policy_inquiries_result_created_at ON policy_inquiries(result_code, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS policy_inquiries;`);
  }
}
