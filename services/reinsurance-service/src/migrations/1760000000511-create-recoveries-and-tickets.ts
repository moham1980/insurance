import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecoveriesAndTickets1760000000511 implements MigrationInterface {
  name = 'CreateRecoveriesAndTickets1760000000511';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS re_claim_recoveries (
        recovery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        treaty_id UUID NOT NULL,
        claim_id TEXT NOT NULL,
        policy_id TEXT,
        loss_date DATE,
        gross_loss_amount NUMERIC(18,2),
        ceded_loss_amount NUMERIC(18,2),
        recovered_amount NUMERIC(18,2),
        currency TEXT NOT NULL DEFAULT 'IRR',
        status TEXT NOT NULL DEFAULT 'open',
        next_follow_up_at TIMESTAMPTZ,
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_re_claim_recoveries_status CHECK (status IN ('open','in_collection','partially_collected','collected','written_off','closed')),
        CONSTRAINT fk_re_claim_recoveries_treaty FOREIGN KEY (treaty_id) REFERENCES re_treaties(treaty_id) ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_claim_recoveries_treaty_created_at ON re_claim_recoveries(treaty_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_claim_recoveries_status_created_at ON re_claim_recoveries(status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_claim_recoveries_claim_id ON re_claim_recoveries(claim_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS re_tickets (
        ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reconciliation_id UUID NOT NULL,
        reason_code TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        sla_response_due_at TIMESTAMPTZ,
        assigned_to TEXT,
        summary TEXT,
        resolved_at TIMESTAMPTZ,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_re_tickets_status CHECK (status IN ('open','in_review','resolved','rejected')),
        CONSTRAINT fk_re_tickets_reconciliation FOREIGN KEY (reconciliation_id) REFERENCES re_reconciliations(reconciliation_id) ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_tickets_reconciliation_created_at ON re_tickets(reconciliation_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_tickets_status_created_at ON re_tickets(status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_tickets_assigned_to ON re_tickets(assigned_to);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS re_ticket_messages (
        ticket_message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'internal',
        body TEXT NOT NULL,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_re_ticket_messages_type CHECK (message_type IN ('internal','external')),
        CONSTRAINT fk_re_ticket_messages_ticket FOREIGN KEY (ticket_id) REFERENCES re_tickets(ticket_id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_ticket_messages_ticket_created_at ON re_ticket_messages(ticket_id, created_at);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS re_ticket_attachments (
        ticket_attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL,
        document_id TEXT NOT NULL,
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_re_ticket_attachments_ticket FOREIGN KEY (ticket_id) REFERENCES re_tickets(ticket_id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_ticket_attachments_ticket_created_at ON re_ticket_attachments(ticket_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_re_ticket_attachments_document_id ON re_ticket_attachments(document_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS re_ticket_attachments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS re_ticket_messages;`);
    await queryRunner.query(`DROP TABLE IF EXISTS re_tickets;`);
    await queryRunner.query(`DROP TABLE IF EXISTS re_claim_recoveries;`);
  }
}
