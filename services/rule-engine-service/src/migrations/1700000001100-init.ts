import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000001100 implements MigrationInterface {
  name = 'Init1700000001100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE rule_status AS ENUM ('draft', 'active', 'inactive');
      CREATE TYPE rule_type AS ENUM ('condition', 'calculation', 'validation');
      CREATE TYPE execution_status AS ENUM ('success', 'failed', 'skipped');

      CREATE TABLE rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(100) NOT NULL,
        rule_set_key VARCHAR(50) NOT NULL,
        type rule_type NOT NULL,
        description TEXT,
        condition JSONB NOT NULL,
        action JSONB,
        priority INTEGER DEFAULT 0,
        status rule_status DEFAULT 'draft',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE rule_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        rule_set_key VARCHAR(50) NOT NULL,
        business_key VARCHAR(100),
        input JSONB NOT NULL,
        output JSONB NOT NULL,
        status execution_status NOT NULL,
        matched_rules JSONB,
        error JSONB,
        execution_time_ms INTEGER NOT NULL,
        executed_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_rules_tenant_status ON rules(tenant_id, status);
      CREATE INDEX idx_rules_rule_set ON rules(rule_set_key);
      CREATE INDEX idx_rule_executions_set_business ON rule_executions(rule_set_key, business_key);
      CREATE INDEX idx_rule_executions_executed_at ON rule_executions(executed_at);
      CREATE INDEX idx_rule_executions_tenant ON rule_executions(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_rule_executions_tenant;
      DROP INDEX IF EXISTS idx_rule_executions_executed_at;
      DROP INDEX IF EXISTS idx_rule_executions_set_business;
      DROP INDEX IF EXISTS idx_rules_rule_set;
      DROP INDEX IF EXISTS idx_rules_tenant_status;
      DROP TABLE IF EXISTS rule_executions;
      DROP TABLE IF EXISTS rules;
      DROP TYPE IF EXISTS execution_status;
      DROP TYPE IF EXISTS rule_type;
      DROP TYPE IF EXISTS rule_status;
    `);
  }
}
