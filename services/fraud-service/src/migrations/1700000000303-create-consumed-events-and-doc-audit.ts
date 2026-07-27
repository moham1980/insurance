import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConsumedEventsAndDocAudit1700000000303 implements MigrationInterface {
  name = 'CreateConsumedEventsAndDocAudit1700000000303';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS consumed_events (
        event_id UUID NOT NULL,
        consumer_name TEXT NOT NULL,
        consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        topic TEXT NOT NULL,
        PRIMARY KEY (event_id, consumer_name)
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_consumed_events_consumed_at ON consumed_events(consumed_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fraud_document_attachment_audit (
        audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        document_type TEXT,
        source TEXT,
        storage_ref TEXT,
        correlation_id TEXT,
        tenant_id TEXT,
        actor_user_id TEXT,
        event_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_doc_audit_claim_created_at ON fraud_document_attachment_audit(claim_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_fraud_doc_audit_doc_created_at ON fraud_document_attachment_audit(document_id, created_at);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS fraud_document_attachment_audit;`);
    await queryRunner.query(`DROP TABLE IF EXISTS consumed_events;`);
  }
}
