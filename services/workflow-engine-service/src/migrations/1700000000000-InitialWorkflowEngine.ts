import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialWorkflowEngine1700000000000 implements MigrationInterface {
  name = 'InitialWorkflowEngine1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA || 'workflow';
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
    await queryRunner.query(`SET search_path TO "${schema}", public;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."process_definitions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid,
        "key" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "graph" jsonb NOT NULL,
        "status" character varying NOT NULL DEFAULT 'draft',
        "variables" jsonb,
        "version" integer,
        "effective_from" timestamptz,
        "effective_to" timestamptz,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" character varying,
        "updated_by" character varying,
        "deleted_at" timestamptz,
        CONSTRAINT "PK_process_definitions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_process_definitions_tenant_key_version" UNIQUE ("tenant_id", "key", "version")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_definitions_tenant" ON "${schema}"."process_definitions" ("tenant_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_definitions_key" ON "${schema}"."process_definitions" ("key");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_definitions_status" ON "${schema}"."process_definitions" ("tenant_id", "key", "status") WHERE "deleted_at" IS NULL;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."process_instances" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid,
        "definition_id" uuid NOT NULL,
        "business_key" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'running',
        "context" jsonb,
        "current_node" character varying,
        "error" jsonb,
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "cancelled_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "started_by" character varying,
        "cancelled_by" character varying,
        "metadata" jsonb,
        CONSTRAINT "PK_process_instances" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_process_instances_tenant_business_key" UNIQUE ("tenant_id", "business_key"),
        CONSTRAINT "FK_process_instances_definition" FOREIGN KEY ("definition_id") REFERENCES "${schema}"."process_definitions"("id") ON DELETE NO ACTION
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_instances_tenant_status" ON "${schema}"."process_instances" ("tenant_id", "status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_instances_business_key" ON "${schema}"."process_instances" ("tenant_id", "business_key");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."process_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid,
        "instance_id" uuid NOT NULL,
        "node_id" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'active',
        "parent_node_id" character varying,
        "scope" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "consumed_at" timestamptz,
        "metadata" jsonb,
        CONSTRAINT "PK_process_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_process_tokens_instance" FOREIGN KEY ("instance_id") REFERENCES "${schema}"."process_instances"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_tokens_instance_node" ON "${schema}"."process_tokens" ("instance_id", "node_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_tokens_status" ON "${schema}"."process_tokens" ("instance_id", "status");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."process_variables" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid,
        "instance_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "value" text NOT NULL,
        "type" character varying NOT NULL,
        "scope" character varying,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_process_variables" PRIMARY KEY ("id"),
        CONSTRAINT "FK_process_variables_instance" FOREIGN KEY ("instance_id") REFERENCES "${schema}"."process_instances"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_variables_instance_name" ON "${schema}"."process_variables" ("instance_id", "name");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."process_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid,
        "instance_id" uuid NOT NULL,
        "event_type" character varying NOT NULL,
        "node_id" character varying,
        "node_name" character varying,
        "data" jsonb,
        "result" jsonb,
        "error" jsonb,
        "execution_time" integer NOT NULL DEFAULT 0,
        "timestamp" timestamptz NOT NULL DEFAULT now(),
        "user_id" character varying,
        "metadata" jsonb,
        CONSTRAINT "PK_process_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_process_history_instance" FOREIGN KEY ("instance_id") REFERENCES "${schema}"."process_instances"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_history_instance_timestamp" ON "${schema}"."process_history" ("instance_id", "timestamp");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."process_timers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid,
        "instance_id" uuid NOT NULL,
        "node_id" character varying NOT NULL,
        "fire_at" timestamptz NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "fired_at" timestamptz,
        CONSTRAINT "PK_process_timers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_process_timers_instance" FOREIGN KEY ("instance_id") REFERENCES "${schema}"."process_instances"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_process_timers_pending" ON "${schema}"."process_timers" ("status", "fire_at");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."outbox_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "occurred_at" timestamptz NOT NULL DEFAULT now(),
        "topic" text NOT NULL,
        "event_type" text NOT NULL,
        "event_version" integer NOT NULL,
        "correlation_id" text NOT NULL,
        "subject_json" jsonb NOT NULL,
        "payload_json" jsonb NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "attempt_count" integer NOT NULL DEFAULT 0,
        "error_message" text,
        CONSTRAINT "PK_outbox_events" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_outbox_events_status_occurred" ON "${schema}"."outbox_events" ("status", "occurred_at");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_outbox_events_correlation" ON "${schema}"."outbox_events" ("correlation_id");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."consumed_events" (
        "event_id" uuid NOT NULL,
        "consumer_name" text NOT NULL,
        "consumed_at" timestamptz NOT NULL DEFAULT now(),
        "topic" text NOT NULL,
        "processed" boolean NOT NULL DEFAULT false,
        "error" text,
        "processed_at" timestamptz,
        CONSTRAINT "PK_consumed_events" PRIMARY KEY ("event_id", "consumer_name")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_consumed_events_consumed_at" ON "${schema}"."consumed_events" ("consumed_at");`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."dead_letter_queue" (
        "dlq_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "original_event_id" text NOT NULL,
        "topic" text NOT NULL,
        "partition" integer,
        "offset" text,
        "key" text,
        "value" jsonb NOT NULL,
        "headers" jsonb,
        "error_message" text NOT NULL,
        "error_stack" text,
        "consumer_group" text NOT NULL,
        "retry_count" integer NOT NULL DEFAULT 0,
        "max_retries" integer NOT NULL DEFAULT 3,
        "status" text NOT NULL DEFAULT 'pending',
        "next_retry_at" timestamptz,
        "last_error_at" timestamptz NOT NULL DEFAULT now(),
        "resolved_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dead_letter_queue" PRIMARY KEY ("dlq_id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_dead_letter_topic_status" ON "${schema}"."dead_letter_queue" ("topic", "status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_dead_letter_retry" ON "${schema}"."dead_letter_queue" ("retry_count", "next_retry_at");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_dead_letter_created_at" ON "${schema}"."dead_letter_queue" ("created_at");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DB_SCHEMA || 'workflow';
    for (const table of [
      'dead_letter_queue',
      'consumed_events',
      'outbox_events',
      'process_timers',
      'process_history',
      'process_variables',
      'process_tokens',
      'process_instances',
      'process_definitions',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${schema}"."${table}" CASCADE;`);
    }
    await queryRunner.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
  }
}
