-- Create outbox_events table
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

-- Create indexes for outbox_events
CREATE INDEX IF NOT EXISTS idx_outbox_status_occurred ON outbox_events(status, occurred_at);
CREATE INDEX IF NOT EXISTS idx_outbox_correlation ON outbox_events(correlation_id);

-- Create consumed_events table
CREATE TABLE IF NOT EXISTS consumed_events (
  event_id UUID NOT NULL,
  consumer_name TEXT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  topic TEXT NOT NULL,
  PRIMARY KEY (event_id, consumer_name)
);

-- Create index for consumed_events
CREATE INDEX IF NOT EXISTS idx_consumed_consumed_at ON consumed_events(consumed_at);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number TEXT NOT NULL UNIQUE,
  policy_id UUID NOT NULL,
  claimant_party_id UUID NOT NULL,
  loss_date TIMESTAMPTZ NOT NULL,
  loss_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'registered',
  assessed_amount NUMERIC,
  approved_amount NUMERIC,
  paid_amount NUMERIC,
  requires_human_triage BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for claims
CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_status_updated ON claims(status, updated_at);

-- Read model for Claims dashboard
CREATE TABLE IF NOT EXISTS rm_claims_cases (
  claim_id UUID PRIMARY KEY,
  claim_number TEXT NOT NULL,
  policy_id UUID NOT NULL,
  status TEXT NOT NULL,
  loss_date TIMESTAMPTZ,
  loss_type TEXT,
  requires_human_triage BOOLEAN,
  created_at TIMESTAMPTZ,
  last_event_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rm_claims_policy_id ON rm_claims_cases(policy_id);
CREATE INDEX IF NOT EXISTS idx_rm_claims_status_updated ON rm_claims_cases(status, updated_at);
