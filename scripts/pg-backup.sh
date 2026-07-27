#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"

mkdir -p "${BACKUP_DIR}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${BACKUP_DIR}/${PGDATABASE}_${TS}.dump"

export PGPASSWORD

echo "[pg-backup] starting backup"
echo "[pg-backup] host=${PGHOST} port=${PGPORT} db=${PGDATABASE} user=${PGUSER}"
echo "[pg-backup] out=${OUT_FILE}"

pg_dump \
  --host "${PGHOST}" \
  --port "${PGPORT}" \
  --username "${PGUSER}" \
  --format=custom \
  --compress=6 \
  --file "${OUT_FILE}" \
  "${PGDATABASE}"

echo "[pg-backup] backup completed"

if [[ "${RETENTION_DAYS}" =~ ^[0-9]+$ ]] && [[ "${RETENTION_DAYS}" -gt 0 ]]; then
  echo "[pg-backup] pruning backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}"
  find "${BACKUP_DIR}" -type f -name "${PGDATABASE}_*.dump" -mtime "+${RETENTION_DAYS}" -print -delete || true
fi

echo "[pg-backup] done"
