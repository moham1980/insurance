import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000001000 implements MigrationInterface {
  name = 'Init1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'archived');
      CREATE TYPE instance_status AS ENUM ('running', 'completed', 'failed', 'cancelled', 'suspended');

      CREATE TABLE workflow_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(100) NOT NULL,
        key VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        definition JSONB NOT NULL,
        status workflow_status DEFAULT 'draft',
        version INTEGER DEFAULT 1,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE workflow_instances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        workflow_definition_id UUID NOT NULL,
        business_key VARCHAR(100),
        status instance_status DEFAULT 'running',
        variables JSONB NOT NULL,
        current_node JSONB NOT NULL,
        history JSONB,
        error JSONB,
        completed_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_workflow_definitions_tenant ON workflow_definitions(tenant_id);
      CREATE INDEX idx_workflow_definitions_key ON workflow_definitions(key);
      CREATE INDEX idx_workflow_instances_def_status ON workflow_instances(workflow_definition_id, status);
      CREATE INDEX idx_workflow_instances_business_key ON workflow_instances(business_key);
      CREATE INDEX idx_workflow_instances_tenant ON workflow_instances(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_workflow_instances_tenant;
      DROP INDEX IF EXISTS idx_workflow_instances_business_key;
      DROP INDEX IF EXISTS idx_workflow_instances_def_status;
      DROP INDEX IF EXISTS idx_workflow_definitions_key;
      DROP INDEX IF EXISTS idx_workflow_definitions_tenant;
      DROP TABLE IF EXISTS workflow_instances;
      DROP TABLE IF EXISTS workflow_definitions;
      DROP TYPE IF EXISTS instance_status;
      DROP TYPE IF EXISTS workflow_status;
    `);
  }
}
