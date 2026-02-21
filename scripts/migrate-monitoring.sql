-- Migration for Sprint 7: Monitoring & Alerting

CREATE TABLE IF NOT EXISTS metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  labels JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_service_metric_ts ON metrics(service_name, metric_name, timestamp);

CREATE TABLE IF NOT EXISTS slos (
  slo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  slo_name TEXT NOT NULL,
  description TEXT,
  target NUMERIC NOT NULL,
  "window" TEXT NOT NULL,
  current_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'healthy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slos_service_name_slo_name ON slos(service_name, slo_name);

CREATE TABLE IF NOT EXISTS alerts (
  alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slo_id UUID,
  service_name TEXT NOT NULL,
  alert_name TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'firing',
  value NUMERIC NOT NULL,
  threshold NUMERIC NOT NULL,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON alerts(status, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
