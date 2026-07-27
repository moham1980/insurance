import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000001300 implements MigrationInterface {
  name = 'Init1700000001300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE model_type AS ENUM ('ocr', 'nlp', 'fraud_detection', 'risk_scoring', 'classification');
      CREATE TYPE model_status AS ENUM ('draft', 'active', 'deprecated', 'retired');
      CREATE TYPE invocation_status AS ENUM ('success', 'failed', 'timeout');

      CREATE TABLE model_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(100) NOT NULL,
        model_key VARCHAR(50) NOT NULL UNIQUE,
        model_type model_type NOT NULL,
        description TEXT,
        config JSONB NOT NULL,
        priority INTEGER DEFAULT 0,
        status model_status DEFAULT 'draft',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE model_invocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        model_key VARCHAR(50) NOT NULL,
        business_key VARCHAR(100),
        input JSONB NOT NULL,
        output JSONB,
        status invocation_status NOT NULL,
        error JSONB,
        latency_ms INTEGER NOT NULL,
        invoked_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_model_definitions_tenant_status ON model_definitions(tenant_id, status);
      CREATE INDEX idx_model_definitions_type ON model_definitions(model_type);
      CREATE INDEX idx_model_invocations_model_business ON model_invocations(model_key, business_key);
      CREATE INDEX idx_model_invocations_invoked_at ON model_invocations(invoked_at);
      CREATE INDEX idx_model_invocations_tenant ON model_invocations(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_model_invocations_tenant;
      DROP INDEX IF EXISTS idx_model_invocations_invoked_at;
      DROP INDEX IF EXISTS idx_model_invocations_model_business;
      DROP INDEX IF EXISTS idx_model_definitions_type;
      DROP INDEX IF EXISTS idx_model_definitions_tenant_status;
      DROP TABLE IF EXISTS model_invocations;
      DROP TABLE IF EXISTS model_definitions;
      DROP TYPE IF EXISTS invocation_status;
      DROP TYPE IF EXISTS model_status;
      DROP TYPE IF EXISTS model_type;
    `);
  }
}
