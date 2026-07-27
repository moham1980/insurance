#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"

export PGPASSWORD

echo "[pg-restore-verify] verifying connection + basic tables"

psql "postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}" -v ON_ERROR_STOP=1 <<'SQL'
SELECT now() AS server_time;

-- Minimal smoke checks: schemas should exist; tables vary per installation.
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name IN (
  'auth','claims','payments','orchestrator','party','policy','documents','fraud','flags','complaints','regulatory','aml','reinsurance','product','reporting','monitoring'
)
ORDER BY schema_name;

-- Check at least one known audit table exists when services are migrated.
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN ('fraud_score_audit', 'kpi_ingestion_audit', 'dead_letter_queue')
ORDER BY table_schema, table_name;
SQL

echo "[pg-restore-verify] done"
