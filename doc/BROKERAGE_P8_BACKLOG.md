# بکلاگ اجرایی فاز P8 — Federation

هدف فاز P8 این است که استقرار مستقل بیمه‌گر و کارگزار را در سرور/tenantهای جداگانه ممکن سازد، در حالی که تجربه مشتری یکپارچه و داده‌ها از طریق federation ایمن و قابل reconciliation مبادله شوند. الزامات federation از P0 در model/schema آماده شده‌اند؛ در P8 operationally فعال می‌شوند.

## اصول کلی P8

- هر سازمان می‌تواند در `tenant` و `deployment` مستقل خود اجرا شود.
- ارتباط بین tenantها فقط از طریق `Partner API Gateway` با mTLS و OAuth2 Client Credentials یا RFC 8693 Token Exchange.
- token exchange بر اساس RFC 8693 با audience/scope محدود.
- eventها signed و دارای correlation/idempotency/version هستند.
- projection‌ها read-only و قابل reconciliation هستند.
- System-of-Record Matrix معین می‌کند کدام tenant صاحب کدام داده است.
- هیچ داده PII بدون consent و contract از federation عبور نمی‌کند.

---

## P8-0 — پیش‌نیازها از P0 تا P7

قبل از شروع P8 موارد زیر باید کامل باشند:

- P0-1 Organization/Tenant/Capability
- P0-2 Party/Identity/Role
- P0-5 BrandConfig
- P0-6 ABAC
- P0-7 RLS
- P0-8 Audit Log
- P1-4 Distribution Agreement Eligibility
- P2-2 Carrier Connector Hub
- P2-5 Bind Saga
- P2-6 Policy Projection
- P3-3 Policy Projection Sync
- P5-4 Claim Projection
- P6-2 Unique Code Management
- P6-6 Data Quality & Reconciliation
- P7-2 Customer Portal White-Label

---

## P8-1 — Federation Readiness Model

### P8-1.1 Authoritative Tenant Fields

**هدف**: اطمینان از اینکه هر موجودیت در federation می‌داند source of truth کجاست.

**فایل‌ها**:
- `services/common/src/federation/authoritative-tenant.decorator.ts`
- `services/common/src/federation/system-of-record.ts`

**فیلدهای الزامی در entityها**:

```typescript
authoritativeTenantId: string;   // tenant صاحب سند
recordOwnerOrganizationId: string;
sourceSystemId: string;
sourceVersion: number;
externalId?: string;             // شناسه در سیستم remote
federationStatus: 'local' | 'shared' | 'projected';
```

**معیار پذیرس**:
- همه entityهای federation-ready دارای `authoritativeTenantId` باشند.
- projectionها `federationStatus='projected'` دارند.
- داده‌های local در `authoritativeTenantId=tenantId`.

### P8-1.2 System-of-Record Matrix Config

**هدف**: تعریف صراحت ownership هر موجودیت در federation.

**فایل‌ها**:
- `services/federation-service/src/config/sor-matrix.ts`

**matrix نمونه**:

```typescript
const SOR_MATRIX = {
  Organization: { owner: 'homeTenant', projectedIn: ['partnerTenant'] },
  ProductRateTable: { owner: 'issuerTenant', projectedIn: ['brokerTenant'] },
  Policy: { owner: 'issuerTenant', projectedIn: ['brokerTenant', 'customerTenant'] },
  Claim: { owner: 'issuerTenant', projectedIn: ['brokerTenant', 'customerTenant'] },
  Submission: { owner: 'brokerTenant', projectedIn: ['issuerTenant'] },
  QuoteRequest: { owner: 'brokerTenant', projectedIn: ['issuerTenant'] },
  QuoteResponse: { owner: 'issuerTenant', projectedIn: ['brokerTenant'] },
  Placement: { owner: 'brokerTenant', projectedIn: ['issuerTenant'] },
  Customer: { owner: 'customerHomeTenant', projectedIn: [] },
  Payment: { owner: 'paymentServiceTenant', projectedIn: ['issuerTenant', 'brokerTenant'] },
  CommissionSettlement: { owner: 'eachOrganization', projectedIn: ['counterpartyTenant'] },
  Document: { owner: 'creatorTenant', projectedIn: ['authorizedPartnerTenant'] },
};
```

**معیار پذیرس**:
- matrix در config repository versioned باشد.
- تغییر matrix با approval و contract update.
- سرویس federation در runtime matrix را load کند.

**وابستگی**: P0-1.1

---

## P8-2 — Partner API Gateway

### P8-2.1 Gateway Service

**هدف**: gateway اختصاصی برای ارتباط بین partner tenants.

**فایل‌ها**:
- `services/partner-gateway/src/partner-gateway.controller.ts`
- `services/partner-gateway/src/partner-auth.service.ts`
- `services/partner-gateway/src/rate-limit.service.ts`

**وظایف**:

- terminate mTLS
- validate JWT یا token exchange
- scope/audience enforcement
- request/response signing
- rate limiting per partner
- route به service مناسب

**معیار پذیرس**:
- فقط partnerهای registered می‌توانند connect شوند.
- هر درخواست دارای client cert + signed JWT.
- rate limit بر اساس agreement.
- همه درخواست‌ها log و audit.

### P8-2.2 Partner Registration

**فایل‌ها**:
- `services/partner-gateway/src/entities/PartnerRegistration.ts`

**موجودیت**:

```typescript
interface PartnerRegistration {
  partnerId: string;
  tenantId: string;
  organizationId: string;
  partnerTenantId: string;
  partnerOrganizationId: string;
  relationshipType: 'carrier_broker' | 'mga_carrier' | 'agency_carrier';
  mTlsCertSubject: string;
  allowedScopes: string[];
  allowedApis: string[];
  rateLimitRps: number;
  status: 'active' | 'suspended' | 'revoked';
  validFrom: Date;
  validTo?: Date;
}
```

**مهاجرت**:
- `V1880000000__create_partner_registration.sql`

**معیار پذیرس**:
- partner فقط با `DistributionAgreement` active قابل register.
- cert subject و scopes با agreement مطابقت داشته باشند.
- revoke فوراً اتصال را قطع کند.

**وابستگی**: P1-4.1

---

## P8-3 — Token Exchange & Federation Security

### P8-3.1 RFC 8693 Token Exchange

**هدف**: امنیت token بین tenantها.

**فایل‌ها**:
- `services/auth-service/src/token-exchange/token-exchange.service.ts`
- `services/auth-service/src/token-exchange/federation-token.guard.ts`

**flow‌های مجاز**:

```text
A) OAuth2 Client Credentials برای service-to-service بدون customer subject
B) RFC 8693 Token Exchange وقتی customer context لازم است

Token exchange flow:
1. Service A با subject token به iam-service/token-exchange درخواست می‌دهد
2. iam-service actor/client verification + scope/audience/agreementId می‌کند
3. token جدید با audience=Partner API Gateway، `act` claim، `agreementId`، `relationshipType` و scopes محدود صادر می‌شود
4. Service A token را به Partner API Gateway ارسال می‌کند
5. Gateway token را validate و audience/scope را بررسی می‌کند
```

**معیار پذیرس**:
- token lifetime کوتاه (max 5 دقیقه).
- audience محدود به partner gateway.
- scope فقط به APIs مجاز.
- `act` claim نشان‌دهنده actor و customer subject، در صورت وجود، باشد.
- `agreementId` و field ACL در authorization و audit کنترل شوند.
- no refresh token برای federation.

### P8-3.2 mTLS & Certificate Rotation

**فایل‌ها**:
- `services/partner-gateway/src/tls/mtls-config.ts`
- `services/partner-gateway/src/tls/cert-rotation.service.ts`

**معیار پذیرس**:
- mutual TLS برای تمام partner connections.
- certificate rotation بدون downtime.
- cert expiry alert قبل از ۳۰ روز.
- CRL/OCSP check برای revocation.

**وابستگی**: P0-6.1

---

## P8-4 — Signed Events & Event Federation

### P8-4.1 Event Signing

**هدف**: امضا و اعتبارسنجی eventها در federation.

**فایل‌ها**:
- `services/common/src/events/event-signer.ts`
- `services/common/src/events/event-signature-validator.ts`

**envelope**:

```typescript
interface SignedDomainEventEnvelope<T> extends DomainEventEnvelope<T> {
  signature: string;            // JWS over canonical JSON
  signingKeyId: string;
  signerOrganizationId: string;
}
```

**معیار پذیرس**:
- هر event با JWS امضا شود.
- consumer کلید public partner را از JWKS دریافت و validate کند.
- امضا invalid منجر به reject و DLQ شود.

### P8-4.2 Cross-Tenant Event Topics

**هدف**: routing event بین Kafka clusters/partitions.

**فایل‌ها**:
- `services/federation-service/src/event-router/federation-event-router.ts`
- `services/federation-service/src/event-router/partition-selector.ts`

**معیار پذیرس**:
- event فقط به topic/tenantهای مجاز route شود.
- ACL در Kafka per partner.
- topic naming convention: `<tenant>.<event-type>.events`.
- DLQ برای eventهای reject.

**وابستگی**: P2-8.1

---

## P8-5 — Federation Connector

### P8-5.1 Federation-Aware Carrier Connector

**هدف**: extend `CarrierConnectorHub` برای کار با external tenant.

**فایل‌ها**:
- `services/submission-placement-service/src/carrier-connectors/federation-connector.adapter.ts`
- `services/submission-placement-service/src/carrier-connectors/partner-discovery.service.ts`

**موجودیت**:

```typescript
interface FederationConnectorConfig extends ConnectorConfig {
  partnerTenantId: string;
  partnerApiGateway: string;
  tokenExchangeEndpoint: string;
  mtlsClientCertRef: string;
  mtlsClientKeyRef: string;
  trustedCaRef: string;
}
```

**معیار پذیرس**:
- discover partner APIs از partner gateway.
- token exchange قبل از هر فراخوان.
- mTLS handshake.
- handle timeout/retry/idempotency across tenant.

### P8-5.2 Federation Quote/Bind Flow

**هدف**: RFQ و bind بین broker tenant و insurer tenant.

**flow**:

```text
1. broker Submission
2. FederationConnector sends QuoteRequest to insurer Partner API Gateway
3. insurer processes quote and returns signed QuoteResponse
4. broker compares and selects
5. broker sends Placement/Bind via FederationConnector
6. insurer issues Policy and emits signed PolicyIssued event
7. broker receives PolicyProjection event
```

**معیار پذیرس**:
- هر مرحله با signed event و correlationId.
- failure منجر به compensating action (Saga).
- projection freshness monitor.

**وابستگی**: P2-2.2

---

## P8-6 — Projection Sync Across Tenants

### P8-6.1 Projection Sync Service

**هدف**: sync policy/claim projection از insurer tenant به broker/customer tenant.

**فایل‌ها**:
- `services/federation-service/src/projection-sync/projection-sync.service.ts`
- `services/federation-service/src/projection-sync/projection-apply.service.ts`

**معیار پذیرس**:
- projection فقط read-only.
- sync با `sourceVersion` و `receivedAt`.
- conflict: نسخه جدیدتر برنده.
- reconciliation هر ۲۴ ساعت.
- latency SLA < ۶۰ ثانیه (async).

### P8-6.2 Projection Reconciliation

**فایل‌ها**:
- `services/federation-service/src/reconciliation/projection-reconciliation.service.ts`

**معیار پذیرس**:
- تطابق projection با source در remote tenant.
- discrepancy report و alert.
- auto-fix فقط برای delta‌های تاییدشده.

**وابستگی**: P3-3.1، P5-4.1

---

## P8-7 — Customer Identity Federation

### P8-7.1 GlobalSubject Federation

**هدف**: مشتری بتواند projection چند insurer را ببیند بدون تکثیر PII.

**فایل‌ها**:
- `services/party-kyc-service/src/federation/global-subject-federation.service.ts`
- `services/party-kyc-service/src/entities/IdentityLink.ts` (بازبینی)

**flow**:

```text
1. customer consents to share projection with broker/insurer
2. IdentityLink with targetTenantId/targetOrganizationId created
3. token exchange for subject with limited scopes
4. partner tenant receives anonymized/global subject ref
5. PII stays in customer home tenant
```

**معیار پذیرس**:
- consent قبل از share هر projection.
- revoke consent فوراً دسترسی future قطع.
- PII در remote projection نباشد؛ فقط blind index یا global ref.

### P8-7.2 Consent Management Across Tenants

**فایل‌ها**:
- `services/party-kyc-service/src/consent/cross-tenant-consent.service.ts`

**موجودیت**:

```typescript
interface CrossTenantConsent {
  consentId: string;
  globalSubjectId: string;
  sourceTenantId: string;
  targetTenantId: string;
  targetOrganizationId: string;
  purpose: string;
  dataTypes: string[];
  validFrom: Date;
  validTo?: Date;
  status: 'active' | 'revoked';
  revokedAt?: Date;
}
```

**معیار پذیرس**:
- consent با purpose و data type مشخص.
- log هر access/share.
- expiration و renewal reminder.

**وابستگی**: P0-2.1

---

## P8-8 — Federation Operations & Monitoring

### P8-8.1 Health & Connectivity Monitoring

**فایل‌ها**:
- `services/federation-service/src/monitoring/partner-health-check.service.ts`
- `services/federation-service/src/monitoring/sync-latency-monitor.ts`

**metrics**:

- partner connectivity (up/down)
- token exchange latency
- event sync lag
- projection freshness
- request rate per partner
- certificate expiry

**معیار پذیرس**:
- alert در downtime، latency > SLA، sync lag، cert expiry.
- dashboard per partner.

### P8-8.2 Runbooks

**فایل‌ها**:
- `runbooks/federation-outage.md`
- `runbooks/partner-cert-rotation.md`
- `runbooks/projection-reconciliation.md`

**معیار پذیرس**:
- runbook برای هر سناریوی outage.
- manual failover procedure.
- rollback switch.

**وابستگی**: P0-8.1

---

## P8-9 — Event‌ها و Contract

### P8-9.1 Eventهای P8

**eventهای پیشنهادی**:

```text
PartnerRegistered.v1
PartnerRevoked.v1
TokenExchanged.v1
FederationEventSigned.v1
FederationEventRejected.v1
ProjectionSynced.v1
ProjectionReconciled.v1
ConsentShared.v1
ConsentRevoked.v1
PartnerHealthChanged.v1
CertificateExpiring.v1
```

**معیار پذیرس**:
- همه eventها در AsyncAPI ثبت شوند.
- producer/consumer contract tests pass شوند.
- Outbox pattern.

### P8-9.2 OpenAPI

**فایل‌ها**:
- `D:\CascadeProjects\ecosystem\contracts\openapi\partner-gateway\openapi.yaml`
- `D:\CascadeProjects\ecosystem\contracts\openapi\federation-service\openapi.yaml`
- `D:\CascadeProjects\ecosystem\contracts\asyncapi\federation\asyncapi.yaml`

**وابستگی**: P7-9.2

---

## P8-10 — تست‌ها

### P8-10.1 Unit/Integration Tests

**فایل‌ها**:
- `services/federation-service/test/token-exchange.spec.ts`
- `services/federation-service/test/event-signing.spec.ts`
- `services/federation-service/test/partner-gateway.spec.ts`
- `services/federation-service/test/projection-sync.spec.ts`

**تست‌های الزامی**:

- mTLS handshake success/failure.
- token exchange با audience/scope نادرست reject.
- signed event validation.
- projection sync cross-tenant.
- consent revoke قطع access.
- certificate expiry alert.
- NFR verification: availability، quote latency، throughput، RTO/RPO و retention.
- JWT tampering، header spoofing، ABAC bypass و SoD واقعی.
- backup restore، zero-downtime migration و rollback.

### P8-10.2 E2E Tests

**فایل‌ها**:
- `e2e/federation-quote-to-bind.spec.ts`
- `e2e/federation-claim-projection.spec.ts`

**سناریوها**:

- broker tenant → insurer tenant: RFQ → quote → bind → policy projection sync.
- insurer tenant claim update → broker/customer tenant projection sync.
- revoke consent → projection access denied.
- partner cert revoked → connection rejected.

**وابستگی**: P8-5.2

---

## P8-11 — Migration & Federation Rollout

### P8-11.1 Federation Config Migration

**اقدامات**:
- backfill `authoritativeTenantId` برای entityهای موجود.
- ایجاد `PartnerRegistration` برای توزیع‌کنندگان/بیمه‌گران موجود.
- deploy partner gateway و federation service.
- certificates generation و distribution.

### P8-11.2 Federation Cutover

**معیار پذیرس**:
- dry-run با partner mock.
- reconciliation داده‌ها قبل و بعد از cutover.
- rollback plan تست شده.
- runbook و SLO برای همه partner flows.

**وابستگی**: P7-11.2

---

## نقشه زمانی P8

```text
Week 1:
  P8-1.1, P8-1.2 (Federation Readiness Model & SOR Matrix)
  P8-2.1, P8-2.2 (Partner API Gateway & Registration)
  P8-3.1, P8-3.2 (Token Exchange & mTLS)

Week 2:
  P8-4.1, P8-4.2 (Signed Events & Event Federation)
  P8-5.1, P8-5.2 (Federation Connector & Quote/Bind Flow)

Week 3:
  P8-6.1, P8-6.2 (Projection Sync & Reconciliation)
  P8-7.1, P8-7.2 (Customer Identity Federation & Consent)

Week 4:
  P8-8.1, P8-8.2 (Operations & Runbooks)
  P8-9.1, P8-9.2 (Event & Contract)
  P8-10.1, P8-10.2 (Tests)
  P8-11.1, P8-11.2 (Migration & Cutover)
  Security review, penetration test, demo
```

---

## معیارهای خروج P8

P8 کامل است اگر و فقط اگر:

- partner API gateway با mTLS و token exchange کار کند.
- partner registration بر اساس agreement انجام شود.
- token exchange با audience/scope محدود و lifetime کوتاه باشد.
- eventها signed و validated شوند.
- federation connector RFQ و bind بین tenantها را انجام دهد.
- projection policy/claim بین tenantها sync و reconcile شود.
- مشتری بتواند projection چند insurer را با consent و revoke ببیند.
- monitoring و runbook برای outage و cert rotation داشته باشیم.
- تست E2E برای federation quote-to-bind و claim projection pass شود.
- OpenAPI/AsyncAPI برای API/eventهای جدید ثبت شده باشد.
- migration و cutover با reconciliation موفق انجام شده باشد.

---

## اصلاحات و تکمیلی پس از تطبیق با BROKERAGE_IMPLEMENTATION_PLAN.md

### P8-12 — Token Exchange Detail Alignment

**هدف**: دقیق‌سازی RFC 8693 token exchange مطابق سند طراحی بخش ۷.۳.

**flow اصلاح‌شده**:
```text
1. Service A با subject token به iam-service/token-exchange درخواست می‌دهد.
2. iam-service actor/client verification + scope/agreementId می‌کند.
3. token جدید با audience=Partner API Gateway، `act` claim (actor) و scopes محدود صادر می‌شود.
4. `agreementId` و `relationshipType` در token claims ذخیره می‌شوند.
5. Service A token را به Partner API Gateway ارسال می‌کند.
6. Gateway token را validate و audience/scope/agreementId را بررسی می‌کند.
```

**معیار پذیرس**:
- token lifetime max ۵ دقیقه.
- `act` claim نشان‌دهنده سرویس اولیه باشد.
- `agreementId` در هر فراخوان federation قابل audit باشد.
- no refresh token برای federation.

### P8-13 — Signed Request Headers & Replay Protection

**هدف**: جلوگیری از replay attack در فراخوان‌های federation.

**اقدامات**:
- اضافه کردن `X-Federation-Nonce` و `X-Federation-Timestamp` به هر درخواست.
- امضای canonical string با JWS در header `X-Federation-Signature`.
- Gateway اعتبارسنجی nonce (cache ۵ دقیقه) و timestamp skew (max ۶۰ ثانیه).

**معیار پذیرس**:
- تست: replay درخواست با nonce تکراری reject شود.
- تست: timestamp خارج از window reject شود.

### P8-14 — Deployment Model Playbooks

**هدف**: پوشش مدل‌های استقرار سند طراحی بخش ۱۱.

**فایل‌ها**:
- `deploy/playbooks/insurer-only.md`
- `deploy/playbooks/broker-only.md`
- `deploy/playbooks/mga-hybrid.md`
- `deploy/playbooks/saas-multi-tenant.md`
- `deploy/playbooks/federated-nodes.md`
- `deploy/playbooks/super-app-marketplace.md`

**معیار پذیرس**:
- هر playbook شامل network diagram، cert distribution و migration steps.
- cutover checklist و rollback plan.

### P8-15 — Document Non-Repudiation

**هدف**: حفظ اصالت و قابلیت انکارناپذیری اسناد policy و مدارک مشترک بین سازمان‌ها.

**اقدامات**:
- هر سند shared دارای digest محتوایی، `sourceSystemId` و امضای دیجیتال باشد.
- کلید امضا از Vault/KMS و با rotation policy مدیریت شود.
- receiver digest/signature را قبل از projection یا archive validate کند.
- سند invalid یا digest mismatch به quarantine/DLQ برود و هرگز overwrite نشود.

**معیار پذیرس**:
- تست tampered document rejected شود.
- verification audit شامل signer، key id، timestamp و correlationId باشد.

### P8-16 — Federation AI/LLM Constraints

**هدف**: اطمینان از عبور PII از federation فقط با consent.

**اقدامات**:
- فقط anonymized/aggregated data در eventهای cross-tenant.
- استفاده از `ecosystem-ai-gateway` برای inference در federation.
- هر model برای هر tenant مجوز داشته باشد.

---

## نکات اجرایی

- federation فقط پس از عملیاتی‌شدن P0 تا P7 و گذراندن security review انجام شود.
- هیچ PII بدون consent و contract از tenant خود عبور نکند.
- certificate rotation باید قبل از expiry خودکار alert دهد.
- فقط service-to-service مجاز است؛ customer subject صرفاً در RFC 8693 با `act`، agreementId، field ACL و audit قابل انتقال است؛ user impersonation آزاد ممنوع است.
- projection فقط read-only؛ هرگونه update باید به source tenant ارسال شود.
- event signing key per organization و rotation policy.
- federation outage نباید داده‌های local را corruption کند.

این بکلاگ مستقیماً از `BROKERAGE_IMPLEMENTATION_PLAN.md` مشتق شده و آماده پیاده‌سازی فاز Federation است.

---

## وضعیت پیشرفت P8 (به‌روزرسانی شده ۲۰۲۶-۰۷-۲۹)

**وضعیت کلی: ۱۰۰٪ تکمیل — تمام ۳۱ زیرمورد پیاده‌سازی شده است.**

### موارد اصلاح‌شده در جلسه نهایی:

| شماره | مشکل | فایل | وضعیت |
|---|---|---|---|
| P8-13 | Timestamp skew validation و request signature header مفقود | `services/partner-gateway/src/replay-protection.service.ts` | ✅ اصلاح شد |
| P8-13 | FederationSignatureGuard برای اعمال هدرهای امضای درخواست | `services/partner-gateway/src/federation-signature.guard.ts` (جدید) | ✅ ایجاد شد |
| P8-13 | Controller به‌روزرسانی برای استفاده از FederationSignatureGuard | `services/partner-gateway/src/partner-gateway.controller.ts` | ✅ اصلاح شد |
| P8-13 | ثبت guard در app module | `services/partner-gateway/src/app.module.ts` | ✅ اصلاح شد |
| P8-11.1 | Backfill migration برای federation fields روی policies | `services/policy-service/src/migrations/1880000000000-p8-federation-backfill.ts` (جدید) | ✅ ایجاد شد |
| P8-11.1 | Backfill migration برای federation fields روی claims | `services/claims-service/src/migrations/1880000000000-p8-federation-backfill.ts` (جدید) | ✅ ایجاد شد |
| P8-11.2 | Cutover/dry-run script برای federation rollout | `scripts/federation-cutover.ts` (جدید) | ✅ ایجاد شد |

### جزئیات اصلاحات:

**P8-13 — Signed Request Headers & Replay Protection:**
- `validateTimestamp()`: بررسی Unix epoch با max 60s skew
- `verifyRequestSignature()`: RSA-SHA256 verification روی canonical string
- `buildCanonicalString()`: `METHOD\nPATH\nNONCE\nTIMESTAMP\nBODY_HASH`
- `computeBodyHash()`: SHA-256 hash بدنه درخواست (base64)
- `validateFederationRequest()`: ترکیب timestamp + signature + nonce validation
- `FederationSignatureGuard`: NestJS guard که هدرهای `X-Federation-Nonce`، `X-Federation-Timestamp`، `X-Federation-Signature`، `X-Federation-Signing-Key-Id` را اعمال می‌کند
- Token-exchange endpoint اکنون از `@UseGuards(FederationSignatureGuard)` استفاده می‌کند

**P8-11.1 — Federation Config Migration:**
- اضافه شدن `federation_status`، `source_version`، `external_id` به جداول `policies` و `claims`
- Backfill: `authoritative_tenant_id = COALESCE(authoritative_tenant_id, tenant_id)`
- Backfill: `source_system_id = COALESCE(source_system_id, 'policy-service'/'claims-service')`
- Backfill: `federation_status = 'local'` برای رکوردهای محلی
- Backfill روی `policy_projections` و `claim_projections`: `federation_status = 'projected'`
- Index creation روی `federation_status` و `source_version`

**P8-11.2 — Federation Cutover Script:**
- اسکریپت TypeScript با 4 فاز: pre-checks، dry-run، post-reconciliation، full
- Pre-cutover: بررسی سلامت ۶ سرویس، شمارش partner registrations، بررسی certificate expiry، SOR matrix
- Dry-run: ثبت mock partner، validate-access، تست reject بدون federation headers، cleanup
- Post-cutover: trigger projection reconciliation، sync latency monitoring، verify service health
- Rollback procedure در صورت failure
- خروجی با exit code (0=success، 1=failure)
