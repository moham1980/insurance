import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouseFireInquiryRecord1700000000608 implements MigrationInterface {
  name = 'CreateWarehouseFireInquiryRecord1700000000608';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`SET search_path TO ${schema}, public;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouse_fire_inquiry_record (
        record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        inquiry_id UUID,
        warehouse_id VARCHAR(100),
        national_id VARCHAR(50),
        license_number VARCHAR(50),
        address VARCHAR(200),
        city VARCHAR(100),
        province VARCHAR(100),
        inquiry_type VARCHAR(50) NOT NULL,
        success BOOLEAN NOT NULL,
        response_json JSONB,
        tenant_id VARCHAR(100),
        actor_user_id VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_warehouse_fire_inquiry_created_at ON warehouse_fire_inquiry_record(created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_warehouse_fire_inquiry_tenant ON warehouse_fire_inquiry_record(tenant_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'regulatory';
    await queryRunner.query(`SET search_path TO ${schema}, public;`);
    await queryRunner.query(`DROP TABLE IF EXISTS warehouse_fire_inquiry_record;`);
  }
}
