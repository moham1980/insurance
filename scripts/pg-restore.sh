#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${DUMP_FILE:?DUMP_FILE is required (path to .dump file)}"

export PGPASSWORD

if [[ ! -f "${DUMP_FILE}" ]]; then
  echo "[pg-restore] dump file not found: ${DUMP_FILE}" >&2
  exit 1
fi

echo "[pg-restore] restoring"
echo "[pg-restore] host=${PGHOST} port=${PGPORT} db=${PGDATABASE} user=${PGUSER}"
echo "[pg-restore] dump=${DUMP_FILE}"

# Note: this will DROP and recreate objects in the target database.
pg_restore \
  --host "${PGHOST}" \
  --port "${PGPORT}" \
  --username "${PGUSER}" \
  --dbname "${PGDATABASE}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${DUMP_FILE}"

echo "[pg-restore] done"
