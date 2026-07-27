import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompletePartyKycSchema1700000000303 implements MigrationInterface {
  name = 'CompletePartyKycSchema1700000000303';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Drop old single-tenant indexes before migrating
    await queryRunner.query(`DROP INDEX IF EXISTS uq_parties_national_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_parties_type_created_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kyc_reviews_party_created_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kyc_reviews_status_created_at;`);

    // parties
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS parties (
        party_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        type TEXT NOT NULL,
        full_name TEXT NOT NULL,
        national_id TEXT NOT NULL,
        national_id_blind_index TEXT NOT NULL,
        mobile TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        global_user_id TEXT,
        aml_consent_status TEXT NOT NULL DEFAULT 'not_required',
        aml_consent_type TEXT,
        aml_consent_granted_at TIMESTAMPTZ,
        aml_consent_revoked_at TIMESTAMPTZ,
        aml_consent_valid_to TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Migrate existing parties table (from older migrations) to tenant-aware schema
    await queryRunner.query(`ALTER TABLE parties ADD COLUMN IF NOT EXISTS tenant_id TEXT;`);
    await queryRunner.query(`UPDATE parties SET tenant_id = 'legacy' WHERE tenant_id IS NULL;`);
    await queryRunner.query(`ALTER TABLE parties ALTER COLUMN tenant_id SET NOT NULL;`);

    await queryRunner.query(`ALTER TABLE parties ADD COLUMN IF NOT EXISTS national_id_blind_index TEXT;`);
    await queryRunner.query(`UPDATE parties SET national_id_blind_index = party_id::text WHERE national_id_blind_index IS NULL;`);
    await queryRunner.query(`ALTER TABLE parties ALTER COLUMN national_id_blind_index SET NOT NULL;`);

    await queryRunner.query(`ALTER TABLE parties ADD COLUMN IF NOT EXISTS aml_consent_status TEXT NOT NULL DEFAULT 'not_required';`);
    await queryRunner.query(`ALTER TABLE parties ADD COLUMN IF NOT EXISTS aml_consent_type TEXT;`);
    await queryRunner.query(`ALTER TABLE parties ADD COLUMN IF NOT EXISTS aml_consent_granted_at TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE parties ADD COLUMN IF NOT EXISTS aml_consent_revoked_at TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE parties ADD COLUMN IF NOT EXISTS aml_consent_valid_to TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE parties ADD COLUMN IF NOT EXISTS global_user_id TEXT;`);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_parties_tenant_national_id_blind_index ON parties(tenant_id, national_id_blind_index);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_parties_tenant_type_created_at ON parties(tenant_id, type, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_parties_tenant_aml_consent_status ON parties(tenant_id, aml_consent_status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_parties_tenant_global_user_id ON parties(tenant_id, global_user_id) WHERE global_user_id IS NOT NULL;`);

    // kyc_reviews
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kyc_reviews (
        kyc_review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        party_id UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        workflow_stage TEXT NOT NULL DEFAULT 'data_collection',
        reviewer_user_id TEXT,
        notes TEXT,
        decided_at TIMESTAMPTZ,
        risk_level TEXT,
        risk_score INTEGER,
        risk_factors JSONB,
        aml_screening_status TEXT DEFAULT 'not_started',
        pep_screening_status TEXT,
        sanctions_screening_status TEXT,
        adverse_media_status TEXT,
        screening_results JSONB,
        screened_at TIMESTAMPTZ,
        document_status TEXT DEFAULT 'not_submitted',
        document_types JSONB,
        document_verified_at TIMESTAMPTZ,
        escalation_reason TEXT,
        escalated_at TIMESTAMPTZ,
        escalated_to TEXT,
        due_date TIMESTAMPTZ,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Migrate existing kyc_reviews table to tenant-aware schema
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS tenant_id TEXT;`);
    await queryRunner.query(`UPDATE kyc_reviews SET tenant_id = 'legacy' WHERE tenant_id IS NULL;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ALTER COLUMN tenant_id SET NOT NULL;`);

    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS workflow_stage TEXT NOT NULL DEFAULT 'data_collection';`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS risk_level TEXT;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS risk_score INTEGER;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS risk_factors JSONB;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS aml_screening_status TEXT DEFAULT 'not_started';`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS pep_screening_status TEXT;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS sanctions_screening_status TEXT;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS adverse_media_status TEXT;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS screening_results JSONB;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS screened_at TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS document_status TEXT DEFAULT 'not_submitted';`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS document_types JSONB;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS document_verified_at TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS escalation_reason TEXT;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS escalated_to TEXT;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;`);
    await queryRunner.query(`UPDATE kyc_reviews SET version = 1 WHERE version IS NULL;`);
    await queryRunner.query(`ALTER TABLE kyc_reviews ALTER COLUMN version SET NOT NULL;`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kyc_reviews_tenant_party_created_at ON kyc_reviews(tenant_id, party_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kyc_reviews_tenant_status_created_at ON kyc_reviews(tenant_id, status, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kyc_reviews_tenant_risk_workflow ON kyc_reviews(tenant_id, risk_level, workflow_stage);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kyc_reviews_tenant_aml_screening ON kyc_reviews(tenant_id, aml_screening_status);`);

    // document_trust_chain
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_trust_chain (
        entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        party_id UUID NOT NULL,
        document_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        verified_at TIMESTAMPTZ,
        verified_by TEXT,
        verification_method TEXT NOT NULL,
        trust_level TEXT NOT NULL DEFAULT 'low',
        hash TEXT NOT NULL,
        previous_hash TEXT,
        chain_position INTEGER NOT NULL
      );
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_document_trust_chain_tenant_party_position ON document_trust_chain(tenant_id, party_id, chain_position);`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_document_trust_chain_tenant_party_document ON document_trust_chain(tenant_id, party_id, document_id);`);

    // identity_proofing_record
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS identity_proofing_record (
        proofing_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        party_id UUID NOT NULL,
        face_match_score FLOAT NOT NULL,
        face_match_threshold FLOAT NOT NULL,
        dedup_match_found BOOLEAN NOT NULL,
        dedup_match_ids JSONB,
        liveness_check BOOLEAN NOT NULL,
        document_authenticity BOOLEAN NOT NULL,
        confidence_score FLOAT NOT NULL,
        status TEXT NOT NULL,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_identity_proofing_tenant_party ON identity_proofing_record(tenant_id, party_id);`);

    // external_verification_request
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS external_verification_request (
        request_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        party_id UUID NOT NULL,
        service_type VARCHAR NOT NULL,
        provider_name VARCHAR,
        provider_request_id VARCHAR,
        request_payload JSONB NOT NULL,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status VARCHAR DEFAULT 'pending',
        response_payload JSONB,
        completed_at TIMESTAMPTZ,
        error_message TEXT
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_external_verification_tenant_party ON external_verification_request(tenant_id, party_id);`);

    // kyc_exception
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kyc_exception (
        exception_id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        party_id UUID NOT NULL,
        kyc_review_id TEXT NOT NULL,
        exception_type VARCHAR NOT NULL,
        severity VARCHAR DEFAULT 'medium',
        description TEXT NOT NULL,
        raised_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        raised_by TEXT NOT NULL,
        assigned_to TEXT,
        status VARCHAR DEFAULT 'pending',
        resolution_notes TEXT,
        resolved_at TIMESTAMPTZ,
        resolved_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kyc_exception_tenant_party ON kyc_exception(tenant_id, party_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kyc_exception_tenant_status ON kyc_exception(tenant_id, status);`);

    // consent_records
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS consent_records (
        consent_record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        party_id UUID NOT NULL,
        consent_type TEXT NOT NULL,
        purpose TEXT NOT NULL,
        legal_basis TEXT NOT NULL,
        status TEXT NOT NULL,
        action TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        channel TEXT NOT NULL,
        evidence JSONB,
        revoke_reason TEXT,
        valid_to TIMESTAMPTZ,
        version INTEGER DEFAULT 1,
        previous_record_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_consent_records_tenant_party_created_at ON consent_records(tenant_id, party_id, created_at);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_consent_records_tenant_consent_type_status ON consent_records(tenant_id, consent_type, status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS consent_records;`);
    await queryRunner.query(`DROP TABLE IF EXISTS kyc_exception;`);
    await queryRunner.query(`DROP TABLE IF EXISTS external_verification_request;`);
    await queryRunner.query(`DROP TABLE IF EXISTS identity_proofing_record;`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_trust_chain;`);
    await queryRunner.query(`DROP TABLE IF EXISTS kyc_reviews;`);
    await queryRunner.query(`DROP TABLE IF EXISTS parties;`);
  }
}
