import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSharedTables1720000000000 implements MigrationInterface {
  name = 'AddSharedTables1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS outbox_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        topic TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_version INT NOT NULL,
        correlation_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL DEFAULT 'unknown',
        subject_json JSONB NOT NULL DEFAULT '{}',
        payload_json JSONB NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending',
        attempt_count INT NOT NULL DEFAULT 0,
        error_message TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_outbox_status_occurred ON outbox_events(status, occurred_at);
      CREATE INDEX IF NOT EXISTS idx_outbox_correlation ON outbox_events(correlation_id);

      ALTER TABLE outbox_events
        ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'unknown';

      UPDATE outbox_events
      SET tenant_id = COALESCE(subject_json ->> 'tenantId', subject_json ->> 'tenant_id', 'unknown')
      WHERE tenant_id = 'unknown';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS consumed_events (
        event_id UUID NOT NULL,
        consumer_name TEXT NOT NULL,
        tenant_id TEXT NOT NULL DEFAULT 'unknown',
        consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        topic TEXT NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT false,
        error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_consumed_events_consumed_at ON consumed_events(consumed_at);

      DO $$
      DECLARE
        has_column boolean;
        has_pk boolean;
        has_old_pk boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'consumed_events' AND column_name = 'tenant_id'
        ) INTO has_column;

        IF NOT has_column THEN
          ALTER TABLE consumed_events ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'unknown';
        END IF;

        SELECT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'consumed_events_event_consumer_tenant_pk'
            AND conrelid = 'consumed_events'::regclass
        ) INTO has_pk;

        IF NOT has_pk THEN
          SELECT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'consumed_events_pkey'
              AND conrelid = 'consumed_events'::regclass
          ) INTO has_old_pk;

          IF has_old_pk THEN
            ALTER TABLE consumed_events DROP CONSTRAINT consumed_events_pkey;
          END IF;

          ALTER TABLE consumed_events
            ADD CONSTRAINT consumed_events_event_consumer_tenant_pk
            PRIMARY KEY (event_id, consumer_name, tenant_id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dead_letter_queue (
        dlq_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_event_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        tenant_id TEXT NOT NULL DEFAULT 'unknown',
        partition INT,
        offset TEXT,
        key TEXT,
        value JSONB NOT NULL DEFAULT '{}',
        headers JSONB,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        consumer_group TEXT NOT NULL,
        retry_count INT NOT NULL DEFAULT 0,
        max_retries INT NOT NULL DEFAULT 3,
        status TEXT NOT NULL DEFAULT 'pending',
        next_retry_at TIMESTAMPTZ,
        last_error_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_dlq_topic_status ON dead_letter_queue(topic, status);
      CREATE INDEX IF NOT EXISTS idx_dlq_retry_next ON dead_letter_queue(retry_count, next_retry_at);
      CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON dead_letter_queue(created_at);
    `);

    await queryRunner.query(`
      ALTER TABLE dead_letter_queue ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'unknown';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS consent_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id TEXT NOT NULL,
        tenant_id TEXT,
        purpose TEXT NOT NULL,
        status TEXT NOT NULL,
        granted_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ,
        consent_text TEXT NOT NULL,
        version TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_consent_customer_purpose ON consent_records(customer_id, purpose);
      CREATE INDEX IF NOT EXISTS idx_consent_status ON consent_records(status);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS data_lineage_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        source_system TEXT NOT NULL,
        source_entity TEXT NOT NULL,
        source_entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        target_system TEXT,
        target_entity TEXT,
        target_entity_id TEXT,
        transformation TEXT,
        user_id TEXT,
        tenant_id TEXT,
        metadata JSONB
      );

      CREATE INDEX IF NOT EXISTS idx_lineage_source ON data_lineage_events(source_system, source_entity, source_entity_id);
      CREATE INDEX IF NOT EXISTS idx_lineage_target ON data_lineage_events(target_system, target_entity, target_entity_id);
      CREATE INDEX IF NOT EXISTS idx_lineage_tenant ON data_lineage_events(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_lineage_operation ON data_lineage_events(operation);
      CREATE INDEX IF NOT EXISTS idx_lineage_timestamp ON data_lineage_events(timestamp);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS data_lineage_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS consent_records;`);
    await queryRunner.query(`DROP TABLE IF EXISTS dead_letter_queue;`);
    await queryRunner.query(`DROP TABLE IF EXISTS consumed_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS outbox_events;`);
  }
}
