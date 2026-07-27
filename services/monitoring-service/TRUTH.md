# Monitoring Service — Capability Truth Registry

This document records the runtime truth of monitoring capabilities as required by Wave 1 (Truth Alignment).

## Capability Status

| Capability | Status | Evidence | Gap | Target
|---|---|---|---|---|
| Prometheus Metrics | **REAL** | `prom-client` with default metrics + custom registry | None | Production-ready
| Metric Ingestion | **REAL** | `MonitoringService.ingestMetric()` with counter/gauge/histogram | Needs metric naming convention enforcement | P1
| SLO Definition | **REAL** | `SLO` entity with target + window | Needs SLO per journey (issuance, claims, AI) | P1
| SLO Evaluation | **REAL** | Cron-based evaluation every 5 minutes | Needs more SLO types and thresholds | P1
| Alert Firing | **REAL** | `Alert` entity with `firing`/`resolved`/`acknowledged` states | Needs alert routing (email/SMS/webhook) | P0
| Alert Policy | **REAL** | `alerts.policy.ts` with severity mapping | Needs escalation policy | P1
| Complaint SLA Consumer | **REAL** | `ComplaintSlaConsumer` creates alert on breach | None | Production-ready
| Jaeger Tracing | **REAL** | `JaegerClientService` with span creation | Needs integration verification | P1
| OpenTelemetry | **REAL** | `OtelController` + `OtelService` with metrics/traces | Needs collector configuration | P1
| Service Readiness Baseline | **MISSING** | No per-service readiness checklist | Needs readiness framework | P0
| Dashboard/UI | **SKELETON** | `MonitoringController` with basic endpoints | Needs Grafana/executive dashboard | P1
| Log Aggregation | **MISSING** | No centralized log aggregation | Needs Loki/ELK integration | P2

## Alert Inventory

| Alert Type | Source | Severity | Status |
|---|---|---|---|
| Complaint SLA Breach | `complaints-service` | `high`/`critical` | ACTIVE |
| Service Unavailable | `api-gateway` | `critical` | NOT IMPLEMENTED |
| High Error Rate | `any-service` | `high` | NOT IMPLEMENTED |
| DLQ Depth | `orchestrator-service` | `high` | NOT IMPLEMENTED |
| Payment Failure Spike | `payments-service` | `critical` | NOT IMPLEMENTED |
| Fraud Score Threshold | `fraud-service` | `medium` | NOT IMPLEMENTED |
| Sanhab Integration Failure | `regulatory-gateway-service` | `critical` | NOT IMPLEMENTED |
| AI Model Drift | `copilot-service` | `medium` | NOT IMPLEMENTED |
| Database Connection Pool Exhaustion | `any-service` | `critical` | NOT IMPLEMENTED |
| Kafka Lag | `any-service` | `high` | NOT IMPLEMENTED |

## Environment Variable Requirements

```bash
# Monitoring
MONITORING_SERVICE_URL=http://localhost:3020
PROMETHEUS_PORT=9090
JAEGER_AGENT_HOST=localhost
JAEGER_AGENT_PORT=6831
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
LOG_LEVEL=info
```

## Decision Log

- **2024-06-11**: Monitoring core (metrics, SLO, alerts) is operational. Alert routing and additional alert types need implementation.
- **2024-06-11**: Per-service readiness checklist is missing — should be formalized.
