# P8 Federation Operations Runbook

## 1. Partner Onboarding

### Prerequisites
- mTLS certificate pair generated (RSA 2048+, valid ≤ 1 year)
- Partner tenant created in auth-service
- Distribution agreement registered in sales-network-service
- Token exchange endpoint configured on partner IdP

### Steps
1. **Register Partner** in partner-gateway:
   ```
   POST /partner-gateway/partners
   {
     "tenantId": "broker-tenant-1",
     "organizationId": "org-broker-1",
     "partnerTenantId": "insurer-tenant-1",
     "partnerOrganizationId": "org-insurer-1",
     "relationshipType": "carrier_broker",
     "mTlsCertSubject": "CN=insurer.example.com,O=Insurer Org,C=IR",
     "allowedScopes": ["quotes:write", "policies:write"],
     "allowedApis": ["/api/v1/federation/quotes", "/api/v1/federation/bind"],
     "rateLimitRps": 50,
     "validFrom": "2025-01-01T00:00:00Z",
     "validTo": "2026-01-01T00:00:00Z",
     "tokenExchangeEndpoint": "https://insurer-idp.example.com/oauth/token",
     "partnerApiGatewayUrl": "https://insurer-gw.example.com"
   }
   ```

2. **Upload Partner Certificate**:
   ```
   POST /partner-gateway/partners/{partnerId}/certificates
   ```

3. **Verify mTLS handshake** by making a test request with client certificate.

4. **Verify token exchange** by calling `POST /partner-gateway/token-exchange`.

## 2. Certificate Rotation

### When to Rotate
- 30 days before expiry (automatic alert fires)
- After security incident
- Quarterly policy requirement

### Steps
1. Generate new certificate pair.
2. Upload new certificate via rotation endpoint:
   ```
   POST /partner-gateway/partners/{partnerId}/certificates/{oldCertId}/rotate
   ```
3. Old certificate is marked `rotated` (not revoked - allows grace period).
4. Update client-side mTLS configuration with new certificate.
5. Verify connectivity with new certificate.
6. After grace period (24h), old certificate is automatically expired.

## 3. Consent Revocation

### When Consent is Revoked
- Customer requests data deletion
- Regulatory requirement (GDPR-like)
- Partner relationship terminated

### Steps
1. Revoke consent in party-kyc-service:
   ```
   POST /federation/consents/{consentId}/revoke
   { "revokedBy": "admin", "reason": "Customer request" }
   ```
2. All projections for that customer to the target tenant must be marked `revoked`.
3. Monitor `FederationConsentRevokedProjectionStillActive` alert.
4. Run reconciliation to verify projections are cleaned up.

## 4. Projection Drift Recovery

### Detection
- `ProjectionSyncDriftDetected` alert fires
- Manual reconciliation check via `ProjectionReconciliationService`

### Steps
1. Run reconciliation (read-only):
   ```
   ProjectionReconciliationService.reconcileProjections(tenantId, issuerOrgId, { autoRepair: false })
   ```
2. Review mismatched/missing/stale projections.
3. If drift is confirmed, run with auto-repair:
   ```
   ProjectionReconciliationService.reconcileProjections(tenantId, issuerOrgId, { autoRepair: true })
   ```
4. Verify drift is resolved by re-running read-only reconciliation.

## 5. Federation Event Signature Failure

### Detection
- `CrossTenantEventSignatureFailures` alert fires

### Steps
1. Check if signing key has been rotated (check `signingKeyId` in event envelope).
2. Verify public key is available in key provider for the signer organization.
3. If key was rotated, ensure new public key is distributed to all consuming tenants.
4. If key was revoked, reject all events from that organization.
5. Replay events from DLQ after key distribution is fixed.

## 6. Partner Suspension / Revocation

### Suspension (temporary)
```
POST /partner-gateway/partners/{partnerId}/suspend
```
- All requests from this partner are rejected with 403.
- Certificates remain valid.
- Can be reactivated with `POST /partner-gateway/partners/{partnerId}/activate`.

### Revocation (permanent)
```
POST /partner-gateway/partners/{partnerId}/revoke
{ "reason": "Contract terminated" }
```
- All requests rejected.
- Certificates should be revoked individually.
- Consent records for this partner should be revoked.
- Projections from this partner should be marked `revoked`.

## 7. Federation Cutover (Zero-Downtime Migration)

### Pre-Cutover
1. Deploy partner-gateway service.
2. Run database migrations.
3. Register partners and upload certificates.
4. Verify mTLS and token exchange.
5. Configure federation connector in submission-placement-service.

### Cutover
1. Switch carrier connector type from `rest`/`internal` to `federation` for target carriers.
2. Monitor quote dispatch and bind flows.
3. Verify projection sync events are flowing.

### Rollback
1. Switch connector type back to previous configuration.
2. Federation connector is non-destructive - previous connectors remain registered.
3. No data migration rollback needed (federation tables are additive).
