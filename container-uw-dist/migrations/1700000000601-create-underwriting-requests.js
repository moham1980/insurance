"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUnderwritingRequests1700000000601 = void 0;
class CreateUnderwritingRequests1700000000601 {
    name = 'CreateUnderwritingRequests1700000000601';
    async up(queryRunner) {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS underwriting_requests (
        underwriting_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        policy_id UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reason_code TEXT NOT NULL,
        input JSONB,
        work_item_id UUID,
        work_item_saga_id UUID,
        decision TEXT,
        decision_notes TEXT,
        decided_by TEXT,
        decided_at TIMESTAMPTZ,
        result JSONB,
        due_date TIMESTAMPTZ,
        correlation_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_underwriting_requests_policy_created_at ON underwriting_requests(policy_id, created_at);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_underwriting_requests_status_created_at ON underwriting_requests(status, created_at);`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS underwriting_requests;`);
    }
}
exports.CreateUnderwritingRequests1700000000601 = CreateUnderwritingRequests1700000000601;
