# P0 Observability and Alerting

## Overview

P0 mandates end-to-end observability for all brokerage foundation services. The stack is based on OpenTelemetry for traces, Prometheus for metrics, and Loki/Grafana for logs and dashboards.

## Components

- **OpenTelemetry Collector**: Receives traces/spans from all NestJS services.
- **Prometheus**: Scrapes metrics from `/metrics` endpoints exposed on each service.
- **Loki**: Aggregates JSON logs forwarded by each service.
- **Grafana**: Dashboards for service health, API latency, error rates, and business KPIs.

## Metrics

Each P0 service MUST expose the following Prometheus metrics:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `p0_http_requests_total` | counter | `service`, `method`, `route`, `status` | Total HTTP requests |
| `p0_http_request_duration_ms` | histogram | `service`, `method`, `route` | Request latency distribution |
| `p0_tenant_context_missing_total` | counter | `service` | Tenant context missing events |
| `p0_abac_denied_total` | counter | `service`, `action`, `resource_type` | ABAC denials |
| `p0_audit_events_total` | counter | `service`, `action`, `outcome` | Audit events |

## Alerting Rules

- `p0_http_request_duration_ms` p95 > 2000ms for 5m → warning.
- `p0_abac_denied_total` rate > 100/min for 5m → investigate potential misconfiguration or attack.
- Service health endpoint down > 30s → critical.

## Log Correlation

All log lines MUST include:
- `service`
- `tenantId`
- `correlationId`
- `userId`

## Tracing

Each service initializes an OpenTelemetry tracer with service name and propagates `traceparent` header. The API Gateway starts the root span and downstream services create child spans.
