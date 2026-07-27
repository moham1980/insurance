DO $do$
DECLARE
  s TEXT;
BEGIN
  FOR s IN SELECT DISTINCT schemaname FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','public') AND schemaname != 'payments' LOOP
    BEGIN
      EXECUTE format('CREATE TABLE IF NOT EXISTS %I.outbox_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          topic TEXT NOT NULL,
          event_type TEXT NOT NULL,
          event_version INT NOT NULL,
          correlation_id TEXT NOT NULL,
          subject_json JSONB NOT NULL DEFAULT ''{}'',
          payload_json JSONB NOT NULL DEFAULT ''{}'',
          status TEXT NOT NULL DEFAULT ''pending'',
          attempt_count INT NOT NULL DEFAULT 0,
          error_message TEXT
        )', s);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_outbox_status_occurred ON %I.outbox_events(status, occurred_at)', s, s);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_outbox_correlation ON %I.outbox_events(correlation_id)', s, s);
      RAISE NOTICE 'Created outbox_events in %', s;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed for %: %', s, SQLERRM;
    END;
  END LOOP;
END $do$;
