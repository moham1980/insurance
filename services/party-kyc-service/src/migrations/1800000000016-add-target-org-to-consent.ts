import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTargetOrgToConsent1800000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "federation_consents" ADD COLUMN IF NOT EXISTS "target_organization_id" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "federation_consents" DROP COLUMN IF EXISTS "target_organization_id"`,
    );
  }
}
