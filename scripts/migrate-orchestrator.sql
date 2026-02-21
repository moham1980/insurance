-- Migration for Sprint 5: Orchestrator + HITL
-- Saga instances and Work Items

CREATE TABLE IF NOT EXISTS saga_instances (
  saga_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_type TEXT NOT NULL,
  status TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  claim_id UUID,
  policy_id UUID,
  current_step TEXT NOT NULL,
  completed_steps TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  context JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_saga_instances_saga_type_status ON saga_instances(saga_type, status);
CREATE INDEX IF NOT EXISTS idx_saga_instances_correlation_id ON saga_instances(correlation_id);
CREATE INDEX IF NOT EXISTS idx_saga_instances_created_at ON saga_instances(created_at);

CREATE TABLE IF NOT EXISTS work_items (
  work_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_id UUID NOT NULL,
  step_name TEXT NOT NULL,
  work_item_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  claim_id UUID,
  policy_id UUID,
  assigned_to TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  context JSONB,
  decision_notes TEXT,
  decided_by TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_work_items_saga_id ON work_items(saga_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status_created ON work_items(status, created_at);
CREATE INDEX IF NOT EXISTS idx_work_items_assigned_to ON work_items(assigned_to);
