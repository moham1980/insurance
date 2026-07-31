# Deployment Playbooks for Federation

## 1. Insurer-Only Deployment

### Network Diagram
```
[Customer Portal] → [API Gateway] → [Partner Gateway] → [Insurer Services]
                                              ↕ mTLS
                                        [Broker Tenant] (external)
```

### Cert Distribution
- Insurer generates self-signed CA for partner certs
- Broker receives client cert + key via secure channel
- Partner Gateway trusts insurer CA

### Migration Steps
1. Deploy partner-gateway with insurer schema
2. Register broker partners with mTLS cert subjects
3. Configure token exchange endpoint on insurer IdP
4. Switch carrier connectors from `rest` to `federation`

### Cutover Checklist
- [ ] Partner gateway health check passes
- [ ] mTLS handshake verified with all partners
- [ ] Token exchange tested with mock subject token
- [ ] Reconciliation run (pre-cutover baseline)
- [ ] Switch connector type
- [ ] Reconciliation run (post-cutover verification)

### Rollback Plan
- Revert connector type to previous configuration
- Federation tables are additive (no data loss)
- Partner gateway can be stopped without affecting local operations

---

## 2. Broker-Only Deployment

### Network Diagram
```
[Agent Portal] → [API Gateway] → [Broker Services]
                                       ↕ mTLS
                              [Insurer Partner Gateways] (external)
```

### Cert Distribution
- Broker generates CSR for each insurer partner
- Insurer signs and returns certificate
- Broker stores cert in partner-gateway configuration

### Migration Steps
1. Deploy partner-gateway with broker schema
2. Register insurer partners with their API gateway URLs
3. Configure federation connector in submission-placement-service
4. Test RFQ flow with each insurer

### Cutover Checklist
- [ ] All insurer partners registered and active
- [ ] Federation connector tested with mock RFQ
- [ ] Token exchange verified for each insurer
- [ ] Quote comparison tested with multiple insurers

### Rollback Plan
- Switch federation connector back to `rest` connector
- Previous carrier configurations remain intact

---

## 3. MGA-Hybrid Deployment

### Network Diagram
```
[MGA Services] ←→ [Partner Gateway] ←→ [Carrier Tenant]
       ↕                                    ↕
[Agent Portal]                        [Broker Tenant]
```

### Cert Distribution
- MGA acts as both client and server
- Separate cert pairs for MGA→Carrier and MGA→Broker
- Rotation schedule: MGA→Carrier quarterly, MGA→Broker semi-annually

### Migration Steps
1. Deploy partner-gateway with MGA schema
2. Register carrier partners (upstream) and broker partners (downstream)
3. Configure bidirectional token exchange
4. Set up projection sync for both directions

### Cutover Checklist
- [ ] Both upstream and downstream partners verified
- [ ] Bidirectional projection sync tested
- [ ] Reconciliation matches in both directions

### Rollback Plan
- Disconnect upstream first, then downstream
- Revert to direct carrier connectors

---

## 4. SaaS Multi-Tenant Deployment

### Network Diagram
```
[Tenant A] ↘
[Tenant B] → [Shared Partner Gateway] → [Shared Services]
[Tenant C] ↗
```

### Cert Distribution
- Per-tenant certificate isolation
- Shared CA with per-tenant intermediate CAs
- Partner gateway validates tenant from cert subject CN

### Migration Steps
1. Deploy partner-gateway with shared schema
2. Register all tenant partners with tenant-scoped certs
3. Configure RLS policies for federation tables
4. Enable per-tenant rate limiting

### Cutover Checklist
- [ ] All tenants registered with isolated certs
- [ ] RLS policies verified (tenant A cannot see tenant B data)
- [ ] Rate limiting per tenant enforced

### Rollback Plan
- Disable federation for specific tenants individually
- No impact on other tenants

---

## 5. Federated Nodes Deployment

### Network Diagram
```
[Node 1 (Broker)] ←→ [Partner Gateway] ←→ [Node 2 (Insurer)]
       ↕                                    ↕
  [Kafka Cluster 1]                  [Kafka Cluster 2]
       ↕                                    ↕
  [PostgreSQL 1]                     [PostgreSQL 2]
```

### Cert Distribution
- Each node has its own CA
- Cross-signed certificates for mutual trust
- OCSP responder for real-time revocation checking

### Migration Steps
1. Deploy partner-gateway on each node
2. Establish cross-node mTLS with cross-signed certs
3. Configure Kafka mirror-maker for cross-cluster event replication
4. Set up projection sync between nodes

### Cutover Checklist
- [ ] Cross-node mTLS verified
- [ ] Event replication lag < 60 seconds
- [ ] Projection sync tested bidirectionally
- [ ] Reconciliation run on both nodes

### Rollback Plan
- Stop mirror-maker (events queue locally)
- Disconnect partner gateway (local operations continue)
- Replay queued events after reconnection

---

## 6. Super-App Marketplace Deployment

### Network Diagram
```
[Super-App] → [Edge BFF] → [Partner Gateway] → [Insurance Services]
                              ↕ mTLS
                    [External Insurer APIs]
```

### Cert Distribution
- Super-app generates per-partner certs
- External insurers receive certs via marketplace onboarding
- Auto-rotation via marketplace cert management API

### Migration Steps
1. Deploy partner-gateway integrated with marketplace onboarding
2. Auto-register partners when marketplace agreement is signed
3. Configure federation connector for marketplace insurance flows
4. Enable consent management for customer data sharing

### Cutover Checklist
- [ ] Marketplace onboarding auto-creates partner registration
- [ ] Consent flow tested end-to-end
- [ ] Federation quote flow through marketplace verified

### Rollback Plan
- Disable federation connector for marketplace flows
- Fall back to direct API integration per insurer
