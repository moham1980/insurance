# Deployment Playbook: Super-App Marketplace Deployment

## Network Diagram
```
[Super-App] → [Edge BFF] → [Partner Gateway] → [Insurance Services]
                              ↕ mTLS
                    [External Insurer APIs]
```

## Cert Distribution
- Super-app generates per-partner certs
- External insurers receive certs via marketplace onboarding
- Auto-rotation via marketplace cert management API

## Migration Steps
1. Deploy partner-gateway integrated with marketplace onboarding
2. Auto-register partners when marketplace agreement is signed
3. Configure federation connector for marketplace insurance flows
4. Enable consent management for customer data sharing

## Cutover Checklist
- [ ] Marketplace onboarding auto-creates partner registration
- [ ] Consent flow tested end-to-end
- [ ] Federation quote flow through marketplace verified

## Rollback Plan
- Disable federation connector for marketplace flows
- Fall back to direct API integration per insurer
