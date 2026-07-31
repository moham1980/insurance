import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationRelationships1800000000002 implements MigrationInterface {
  name = 'CreateOrganizationRelationships1800000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_relationships (
        relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_organization_id UUID NOT NULL,
        target_organization_id UUID NOT NULL,
        relationship_type TEXT NOT NULL,
        distribution_agreement_id UUID,
        valid_from TIMESTAMPTZ NOT NULL,
        valid_to TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_relationships_source_target_type
      ON organization_relationships(source_organization_id, target_organization_id, relationship_type);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_relationships_status_dates
      ON organization_relationships(status, valid_from, valid_to);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_relationships_agreement
      ON organization_relationships(distribution_agreement_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS organization_relationships;`);
  }
}
