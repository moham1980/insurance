import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000001100 implements MigrationInterface {
  name = 'Init1700000001100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS rule_status AS ENUM ('draft', 'active', 'inactive');
      CREATE TYPE IF NOT EXISTS rule_type AS ENUM ('condition', 'calculation', 'validation');
      CREATE TYPE IF NOT EXISTS execution_status AS ENUM ('success', 'failed', 'skipped');

      CREATE TABLE IF NOT EXISTS rules (
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
        version INTEGER DEFAULT 1,
        tags TEXT[] DEFAULT '{}',
        template_id UUID,
        activated_at TIMESTAMP,
        deactivated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rule_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        rule_set_key VARCHAR(50) NOT NULL,
        business_key VARCHAR(100),
        input JSONB NOT NULL,
        output JSONB NOT NULL,
        status execution_status NOT NULL,
        matched_rules JSONB,
        execution_details JSONB,
        error JSONB,
        execution_time_ms INTEGER NOT NULL,
        executed_at TIMESTAMP NOT NULL,
        dry_run BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rule_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        condition_template TEXT NOT NULL,
        action_template JSONB,
        variables TEXT[] NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_rules_tenant_status ON rules(tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_rules_rule_set ON rules(rule_set_key);
      CREATE INDEX IF NOT EXISTS idx_rules_tenant_rule_set_name ON rules(tenant_id, rule_set_key, name);
      CREATE INDEX IF NOT EXISTS idx_rule_executions_set_business ON rule_executions(rule_set_key, business_key);
      CREATE INDEX IF NOT EXISTS idx_rule_executions_executed_at ON rule_executions(executed_at);
      CREATE INDEX IF NOT EXISTS idx_rule_executions_tenant ON rule_executions(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_rule_templates_tenant_category ON rule_templates(tenant_id, category);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_rule_templates_tenant_category;
      DROP INDEX IF EXISTS idx_rule_executions_tenant;
      DROP INDEX IF EXISTS idx_rule_executions_executed_at;
      DROP INDEX IF EXISTS idx_rule_executions_set_business;
      DROP INDEX IF EXISTS idx_rules_tenant_rule_set_name;
      DROP INDEX IF EXISTS idx_rules_rule_set;
      DROP INDEX IF EXISTS idx_rules_tenant_status;
      DROP TABLE IF EXISTS rule_templates;
      DROP TABLE IF EXISTS rule_executions;
      DROP TABLE IF EXISTS rules;
      DROP TYPE IF EXISTS execution_status;
      DROP TYPE IF EXISTS rule_type;
      DROP TYPE IF EXISTS rule_status;
    `);
  }
}
