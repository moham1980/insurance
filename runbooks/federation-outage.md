# Runbook: Federation Outage

## Scenario
A partner tenant or federation connection becomes unresponsive, causing quote/bind failures or projection sync interruptions.

## Detection
- **Alert**: `FederationPartnerDown` — partner health check fails for 3 consecutive intervals
- **Alert**: `FederationSyncLagHigh` — projection sync latency > 60s SLA
- **Alert**: `FederationTokenExchangeFailure` — token exchange error rate > 10%
- **Dashboard**: Federation Operations dashboard in Grafana

## Immediate Actions

### 1. Assess Scope
```bash
# Check partner health status
curl http://localhost:3010/partner-gateway/health/all

# Check sync latency metrics
curl http://localhost:3015/policy-projections/sync-status
```

### 2. Identify Affected Partners
- Check partner-gateway logs: `docker logs partner-gateway --tail 200`
- Look for `PartnerHealthChanged` events in Kafka: `federation.partner-health.events`

### 3. Failover Procedure

#### If Single Partner Down
1. Mark partner as `suspended` in partner-gateway:
   ```
   POST /partner-gateway/partners/{partnerId}/suspend
   ```
2. Route submissions to alternative carriers via `CarrierConnectorFactory`
3. Notify operations team via alert channel

#### If Partner Gateway Itself Down
1. Restart partner-gateway container:
   ```bash
   docker compose restart partner-gateway
   ```
2. If restart fails, check database connectivity:
   ```bash
   docker exec partner-gateway pg_isready -h postgres -U postgres
   ```
3. If DB is fine, check Kafka connectivity:
   ```bash
   docker exec partner-gateway kafka-topics --bootstrap-server kafka:29092 --list
   ```

#### If Projection Sync Stopped
1. Check policy-service projection consumer:
   ```bash
   docker logs policy-service --tail 100 | grep projection
   ```
2. Restart projection consumer if needed:
   ```bash
   docker compose restart policy-service
   ```
3. Run manual reconciliation after recovery:
   ```
   POST /policy-projections/reconcile
   ```

## Escalation
1. **L1 (0-15 min)**: On-call engineer follows this runbook
2. **L2 (15-30 min)**: Escalate to federation team lead
3. **L3 (30+ min)**: Escalate to platform architect; consider rollback to pre-federation mode

## Rollback Switch
Set environment variable `FEDERATION_ENABLED=false` in affected services to fall back to local-only mode:
```bash
docker compose exec submission-placement-service sh -c 'export FEDERATION_ENABLED=false && kill -HUP 1'
```

## Post-Incident
1. Document timeline and root cause
2. Update monitoring thresholds if needed
3. Run full reconciliation: `POST /policy-projections/reconcile`
4. Verify all partner health statuses are `healthy`
