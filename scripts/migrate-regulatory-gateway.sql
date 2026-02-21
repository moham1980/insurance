-- Migration for Sprint 7: Regulatory Gateway (Sanhab webhook simulation)

CREATE TABLE IF NOT EXISTS sanhab_events (
  sanhab_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'sanhab',
  correlation_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sanhab_events_external_event_id ON sanhab_events(external_event_id);
CREATE INDEX IF NOT EXISTS idx_sanhab_events_type_received_at ON sanhab_events(event_type, received_at);
