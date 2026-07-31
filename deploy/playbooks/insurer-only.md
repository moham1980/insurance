# Deployment Playbook: Insurer-Only Deployment

## Network Diagram
```
[Customer Portal] → [API Gateway] → [Partner Gateway] → [Insurer Services]
                                              ↕ mTLS
                                        [Broker Tenant] (external)
```

## Cert Distribution
- Insurer generates self-signed CA for partner certs
- Broker receives client cert + key via secure channel
- Partner Gateway trusts insurer CA

## Migration Steps
1. Deploy partner-gateway with insurer schema
2. Register broker partners with mTLS cert subjects
3. Configure token exchange endpoint on insurer IdP
4. Switch carrier connectors from `rest` to `federation`

## Cutover Checklist
- [ ] Partner gateway health check passes
- [ ] mTLS handshake verified with all partners
- [ ] Token exchange tested with mock subject token
- [ ] Reconciliation run (pre-cutover baseline)
- [ ] Switch connector type
- [ ] Reconciliation run (post-cutover verification)

## Rollback Plan
- Revert connector type to previous configuration
- Federation tables are additive (no data loss)
- Partner gateway can be stopped without affecting local operations
