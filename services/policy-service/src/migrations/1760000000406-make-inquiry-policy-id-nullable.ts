import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeInquiryPolicyIdNullable1760000000406 implements MigrationInterface {
  name = 'MakeInquiryPolicyIdNullable1760000000406';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE policy_inquiries ALTER COLUMN policy_id DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE policy_inquiries ALTER COLUMN policy_id SET NOT NULL;
    `);
  }
}
