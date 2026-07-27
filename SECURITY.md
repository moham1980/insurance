# Security Hardening Guide

## Overview
This document outlines the security measures implemented for the Insurance Platform.

## Kubernetes Security

### Pod Security Standards
- **Namespace**: insurance
- **Policy**: Restricted
- **Enforcement**: Enforced, Audited, and Warned

### Network Policies
- **Default**: Deny all ingress and egress
- **PostgreSQL**: Allow claims-service egress on port 5432
- **Kafka**: Allow claims-service egress on port 9092
- **Web UI**: Allow ingress from ingress-nginx namespace on port 3000

### Secrets Management
- **PostgreSQL**: Credentials stored in Kubernetes Secrets
- **JWT**: JWT secret stored in Kubernetes Secrets
- **API Keys**: External API keys stored in Kubernetes Secrets

## Application Security

### Authentication
- JWT-based authentication
- Token expiration: 24 hours
- Refresh token support

### Authorization
- Role-Based Access Control (RBAC)
- Enterprise permissions
- Per-route permission checks

### Data Protection
- TLS encryption in transit
- Database encryption at rest (PostgreSQL)
- Sensitive data masking in logs

### Input Validation
- Server-side validation on all inputs
- SQL injection prevention (parameterized queries)
- XSS prevention (React auto-escaping)

## Monitoring and Auditing
- Audit log for all user actions
- Failed login attempt tracking
- Permission change logging
- Security event alerts

## Best Practices
1. Rotate secrets regularly
2. Use strong passwords (minimum 16 characters)
3. Enable MFA for admin accounts
4. Regular security audits
5. Keep dependencies updated
6. Use image scanning for vulnerabilities
7. Implement rate limiting
8. Enable CORS restrictions
9. Use secure headers (CSP, HSTS, X-Frame-Options)
10. Regular penetration testing

## Deployment Checklist
- [ ] Change default passwords
- [ ] Configure TLS certificates
- [ ] Set up log aggregation
- [ ] Configure alerting
- [ ] Enable audit logging
- [ ] Review network policies
- [ ] Scan container images
- [ ] Update RBAC rules
- [ ] Configure backup encryption
- [ ] Test disaster recovery
