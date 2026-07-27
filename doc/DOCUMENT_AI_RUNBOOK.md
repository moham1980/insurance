# Document-AI Operational Runbook (Enterprise)

## Scope

This runbook covers operational procedures for the Document-AI pipeline and Eval Suite.

In-scope components (per current repo implementation):

- `api-gateway` (propagates `X-Correlation-Id`)
- `document-ai-service`
  - Kafka consumer: enqueue only (idempotent via `ConsumedEvent`/`dedupe_key`)
  - DB-backed job queue worker: extraction with retry/backoff and DLQ (`dead_letter`)
  - Audit trail: `document_ai.document_ai_audit`
  - Usage/cost accounting: `document_ai.document_ai_usage_daily`
  - Eval suite: cases/runs/results + `DocumentAiEvalWorker` + ops APIs + web-ui tab

Out-of-scope (handled by other runbooks):

- Deployment steps (see `doc/DEPLOY_RUNBOOK.md`)
- Postgres backup/restore/DR (see `doc/DEPLOY_RUNBOOK.md`)

## Contracts / Invariants

- All HTTP responses follow the contract:
  - `success: boolean`
  - `data?: any`
  - `error?: { code: string; message: string }`
  - `correlationId?: string`
- `X-Correlation-Id` is accepted inbound and echoed outbound.
- Document-AI operations must be:
  - Idempotent at ingestion (Kafka → DB enqueue)
  - Retry-safe at worker level
  - Traceable via `correlationId`

## Key Tables / Schemas (Postgres)

Schema: `document_ai`

- `document_ai_jobs`
  - job lifecycle + retry + backoff + DLQ state
- `document_ai_audit`
  - decision trail (`extracted`, `needs_review`, `failed`)
- `document_ai_usage_daily`
  - tenant-level daily accounting / cost guardrails
- Eval suite:
  - `document_ai_eval_cases`
  - `document_ai_eval_runs`
  - `document_ai_eval_results`

## Key Environment Variables

- Extraction/cost guardrails:
  - `DOCUMENT_AI_TENANT_DAILY_JOB_LIMIT`
  - `DOCUMENT_AI_TENANT_DAILY_REQUEST_LIMIT`
  - `DOCUMENT_AI_CONFIDENCE_THRESHOLD`
- Job worker runtime:
  - `DOCUMENT_AI_WORKER_ENABLED` (default: `true`)
  - `DOCUMENT_AI_POLL_INTERVAL_MS` (default: `1000`)
  - `DOCUMENT_AI_BATCH_SIZE` (default: `5`, max enforced: `50`)
  - `DOCUMENT_AI_LOCK_TTL_MS` (default: `600000`)
  - `DOCUMENT_AI_RETRY_BASE_MS` (default: `1000`)
  - `DOCUMENT_AI_RETRY_MAX_MS` (default: `60000`)
  - `WORKER_ID` (optional; used for `locked_by`)
- Eval worker runtime:
  - `DOCUMENT_AI_EVAL_WORKER_ENABLED` (default: `true`)
  - `DOCUMENT_AI_EVAL_POLL_INTERVAL_MS` (default: `2000`)
  - `DOCUMENT_AI_EVAL_MAX_CASES` (default: `50`, clamp 1..500)
  - `DOCUMENT_AI_EVAL_WORKER_ID` (optional)
- DB:
  - `DB_HOST`, `DB_PORT`, `DB_USERNAME|DB_USER`, `DB_PASSWORD`, `DB_DATABASE|DB_NAME`, `DB_SCHEMA`
- Kafka (if enabled for consumer/outbox):
  - `KAFKA_BROKERS`

## Observability / What to Check First

### 1) Correlation-driven triage

When investigating an incident, start from a single `correlationId`:

- From UI error banner (web-ui surfaces `correlationId`)
- From gateway header `X-Correlation-Id`
- From service logs (Document-AI audit logger)

Then correlate across:

- `document-ai-service` logs
- `document_ai.document_ai_jobs` row(s)
- `document_ai.document_ai_audit` decisions
- `document_ai.document_ai_usage_daily` for limit breaches

### 2) Primary health indicators

- Job queue depth and age (`pending`/`retry` backlog + `processing` volume + `dead_letter`)
- Rate of retries and repeated failures
- DLQ growth rate
- Tenant usage approaching limits
- Eval run success/failure rate and score regression

## Failure Modes and Playbooks

## Data Model: Job statuses and key columns (Authoritative)

The authoritative job status enum in code is:

- `pending`
- `processing`
- `retry`
- `dead_letter`
- `completed`

Key columns on `document_ai.document_ai_jobs` used for operations:

- `job_id` (uuid)
- `status`
- `attempt`, `max_attempts`
- `next_run_at`
- `locked_at`, `locked_by`
- `last_error_message`, `last_error_stack`
- `dlq_reason`
- `document_id`, `tenant_id`, `correlation_id`, `traceparent`

Notes:

- The worker claims jobs by selecting `status IN ('pending','retry')` with `next_run_at <= now()` and lock-expiry logic.
- Retry scheduling uses exponential backoff with jitter and updates `next_run_at`.
- DLQ is represented as `status='dead_letter'` with `dlq_reason='MAX_ATTEMPTS_EXCEEDED'`.

### A) Jobs stuck in `queued` (no progress)

**Symptoms**

- UI Jobs tab shows many `pending`/`retry` jobs, no progress toward `completed`
- No recent `DocumentAiJobWorker` activity

**Likely causes**

- Worker not running / crash loop
- DB connectivity issue
- Lock contention or long-running transaction

**Actions**

- Validate service process is up.
- Check DB connectivity from service.
- Inspect worker logs for polling loop errors.
- Sample jobs:
  - inspect `attempt`, `next_run_at` (if present), and timestamps.

**Mitigation**

- Restart worker after fixing root cause.

Implementation note:

- There is no `queued` status in the current implementation; use `pending`/`retry` as “queued states”.
- If backlog is large, consider controlled scaling (only if system supports it safely).

### B) Jobs repeatedly failing and retrying

**Symptoms**

- Increasing `attempt`
- Error messages stable across attempts

**Likely causes**

- Upstream model/provider outage
- Bad input document
- Schema prompt incompatibility

**Actions**

- Use a representative jobId and pull details via ops API.
- Check `lastErrorMessage/lastErrorStack`.
- Confirm tenant limits are not being hit (limit errors should be explicit).

**Mitigation**

- If provider outage: temporarily reduce concurrency / switch fallback provider if configured.
- If bad input: mark for manual review (do not keep retrying indefinitely).

### C) DLQ growth (`dead_letter`)

**Symptoms**

- DLQ UI shows new entries
- `document_ai_jobs.status = dead_letter`

**Actions**

- Categorize by error code/message.
- Identify whether the failures are:
  - deterministic (bad data)
  - transient (provider/network)
  - systemic (deploy regression)

**Mitigation policy**

- Deterministic failures:
  - do not retry automatically
  - route to manual review workflow
- Transient failures:
  - fix upstream cause then perform controlled retry (batch size limited)

Implementation note:

- Current API provides retry per job via `PATCH /document-ai/jobs/:jobId/retry` (no bulk retry endpoint).

### D) Tenant cost guardrail triggered

**Symptoms**

- Errors with codes:
  - `TENANT_DAILY_JOB_LIMIT_EXCEEDED`
  - `TENANT_DAILY_REQUEST_LIMIT_EXCEEDED`

**Actions**

- Verify daily usage row in `document_ai_usage_daily`.
- Confirm whether traffic spike is legitimate or abuse.

**Mitigation**

- Short-term:
  - temporarily raise limits for the tenant only (policy/approval required)
- Long-term:
  - introduce rate limiting at gateway
  - adjust batching / prioritization

### E) Eval run failures (`document_ai_eval_runs.status = failed`)

**Symptoms**

- Run status failed
- Many results with `errorMessage`

**Actions**

- Pull run details via `GET /document-ai/eval/runs/:runId`.
- Inspect results page for systematic errors.
- Compare to last successful run (if stored externally).

**Mitigation**

- If extraction provider changed: validate prompts and schema.
- If regression: roll back provider/model config or block deployment.

## Safe Retry / Reprocessing Policy

- Prefer explicit operator action (UI) for retries.
- Use confirmation strings for destructive/high-cost actions.
- Always require a `correlationId` for operator actions (from UI).

Authoritative retry mechanism (current implementation):

- Endpoint: `PATCH /document-ai/jobs/:jobId/retry`
  - Resets job to:
    - `status='retry'`
    - `next_run_at=NOW()`
    - clears `locked_at/locked_by`, clears last error fields
  - Operator safety:
    - UI uses confirmation string `RETRY {jobId}`

No bulk retry endpoint exists currently; bulk actions must be performed carefully via controlled operator workflow.

## Operational SQL Queries (Copy/Paste)

All queries assume schema `document_ai`.

### 1) Queue depth by status

```sql
SELECT status, COUNT(*) AS count
FROM document_ai.document_ai_jobs
GROUP BY status
ORDER BY status;
```

### 2) Oldest pending/retry jobs (backlog age)

```sql
SELECT job_id, status, attempt, max_attempts, created_at, next_run_at, document_id, tenant_id, correlation_id
FROM document_ai.document_ai_jobs
WHERE status IN ('pending','retry')
ORDER BY created_at ASC
LIMIT 50;
```

### 3) Jobs currently locked (possible stuck locks)

```sql
SELECT job_id, status, locked_at, locked_by, updated_at, document_id, correlation_id
FROM document_ai.document_ai_jobs
WHERE locked_at IS NOT NULL
ORDER BY locked_at ASC
LIMIT 50;
```

### 4) DLQ sample (latest)

```sql
SELECT job_id, status, dlq_reason, attempt, max_attempts, last_error_message, updated_at, document_id, tenant_id, correlation_id
FROM document_ai.document_ai_jobs
WHERE status = 'dead_letter'
ORDER BY updated_at DESC
LIMIT 50;
```

### 5) Retry storm detection (high attempt but not dead_letter)

```sql
SELECT job_id, status, attempt, max_attempts, next_run_at, last_error_message, updated_at
FROM document_ai.document_ai_jobs
WHERE status IN ('retry','processing')
  AND attempt >= 3
ORDER BY updated_at DESC
LIMIT 50;
```

### 6) Tenant usage limits (daily)

```sql
SELECT tenant_id, usage_date, jobs_started, jobs_completed, jobs_failed, ai_requests, approx_input_chars, approx_output_chars
FROM document_ai.document_ai_usage_daily
ORDER BY usage_date DESC, tenant_id ASC
LIMIT 200;
```

### 7) Audit trail for a document

```sql
SELECT audit_id, document_id, decision, correlation_id, created_at
FROM document_ai.document_ai_audit
WHERE document_id = $1
ORDER BY created_at DESC;
```

### 8) Eval runs status

Eval run status enum in code:

- `queued`
- `running`
- `completed`
- `failed`

```sql
SELECT run_id, status, created_at, started_at, finished_at, error_message
FROM document_ai.document_ai_eval_runs
ORDER BY created_at DESC
LIMIT 50;
```

### 9) Eval results summary per run

```sql
SELECT
  run_id,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) AS errored,
  AVG(NULLIF(score, '')::float) AS avg_score
FROM document_ai.document_ai_eval_results
WHERE run_id = $1
GROUP BY run_id;
```

### 10) Worst results in a run

```sql
SELECT result_id, case_id, document_id, score, error_message, created_at
FROM document_ai.document_ai_eval_results
WHERE run_id = $1
ORDER BY (NULLIF(score, '')::float) ASC NULLS LAST, created_at DESC
LIMIT 50;
```

## On-Call / Incident Response Template

- Incident start time (UTC):
- Services impacted:
- Tenant(s) impacted:
- Example correlationId(s):
- Customer impact summary:
- Suspected root cause:
- Immediate mitigation:
- Follow-up actions (ticket links):

## Verification / Smoke Checks

After any incident mitigation:

- Confirm queue resumes (`pending`/`retry` decreases, `completed` increases).
- Confirm DLQ not increasing.
- Confirm audit trail entries are created.
- Confirm `usage_daily` updates.
- Run a small Eval run (limited cases) to validate extraction path.
