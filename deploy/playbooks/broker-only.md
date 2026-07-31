# Deployment Playbook: Broker-Only Deployment

## Network Diagram
```
[Agent Portal] → [API Gateway] → [Broker Services]
                                       ↕ mTLS
                              [Insurer Partner Gateways] (external)
```

## Cert Distribution
- Broker generates CSR for each insurer partner
- Insurer signs and returns certificate
- Broker stores cert in partner-gateway configuration

## Migration Steps
1. Deploy partner-gateway with broker schema
2. Register insurer partners with their API gateway URLs
3. Configure federation connector in submission-placement-service
4. Test RFQ flow with each insurer

## Cutover Checklist
- [ ] All insurer partners registered and active
- [ ] Federation connector tested with mock RFQ
- [ ] Token exchange verified for each insurer
- [ ] Quote comparison tested with multiple insurers

## Rollback Plan
- Switch federation connector back to `rest` connector
- Previous carrier configurations remain intact
