import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000200 implements MigrationInterface {
  name = 'Init1700000000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'public';

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".documents (
        document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        claim_id UUID,
        reconciliation_id UUID,
        document_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        storage_ref TEXT NOT NULL,
        mime_type TEXT,
        file_size INT,
        extracted_text TEXT,
        extracted_fields JSONB,
        status TEXT NOT NULL DEFAULT 'pending',
        metadata JSONB,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON "${schema}".documents(tenant_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_documents_claim_id ON "${schema}".documents(claim_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_documents_reconciliation_id ON "${schema}".documents(reconciliation_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_documents_status_created_at ON "${schema}".documents(status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_documents_tenant_status ON "${schema}".documents(tenant_id, status);`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "${schema}".update_documents_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_documents_updated_at ON "${schema}".documents;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_documents_updated_at
      BEFORE UPDATE ON "${schema}".documents
      FOR EACH ROW
      EXECUTE FUNCTION "${schema}".update_documents_updated_at();
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".outbox_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        topic TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_version INT NOT NULL,
        correlation_id TEXT NOT NULL,
        subject_json JSONB NOT NULL,
        payload_json JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempt_count INT NOT NULL DEFAULT 0,
        error_message TEXT
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_status_occurred_at ON "${schema}".outbox_events(status, occurred_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_outbox_events_correlation_id ON "${schema}".outbox_events(correlation_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".consumed_events (
        event_id UUID NOT NULL,
        consumer_name TEXT NOT NULL,
        consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        topic TEXT NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT false,
        error TEXT,
        processed_at TIMESTAMPTZ,
        PRIMARY KEY (event_id, consumer_name)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_consumed_events_consumed_at ON "${schema}".consumed_events(consumed_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}".dead_letter_queue (
        dlq_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_event_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        partition INT,
        offset TEXT,
        key TEXT,
        value JSONB NOT NULL,
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
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_topic_status ON "${schema}".dead_letter_queue(topic, status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_retry_count_next_retry_at ON "${schema}".dead_letter_queue(retry_count, next_retry_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_created_at ON "${schema}".dead_letter_queue(created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema || 'public';

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_documents_updated_at ON "${schema}".documents;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "${schema}".update_documents_updated_at();`);
    await queryRunner.query(`DROP TABLE IF EXISTS "${schema}".documents;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "${schema}".outbox_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "${schema}".consumed_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "${schema}".dead_letter_queue;`);
  }
}
