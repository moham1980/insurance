-- Migration for Sprint 3: Fraud Triage
-- Add fraud_cases table

CREATE TABLE IF NOT EXISTS fraud_cases (
  fraud_case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  claim_number TEXT NOT NULL,
  score NUMERIC NOT NULL,
  signals JSONB,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  hold_claim BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_cases_claim_id ON fraud_cases(claim_id);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_status_created ON fraud_cases(status, created_at);
