# Deployment Playbook: MGA-Hybrid Deployment

## Network Diagram
```
[MGA Services] ←→ [Partner Gateway] ←→ [Carrier Tenant]
       ↕                                    ↕
[Agent Portal]                        [Broker Tenant]
```

## Cert Distribution
- MGA acts as both client and server
- Separate cert pairs for MGA→Carrier and MGA→Broker
- Rotation schedule: MGA→Carrier quarterly, MGA→Broker semi-annually

## Migration Steps
1. Deploy partner-gateway with MGA schema
2. Register carrier partners (upstream) and broker partners (downstream)
3. Configure bidirectional token exchange
4. Set up projection sync for both directions

## Cutover Checklist
- [ ] Both upstream and downstream partners verified
- [ ] Bidirectional projection sync tested
- [ ] Reconciliation matches in both directions

## Rollback Plan
- Disconnect upstream first, then downstream
- Revert to direct carrier connectors
