import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAmlTables1760000000410 implements MigrationInterface {
  name = 'CreateAmlTables1760000000410';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS aml_consents (
        consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject_national_id TEXT NOT NULL,
        consent_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        valid_from TIMESTAMPTZ,
        valid_to TIMESTAMPTZ,
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_aml_consents_status CHECK (status IN ('active','revoked','expired'))
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_consents_status_created_at ON aml_consents(status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_consents_subject_created_at ON aml_consents(subject_national_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_consents_type ON aml_consents(consent_type);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS aml_rules (
        rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_name TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'enabled',
        severity TEXT NOT NULL DEFAULT 'medium',
        expression TEXT NOT NULL,
        description TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_aml_rules_status CHECK (status IN ('enabled','disabled')),
        CONSTRAINT chk_aml_rules_severity CHECK (severity IN ('low','medium','high','critical'))
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_aml_rules_rule_name ON aml_rules(rule_name);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_rules_status_created_at ON aml_rules(status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_rules_type ON aml_rules(rule_type);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS aml_alerts (
        alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject_national_id TEXT,
        rule_id UUID,
        status TEXT NOT NULL DEFAULT 'open',
        severity TEXT NOT NULL DEFAULT 'medium',
        title TEXT NOT NULL,
        details JSONB,
        assigned_to TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_aml_alerts_status CHECK (status IN ('open','in_review','cleared','escalated','closed')),
        CONSTRAINT chk_aml_alerts_severity CHECK (severity IN ('low','medium','high','critical')),
        CONSTRAINT fk_aml_alerts_rule_id FOREIGN KEY (rule_id) REFERENCES aml_rules(rule_id) ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_alerts_status_created_at ON aml_alerts(status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_alerts_subject_created_at ON aml_alerts(subject_national_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_alerts_rule_id ON aml_alerts(rule_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_aml_alerts_assigned_to ON aml_alerts(assigned_to);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS aml_alerts;`);
    await queryRunner.query(`DROP TABLE IF EXISTS aml_rules;`);
    await queryRunner.query(`DROP TABLE IF EXISTS aml_consents;`);
  }
}
