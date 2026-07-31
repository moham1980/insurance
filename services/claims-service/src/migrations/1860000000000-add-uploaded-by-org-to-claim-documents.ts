import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUploadedByOrgToClaimDocuments1860000000000 implements MigrationInterface {
  name = 'AddUploadedByOrgToClaimDocuments1860000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE claim_documents
      ADD COLUMN IF NOT EXISTS uploaded_by_organization_id UUID;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_claim_documents_uploaded_by_org_id
      ON claim_documents(uploaded_by_organization_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_claim_documents_uploaded_by_org_id;`);
    await queryRunner.query(`ALTER TABLE claim_documents DROP COLUMN IF EXISTS uploaded_by_organization_id;`);
  }
}
