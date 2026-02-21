-- Migration for Sprint 6: Dead Letter Queue

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  dlq_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_event_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  partition INTEGER,
  offset TEXT,
  key TEXT,
  value JSONB NOT NULL,
  headers JSONB,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  consumer_group TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending',
  next_retry_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dlq_topic_status ON dead_letter_queue(topic, status);
CREATE INDEX IF NOT EXISTS idx_dlq_retry_count_next_retry ON dead_letter_queue(retry_count, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON dead_letter_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_dlq_consumer_group ON dead_letter_queue(consumer_group);
