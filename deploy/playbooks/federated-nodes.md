# Deployment Playbook: Federated Nodes Deployment

## Network Diagram
```
[Node 1 (Broker)] ←→ [Partner Gateway] ←→ [Node 2 (Insurer)]
       ↕                                    ↕
  [Kafka Cluster 1]                  [Kafka Cluster 2]
       ↕                                    ↕
  [PostgreSQL 1]                     [PostgreSQL 2]
```

## Cert Distribution
- Each node has its own CA
- Cross-signed certificates for mutual trust
- OCSP responder for real-time revocation checking

## Migration Steps
1. Deploy partner-gateway on each node
2. Establish cross-node mTLS with cross-signed certs
3. Configure Kafka mirror-maker for cross-cluster event replication
4. Set up projection sync between nodes

## Cutover Checklist
- [ ] Cross-node mTLS verified
- [ ] Event replication lag < 60 seconds
- [ ] Projection sync tested bidirectionally
- [ ] Reconciliation run on both nodes

## Rollback Plan
- Stop mirror-maker (events queue locally)
- Disconnect partner gateway (local operations continue)
- Replay queued events after reconnection
