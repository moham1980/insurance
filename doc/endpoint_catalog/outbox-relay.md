# Outbox Relay - Endpoint Catalog

**Service**: outbox-relay  
**Purpose**: Background worker for relaying outbox events to Kafka with retry and DLQ support  
**Base Path**: `/`

---

## Service Overview

The outbox-relay is a background worker service that implements the Outbox Pattern for reliable event publishing. It polls the database for pending outbox events, publishes them to Kafka, and handles retries with exponential backoff. Failed events are moved to a Dead Letter Queue (DLQ) after max attempts.

This service does not expose REST endpoints for business operations. It only provides a health check endpoint for monitoring.

---

## Key Features

1. **Outbox Pattern** - Ensures at-least-once delivery of events
2. **Kafka Producer** - Publishes events to Kafka topics
3. **Retry Logic** - Exponential backoff retry with configurable max attempts
4. **Dead Letter Queue** - Persists permanently failed events for manual inspection
5. **Transaction Safety** - Uses FOR UPDATE SKIP LOCKED for concurrent processing
6. **Health Monitoring** - HTTP health check endpoint

---

## Configuration

**Environment Variables**:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_USER` - Database username (default: postgres)
- `DB_PASSWORD` - Database password (default: postgres)
- `DB_NAME` - Database name (default: postgres)
- `KAFKA_BROKERS` - Kafka brokers (default: localhost:9092)
- `POLL_INTERVAL_MS` - Poll interval in milliseconds (default: 1000)
- `BATCH_SIZE` - Batch size for processing (default: 100)
- `MAX_ATTEMPTS` - Maximum retry attempts (default: 10)
- `DLQ_ON_PERMANENT_FAILURE` - Enable DLQ on permanent failure (default: true)
- `BASE_RETRY_DELAY_MS` - Base retry delay in milliseconds (default: 250)
- `PORT` - Health check server port (default: 3041)
- `LOG_LEVEL` - Log level (default: info)
- `NODE_ENV` - Environment (production disables pretty print)

---

## 1. Health Endpoint

### GET /health
**Purpose**: Health check for outbox-relay with database and Kafka connectivity  
**Auth**: None (public)

**Response**:
```json
{
  "status": "ok|degraded",
  "service": "outbox-relay",
  "timestamp": "ISO8601",
  "uptime": 0,
  "components": {
    "db": "ok|error",
    "kafka": "ok|error"
  }
}
```

**HTTP Status Codes**:
- `200` - All components healthy
- `503` - One or more components degraded

**Errors**:
- `degraded` status returned if database or Kafka connection fails

---

## Summary

**Total REST Endpoints**: 1

**By Controller**: N/A (single health check server)

**Authentication**: None (public health check only)

**Service Type**: Background worker / daemon

**Key Operations**:
1. Polls `outbox_events` table for pending events
2. Publishes events to Kafka with event envelope
3. Implements exponential backoff retry (base delay * 2^(attempt-1), max 30s)
4. Moves permanently failed events to `dead_letter_events` table
5. Uses FOR UPDATE SKIP LOCKED for concurrent processing
6. Supports graceful shutdown on SIGTERM/SIGINT

**Event Envelope Headers**:
- `x-event-type` - Event type
- `x-event-version` - Event version
- `x-correlation-id` - Correlation ID
- `x-tenant-id` - Tenant ID (if present)
- `traceparent` - Trace parent (if present)

**Partition Key**:
- Uses `claimId`, `policyId`, or `fraudCaseId` from subject if available
- Falls back to event ID

**Lag Monitoring**:
- Warns if event lag exceeds 60 seconds

**DLQ Features**:
- Stores original event payload
- Stores error message and stack trace
- Tracks retry count and max retries
- Status: failed
- Can be manually inspected and retried

**Note**: This service is designed as a background worker and does not expose REST endpoints for business operations. All event publishing is handled automatically through the outbox pattern.
