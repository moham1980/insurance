# Deployment Playbook: SaaS Multi-Tenant Deployment

## Network Diagram
```
[Tenant A] ↘
[Tenant B] → [Shared Partner Gateway] → [Shared Services]
[Tenant C] ↗
```

## Cert Distribution
- Per-tenant certificate isolation
- Shared CA with per-tenant intermediate CAs
- Partner gateway validates tenant from cert subject CN

## Migration Steps
1. Deploy partner-gateway with shared schema
2. Register all tenant partners with tenant-scoped certs
3. Configure RLS policies for federation tables
4. Enable per-tenant rate limiting

## Cutover Checklist
- [ ] All tenants registered with isolated certs
- [ ] RLS policies verified (tenant A cannot see tenant B data)
- [ ] Rate limiting per tenant enforced

## Rollback Plan
- Disable federation for specific tenants individually
- No impact on other tenants
