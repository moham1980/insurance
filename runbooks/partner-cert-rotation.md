# Runbook: Partner Certificate Rotation

## Scenario
A partner's mTLS certificate is approaching expiry (≤ 30 days) and must be rotated without downtime.

## Detection
- **Alert**: `CertificateExpiring` — cert expiry < 30 days
- **Alert**: `CertificateExpired` — cert has already expired (partner connections failing)
- **Endpoint**: `GET /partner-gateway/certificates/expiring?days=30`

## Pre-Rotation Checklist
1. **Generate new certificate**:
   ```bash
   openssl req -newkey rsa:2048 -nodes -keyout new-partner.key \
     -x509 -days 365 -out new-partner.crt \
     -subj "/CN=partner.example.com,O=Partner Org,C=IR"
   ```
2. **Verify new cert subject** matches `PartnerRegistration.mTlsCertSubject`
3. **Confirm partner availability** for coordinated rotation window

## Rotation Steps

### 1. Upload New Certificate (Overlap Period)
```
POST /partner-gateway/partners/{partnerId}/certificates
{
  "certSubject": "CN=partner.example.com,O=Partner Org,C=IR",
  "certSerial": "<new-serial>",
  "publicCertPem": "<new-cert-pem>",
  "issuer": "<issuer-cn>",
  "validFrom": "2025-02-01T00:00:00Z",
  "expiresAt": "2026-02-01T00:00:00Z"
}
```

### 2. Activate New Certificate
```
POST /partner-gateway/partners/{partnerId}/certificates/{newCertId}/rotate
```
This marks the new cert as `active` and the old cert as `rotated`. Both remain valid during the overlap window.

### 3. Partner Side Update
- Partner replaces their client certificate with the new key/cert pair
- Partner restarts their federation connector (no downtime if done during overlap)
- Verify connection: partner sends test request to gateway

### 4. Verify Rotation Success
```bash
# Check active certificates
curl http://localhost:3010/partner-gateway/partners/{partnerId}/certificates

# Verify partner health
curl http://localhost:3010/partner-gateway/health/{partnerId}
```

### 5. Revoke Old Certificate
After confirming the new cert works (wait ≥ 1 hour for safety):
```
POST /partner-gateway/partners/{partnerId}/certificates/{oldCertId}/revoke
```

## Emergency: Certificate Already Expired

1. **Immediate**: Suspend partner to prevent failed connection attempts:
   ```
   POST /partner-gateway/partners/{partnerId}/suspend
   ```
2. **Generate emergency cert** with short validity (7 days)
3. **Upload and activate** as above
4. **Resume partner**:
   ```
   POST /partner-gateway/partners/{partnerId}/activate
   ```
5. **Schedule proper rotation** with full 365-day cert within 24 hours

## Automated Rotation
The `CertRotationService` runs every 6 hours and:
- Scans for certificates expiring within 30 days
- Emits `CertificateExpiring.v1` event
- Does NOT auto-rotate — manual rotation required for security

## Post-Rotation Verification
- [ ] New certificate is `active` in partner-gateway
- [ ] Old certificate is `revoked` (not just `rotated`)
- [ ] Partner health check returns `healthy`
- [ ] At least one successful federation request completed
- [ ] Audit log shows rotation event with actor and timestamp
