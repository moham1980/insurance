import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFraudCoreTables1700000000304 implements MigrationInterface {
  name = 'CreateFraudCoreTables1700000000304';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Enums
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_case_status') THEN
          CREATE TYPE fraud_case_status AS ENUM ('open', 'investigating', 'confirmed', 'cleared', 'closed');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_ml_model_type') THEN
          CREATE TYPE fraud_ml_model_type AS ENUM ('binary_classification', 'multi_class_classification', 'regression', 'anomaly_detection');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_ml_model_status') THEN
          CREATE TYPE fraud_ml_model_status AS ENUM ('training', 'trained', 'deployed', 'deprecated', 'failed');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_relationship_type') THEN
          CREATE TYPE fraud_relationship_type AS ENUM (
            'claimant', 'insured', 'beneficiary', 'witness', 'driver', 'owner', 'policyholder',
            'agent', 'adjuster', 'same_address', 'same_phone', 'same_email', 'same_bank_account',
            'related_party', 'family_member', 'business_associate'
          );
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_irregularity_pattern') THEN
          CREATE TYPE fraud_irregularity_pattern AS ENUM (
            'multiple_claims_short_period', 'same_party_multiple_claims', 'rapid_policy_issuance_claim',
            'suspicious_document_timing', 'unusual_claim_amount', 'geographic_pattern_anomaly',
            'frequent_address_changes', 'repeated_loss_type', 'unusual_time_pattern', 'suspicious_provider_pattern'
          );
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_alert_severity') THEN
          CREATE TYPE fraud_alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_alert_status') THEN
          CREATE TYPE fraud_alert_status AS ENUM ('new', 'investigating', 'confirmed', 'false_positive', 'dismissed');
        END IF;
      END $$;
    `);

    // fraud_cases
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fraud_cases (
        fraud_case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        claim_id UUID NOT NULL,
        claimant_id UUID,
        claim_number TEXT NOT NULL,
        policy_id UUID,
        party_id UUID,
        loss_type TEXT,
        amount NUMERIC,
        claim_amount NUMERIC,
        score NUMERIC NOT NULL,
        signals JSONB,
        status fraud_case_status NOT NULL DEFAULT 'open',
        assigned_to TEXT,
        hold_claim BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_cases_claim_id ON fraud_cases(claim_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_cases_status_created_at ON fraud_cases(status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_cases_tenant_status ON fraud_cases(tenant_id, status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_cases_claimant_id ON fraud_cases(claimant_id);`);

    // fraud_ml_models
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fraud_ml_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        model_name VARCHAR(100) NOT NULL,
        model_version VARCHAR(50) NOT NULL,
        model_type fraud_ml_model_type NOT NULL,
        status fraud_ml_model_status NOT NULL DEFAULT 'training',
        description TEXT,
        model_config JSONB NOT NULL,
        training_metrics JSONB,
        validation_metrics JSONB,
        model_path TEXT,
        feature_importance JSONB,
        training_data_summary JSONB,
        trained_by VARCHAR(50),
        trained_at TIMESTAMP,
        deployed_at TIMESTAMP,
        is_default BOOLEAN NOT NULL DEFAULT false,
        min_confidence_threshold DECIMAL(5,2),
        hold_threshold DECIMAL(5,2),
        algorithm VARCHAR(50),
        hyperparameters JSONB,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_ml_models_tenant_status ON fraud_ml_models(tenant_id, status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_ml_models_tenant_type ON fraud_ml_models(tenant_id, model_type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_ml_models_default ON fraud_ml_models(tenant_id, is_default) WHERE is_default = true;`);

    // fraud_graph_entities
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fraud_graph_entities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        entity_name VARCHAR(100) NOT NULL,
        description TEXT,
        attributes JSONB,
        connection_count INTEGER NOT NULL DEFAULT 0,
        fraud_case_count INTEGER NOT NULL DEFAULT 0,
        risk_score DECIMAL(5,2) NOT NULL DEFAULT 0,
        is_high_risk BOOLEAN NOT NULL DEFAULT false,
        last_activity_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_graph_entities_tenant_type ON fraud_graph_entities(tenant_id, entity_type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_graph_entities_tenant_entity_id ON fraud_graph_entities(tenant_id, entity_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_graph_entities_high_risk ON fraud_graph_entities(is_high_risk, risk_score DESC);`);

    // fraud_graph_relationships
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fraud_graph_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        source_entity_id UUID NOT NULL,
        target_entity_id UUID NOT NULL,
        relationship_type fraud_relationship_type NOT NULL,
        description TEXT,
        weight DECIMAL(5,2),
        interaction_count INTEGER NOT NULL DEFAULT 0,
        first_interaction_at TIMESTAMP,
        last_interaction_at TIMESTAMP,
        attributes JSONB,
        is_suspicious BOOLEAN NOT NULL DEFAULT false,
        suspicion_reason TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_graph_rel_tenant_source ON fraud_graph_relationships(tenant_id, source_entity_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_graph_rel_tenant_target ON fraud_graph_relationships(tenant_id, target_entity_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_graph_rel_tenant_type ON fraud_graph_relationships(tenant_id, relationship_type);`);

    // fraud_irregularity_alerts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fraud_irregularity_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        claim_id UUID NOT NULL,
        pattern_type fraud_irregularity_pattern NOT NULL,
        severity fraud_alert_severity NOT NULL,
        status fraud_alert_status NOT NULL DEFAULT 'new',
        description TEXT NOT NULL,
        detection_details JSONB NOT NULL,
        recommendations JSONB,
        notes TEXT,
        assigned_to UUID,
        assigned_at TIMESTAMP,
        resolved_at TIMESTAMP,
        resolved_by UUID,
        resolution_notes TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_irreg_alerts_tenant_status ON fraud_irregularity_alerts(tenant_id, status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_irreg_alerts_tenant_severity ON fraud_irregularity_alerts(tenant_id, severity);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_irreg_alerts_tenant_pattern ON fraud_irregularity_alerts(tenant_id, pattern_type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_irreg_alerts_claim_id ON fraud_irregularity_alerts(claim_id);`);

    // outbox_events
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS outbox_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        topic TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_version INTEGER NOT NULL,
        correlation_id TEXT NOT NULL,
        subject_json JSONB NOT NULL,
        payload_json JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_status_occurred_at ON outbox_events(status, occurred_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_correlation_id ON outbox_events(correlation_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS outbox_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS fraud_irregularity_alerts;`);
    await queryRunner.query(`DROP TABLE IF EXISTS fraud_graph_relationships;`);
    await queryRunner.query(`DROP TABLE IF EXISTS fraud_graph_entities;`);
    await queryRunner.query(`DROP TABLE IF EXISTS fraud_ml_models;`);
    await queryRunner.query(`DROP TABLE IF EXISTS fraud_cases;`);

    await queryRunner.query(`DROP TYPE IF EXISTS fraud_alert_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS fraud_alert_severity;`);
    await queryRunner.query(`DROP TYPE IF EXISTS fraud_irregularity_pattern;`);
    await queryRunner.query(`DROP TYPE IF EXISTS fraud_relationship_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS fraud_ml_model_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS fraud_ml_model_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS fraud_case_status;`);
  }
}
