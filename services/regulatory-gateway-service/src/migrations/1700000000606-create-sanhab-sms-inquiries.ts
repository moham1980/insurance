import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSanhabSmsInquiries1700000000606 implements MigrationInterface {
  name = 'CreateSanhabSmsInquiries1700000000606';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.sanhab_sms_inquiries (
        inquiry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number TEXT NOT NULL,
        inquiry_type TEXT NOT NULL,
        national_id TEXT,
        unique_code TEXT,
        policy_number TEXT,
        vin TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        result_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sanhab_sms_inquiries_phone_status ON ${schema}.sanhab_sms_inquiries(phone_number, status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sanhab_sms_inquiries_status_created_at ON ${schema}.sanhab_sms_inquiries(status, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`DROP TABLE IF EXISTS ${schema}.sanhab_sms_inquiries;`);
  }
}
