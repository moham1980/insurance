# Runbook: Projection Reconciliation

## Scenario
Policy/claim projections between insurer tenant and broker/customer tenant have become inconsistent due to sync failures, network partitions, or manual data interventions.

## Detection
- **Alert**: `ProjectionSyncLagHigh` — sync latency > 60s
- **Alert**: `ProjectionReconciliationMismatch` — reconciliation found discrepancies
- **Scheduled**: Reconciliation runs automatically every 24 hours via `ProjectionReconciliationService`
- **Manual**: `POST /policy-projections/reconcile`

## Assessment

### 1. Check Current Sync Status
```bash
# Check sync latency monitor
curl http://localhost:3015/policy-projections/sync-status

# Check recent sync events
docker logs policy-service --tail 100 | grep "ProjectionSynced"
```

### 2. Run Manual Reconciliation
```
POST /policy-projections/reconcile
```

Response includes:
```json
{
  "totalProjections": 1500,
  "matched": 1485,
  "mismatched": 10,
  "missing": 3,
  "stale": 2,
  "repaired": 13,
  "details": [...]
}
```

### 3. Classify Discrepancies

| Type | Description | Auto-Fix |
|------|-------------|----------|
| **mismatched** | Projection data differs from source policy | Yes — overwrite with source |
| **missing** | Policy exists but no projection | Yes — create projection from policy |
| **stale** | Projection sourceVersion < policy sourceVersion | Yes — update to latest |

## Resolution

### Auto-Fix (Default)
The reconciliation service automatically repairs:
- Missing projections: creates new projection from source policy
- Stale projections: updates to latest sourceVersion
- Mismatched projections: overwrites with source data

### Manual Intervention Required
For projections that cannot be auto-fixed:
1. **Identify root cause**:
   ```bash
   # Check if source policy is valid
   curl http://localhost:3015/policies/{policyId}

   # Check outbox for undelivered events
   docker exec postgres psql -U postgres -d insurance \
     -c "SELECT * FROM outbox_event WHERE aggregate_id = '{policyId}' AND status != 'PROCESSED'"
   ```
2. **Replay missed events**:
   ```bash
   # Reset outbox event status for replay
   docker exec postgres psql -U postgres -d insurance \
     -c "UPDATE outbox_event SET status = 'PENDING' WHERE aggregate_id = '{policyId}'"
   ```
3. **Restart projection consumer**:
   ```bash
   docker compose restart policy-service
   ```

### Cross-Tenant Reconciliation
For projections across federation boundaries:
1. Verify partner connectivity: `GET /partner-gateway/health/{partnerId}`
2. Request source tenant reconciliation via federation API:
   ```
   POST /api/v1/federation/projections/reconcile
   Authorization: Bearer <federation-token>
   ```
3. Compare checksums between source and projection
4. Apply delta updates only — never bulk overwrite

## Escalation
1. **L1**: Auto-fix handles most cases; review details array
2. **L2**: If mismatched > 5% of total, escalate to database team
3. **L3**: If cross-tenant reconciliation fails, escalate to federation architect

## Prevention
- Monitor `ProjectionSynced.v1` event throughput
- Alert if sync lag > 30s (warning) or > 60s (critical)
- Ensure outbox relay is running: `docker logs outbox-relay --tail 50`
- Regular health checks of Kafka consumer lag

## Post-Reconciliation Checklist
- [ ] All projections marked as `matched` or `repaired`
- [ ] No `missing` or `stale` projections remain
- [ ] Sync latency monitor shows < 60s
- [ ] Reconciliation report archived for audit
- [ ] If cross-tenant: partner health verified as `healthy`
