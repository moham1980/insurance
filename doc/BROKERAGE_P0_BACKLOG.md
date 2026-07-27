# بکلاگ اجرایی فاز P0 — Foundation

هدف فاز P0 این است که زیرساخت‌های هویت، چندمستاجری، سازمان، برند و قراردادهای توزیع به‌گونه‌ای پیاده‌سازی شوند که سامانه بتواند به‌طور هم‌زمان شرکت بیمه، کارگزار، MGA و نماینده را در یک یا چند instance مستقر کند. این بکلاگ مستقیماً از `BROKERAGE_IMPLEMENTATION_PLAN.md` مشتق شده و برای ورود به طراحی تفصیلی و توسعه آماده است.

## اصول کلی

- هر task دارای **owner سرویس/ماژول**، **معیار پذیرش قابل تست** و **وابستگی‌های صریح** است.
- ابتدا مدل داده و مهاجرت پیاده‌سازی و تست می‌شود، سپس API، سپس BFF/فرانت.
- همه APIهای جدید باید در contract repository با OpenAPI/AsyncAPI ثبت شوند.
- هر entity دقیقاً scope لازم خود را طبق مدل canonical داشته باشد؛ entityهای tenant-scoped `tenantId`، entityهای organization-scoped `organizationId` و projectionها `authoritativeTenantId`/`sourceSystemId`/`sourceVersion` داشته باشند؛ فیلد بی‌معنا به entity تحمیل نشود.
- هیچ migration‌ای rename مخرب نداشته باشد.
- P0 فقط شامل حالت **single-instance** است؛ federation در P8 عملیاتی می‌شود، اما model/schema از P0 آماده federation است.

---

## P0-1 — Organization و Tenant

### P0-1.1 موجودیت Organization

**هدف**: تعریف شخصیت حقوقی/تجاری مستقل از Tenant.

**فایل‌ها**:
- `services/auth-service/src/entities/Organization.ts`
- `services/auth-service/src/entities/OrganizationCapability.ts`
- `services/auth-service/src/entities/OrganizationRelationship.ts`

** موجودیت‌ها**:

```typescript
interface Organization {
  organizationId: string;
  legalType: 'person' | 'company' | 'government';
  nationalIdBlindIndex?: string;
  regulatoryCode?: string;
  country: string;
  status: 'active' | 'suspended' | 'revoked';
  legalAddress: Address;
  createdAt: Date;
  updatedAt: Date;
}

interface OrganizationCapability {
  capabilityId: string;
  organizationId: string;
  tenantId: string;
  capability: 'CARRIER' | 'BROKER' | 'MGA' | 'AGENCY' | 'AGGREGATOR' | 'LOSS_ADJUSTER' | 'SERVICE_PROVIDER';
  scope: string[];
  bindingAuthorityProfileId?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  status: 'active' | 'suspended';
}

interface OrganizationRelationship {
  relationshipId: string;
  sourceOrganizationId: string;
  targetOrganizationId: string;
  relationshipType: 'carrier_broker' | 'mga_carrier' | 'agency_carrier' | 'referrer' | 'service_provider';
  distributionAgreementId?: string;
  validFrom: Date;
  validTo?: Date;
  status: 'draft' | 'active' | 'suspended' | 'expired' | 'terminated';
}

interface SalesNetworkMembership {
  membershipId: string;
  organizationId: string;
  tenantId: string;
  partyId: string;
  parentPartyId?: string;
  roleType: 'AGENT' | 'SUB_AGENT' | 'MARKETER' | 'BROKER_STAFF' | 'ADJUSTER';
  carrierOrganizationId?: string;
  scope: string[];
  validFrom: Date;
  validTo?: Date;
  status: 'pending' | 'active' | 'suspended' | 'terminated';
}
```

**مهاجرت**:
- `V1800000000__create_organization.sql`
- `V1800000001__create_organization_capability.sql`
- `V1800000002__create_organization_relationship.sql`
- `V1800000006__create_sales_network_membership.sql`

**معیار پذیرش**:
- می‌توان Organization با capabilityهای متفاوت ثبت کرد.
- یک Organization می‌تواند چند capability داشته باشد.
- رابطه بین دو Organization بر اساس `validFrom`/`validTo` اعتبارسنجی می‌شود.
- تست منفی: رابطه با تاریخ پایان قبل از شروع رد می‌شود.
- `SalesNetworkMembership` سلسله‌مراتب شبکه فروش را پشتیبانی می‌کند.
- تست منفی: عضویت با `effectiveTo` قبل از `effectiveFrom` رد می‌شود.

### P0-1.2 موجودیت Tenant به‌روزرسانی شود

**هدف**: Tenant مرز استقرار باشد، نه هویت سازمانی.

**فایل‌ها**:
- `services/auth-service/src/entities/Tenant.ts`
- `services/auth-service/src/entities/BrandConfig.ts`

**موجودیت‌ها**:

```typescript
interface Tenant {
  tenantId: string;
  organizationId: string;
  deploymentMode: 'single_org' | 'multi_org' | 'saas' | 'federated_node';
  dataIsolation: 'schema' | 'row' | 'database';
  primaryRegion: string;
  brandKey: string;
  status: 'active' | 'suspended';
}
```

**مهاجرت**:
- `V1800000015__add_organization_id_to_tenant.sql`
- `V1800000016__add_tenant_deployment_mode.sql`
- `V1800000017__create_brand_config.sql`

**معیار پذیرش**:
- تمام Tenantهای موجود به یک Organization map می‌شوند.
- BrandConfig فقط metadata عمومی دارد و credential ندارد.
- `dataIsolation` با مقدار پیش‌فرض `row` برای همه Tenantهای موجود.

### P0-1.3 API و CRUD Organization/Tenant

**فایل‌ها**:
- `services/auth-service/src/tenant-organization/tenant-organization.controller.ts`
- `services/auth-service/src/tenant-organization/tenant-organization.service.ts`

**APIهای پیشنهادی**:

```text
POST /api/v1/admin/organizations
GET /api/v1/admin/organizations/{organizationId}
PATCH /api/v1/admin/organizations/{organizationId}
POST /api/v1/admin/organizations/{organizationId}/capabilities
DELETE /api/v1/admin/organizations/{organizationId}/capabilities/{capabilityId}
POST /api/v1/admin/organizations/{organizationId}/relationships
GET /api/v1/admin/tenants
POST /api/v1/admin/tenants
PATCH /api/v1/admin/tenants/{tenantId}/brand
GET /api/v1/admin/tenants/{tenantId}/brand
```

**معیار پذیرش**:
- هر admin فقط به tenant/organization خود دسترسی دارد.
- capability با تداخل تاریخ یا رشته overlap نمی‌پذیرد.
- CRUD با audit log.

**وابستگی**: P0-1.1، P0-1.2

---

## P0-2 — Party، هویت جهانی و نقش‌ها

### P0-2.1 موجودیت‌های Party و نقش

**هدف**: تفکیک Party از Organization و پشتیبانی از نقش‌های چندگانه و زمان‌دار.

**فایل‌ها**:
- `services/party-kyc-service/src/entities/Party.ts`
- `services/party-kyc-service/src/entities/PartyRoleAssignment.ts`
- `services/party-kyc-service/src/entities/GlobalSubject.ts`
- `services/party-kyc-service/src/entities/IdentityIdentifier.ts`
- `services/party-kyc-service/src/entities/IdentityLink.ts`

**موجودیت‌ها**:

```typescript
interface Party {
  partyId: string;
  tenantId: string;
  globalSubjectId?: string;
  type: 'PERSON' | 'ORGANIZATION';
  fullName: string;
  nationalIdBlindIndex: string;
  mobileBlindIndex?: string;
  status: 'active' | 'inactive';
}

interface PartyRoleAssignment {
  assignmentId: string;
  partyId: string;
  organizationId: string;
  tenantId: string;
  roleType: 'CUSTOMER' | 'INSURED' | 'BENEFICIARY' | 'BROKER' | 'AGENT' | 'SUB_AGENT' | 'MARKETER' | 'LOSS_ADJUSTER' | 'CLAIMANT' | 'PAYER';
  scope?: string[];
  validFrom: Date;
  validTo?: Date;
  status: 'active' | 'revoked';
}

interface GlobalSubject {
  globalSubjectId: string;
  iamSubjectId: string;
  assuranceLevel: 'low' | 'substantial' | 'high';
  status: 'active' | 'suspended' | 'deleted';
}

interface IdentityIdentifier {
  identifierId: string;
  globalSubjectId: string;
  type: 'MOBILE' | 'NATIONAL_ID' | 'EMAIL' | 'EXTERNAL_SUBJECT';
  blindIndex: string;
  encryptedValueRef?: string;
  verifiedAt?: Date;
  status: 'active' | 'revoked';
}

interface IdentityLink {
  linkId: string;
  globalSubjectId: string;
  tenantId: string;
  localPartyId: string;
  verificationLevel: 'none' | 'mobile' | 'national_id' | 'kyc' | 'biometric';
  linkedAt: Date;
  revokedAt?: Date;
}
```

**مهاجرت**:
- `V1800000010__add_global_subject_id_to_party.sql`
- `V1800000011__create_party_role_assignment.sql`
- `V1800000012__create_global_subject.sql`
- `V1800000013__create_identity_identifier.sql`
- `V1800000014__create_identity_link.sql`

**معیار پذیرش**:
- یک Party می‌تواند چندین PartyRoleAssignment داشته باشد.
- نقش‌های هم‌پوشان با تاریخ/scope duplicate نمی‌شوند.
- `nationalId` در scope یک tenant با blind index یکتاست.
- IdentityLink با `revokedAt` دیگر برای projection استفاده نمی‌شود.

### P0-2.2 PII Store/KMS integration

**هدف**: مقادیر خام کدملی، موبایل و شماره حساب در Vault/KMS نگهداری شوند.

**فایل‌ها**:
- `services/party-kyc-service/src/pii-crypto.ts` (بازبینی)
- `services/party-kyc-service/src/entities/PiiReference.ts`
- config: `PII_STORE_PROVIDER`، `VAULT_ADDR`

**معیار پذیرش**:
- مقدار خام PII در لاگ یا خطای exception نمایش داده نمی‌شود.
- بدون کلید KMS، مقدار خام قابل بازیابی نیست.
- ciphertext reference در DB ذخیره می‌شود.

### P0-2.3 API Party و Role

**فایل‌ها**:
- `services/party-kyc-service/src/party.controller.ts` (بازبینی)
- `services/party-kyc-service/src/party.service.ts` (بازبینی)

**APIهای پیشنهادی**:

```text
POST /api/v1/parties
GET /api/v1/parties/{partyId}
PATCH /api/v1/parties/{partyId}
POST /api/v1/parties/{partyId}/roles
DELETE /api/v1/parties/{partyId}/roles/{assignmentId}
POST /api/v1/global-subjects
POST /api/v1/global-subjects/{globalSubjectId}/links
POST /api/v1/global-subjects/{globalSubjectId}/links/{linkId}/revoke
```

**معیار پذیرش**:
- هر Party فقط در tenant خود قابل دسترسی است.
- admin نمی‌تواند Party tenant دیگر را بخواند.
- لینک global subject به party نیازمند authorization و consent است.

**وابستگی**: P0-2.1، P0-2.2

---

## P0-3 — مجوز کارگزار

### P0-3.1 موجودیت BrokerLicense

**هدف**: اعتبارسنجی مجوز رسمی کارگزار از بیمه مرکزی.

**فایل‌ها**:
- `services/party-kyc-service/src/entities/BrokerLicense.ts`
- `services/regulatory-gateway-service/src/license-validation.service.ts` (skeleton)

**موجودیت**:

```typescript
interface BrokerLicense {
  licenseId: string;
  partyId: string;
  organizationId: string;
  brokerCentralCode: string;
  licenseNumber: string;
  licenseType: 'life' | 'non_life' | 'both';
  scope: string[];
  issueDate: Date;
  expiryDate: Date;
  status: 'active' | 'suspended' | 'revoked' | 'expired';
  verifiedAt?: Date;
  verifiedBy?: string;
}
```

**مهاجرت**:
- `V1800000020__create_broker_license.sql`

**معیار پذیرش**:
- مجوز منقضی‌شده به‌عنوان `expired` علامت‌گذاری می‌شود.
- تست منفی: صدور بیمه‌نامه با مجوز منقضی رد می‌شود.
- مجوز با `scope` رشته خاص فقط در همان رشته مجاز است.

### P0-3.2 API مدیریت مجوز

**APIهای پیشنهادی**:

```text
POST /api/v1/broker-licenses
GET /api/v1/broker-licenses/{licenseId}
POST /api/v1/broker-licenses/{licenseId}/verify
```

**وابستگی**: P0-2.1

---

## P0-4 — Distribution Agreement

### P0-4.1 موجودیت DistributionAgreement

**هدف**: قرارداد کامل بین بیمه‌گر و شبکه فروش.

**فایل‌ها**:
- `services/sales-network-service/src/entities/DistributionAgreement.ts`
- `services/sales-network-service/src/entities/CommissionTier.ts`
- `services/sales-network-service/src/entities/ReferralRule.ts`
- `services/sales-network-service/src/entities/ClawbackRule.ts`

**موجودیت**:

```typescript
interface DistributionAgreement {
  agreementId: string;
  tenantId: string;
  carrierOrganizationId: string;
  distributorOrganizationId: string;
  agreementType: 'brokerage' | 'agency' | 'mga' | 'referral';
  version: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  status: 'draft' | 'active' | 'terminated' | 'expired';
  linesOfBusiness: string[];
  productScope: string[];
  territories: string[];
  bindingAuthority: Money;
  referralRules: ReferralRule[];
  commissionSchedule: CommissionTier[];
  bonusSchedule?: BonusTier[];
  markupRules?: MarkupRule[];
  clawbackRules: ClawbackRule[];
  settlementTerms: SettlementTerms;
  documentRefs: string[];
  approvalWorkflowId?: string;
}
```

**مهاجرت**:
- `V1800000030__create_distribution_agreement.sql`
- `V1800000031__create_commission_tier.sql`
- `V1800000032__create_referral_rule.sql`
- `V1800000033__create_clawback_rule.sql`

**معیار پذیرش**:
- فقط Organizationهایی با capability مناسب می‌توانند carrier یا distributor باشند.
- قرارداد `active` فقط پس از approval و در بازه زمانی معتبر قابل استفاده است.
- overlap در قرارداد فعال برای یک (carrier, distributor, lineOfBusiness) رد می‌شود.

### P0-4.2 API قرارداد

**فایل‌ها**:
- `services/sales-network-service/src/distribution-agreement.controller.ts`
- `services/sales-network-service/src/distribution-agreement.service.ts`

**APIهای پیشنهادی**:

```text
POST /api/v1/distribution-agreements
GET /api/v1/distribution-agreements
GET /api/v1/distribution-agreements/{agreementId}
POST /api/v1/distribution-agreements/{agreementId}/versions
POST /api/v1/distribution-agreements/{agreementId}/activate
POST /api/v1/distribution-agreements/{agreementId}/terminate
GET /api/v1/distribution-agreements/{agreementId}/eligibility?lineOfBusiness=...
```

**معیار پذیرش**:
- Eligibility check فقط `active` agreement را برمی‌گرداند.
- تست: agreement خارج از تاریخ یا `terminated` در eligibility ظاهر نمی‌شود.

**وابستگی**: P0-1.1

---

## P0-5 — BrandConfig و Tenant Resolution

### P0-5.1 مدیریت BrandConfig

**هدف**: پیکربندی white-label بدون credential.

**مهاجرت**: `V1800000040__create_brand_config.sql` (در صورت عدم وجود)

**APIهای پیشنهادی**:

```text
PUT /api/v1/tenants/{tenantId}/brand
GET /api/v1/tenants/{tenantId}/brand
GET /api/v1/brand/by-domain?domain=...
```

**معیار پذیرش**:
- دریافت brand بر اساس `Host` header یا `?domain=`.
- `smtpCredentialRef` و `smsCredentialRef` صرفاً ref به Vault هستند.
- تست منفی: admin نمی‌تواند brand tenant دیگر را ویرایش کند.

### P0-5.2 Tenant Resolution در API Gateway

**هدف**: resolve tenant از Host/audience بدون اعتماد به `X-Tenant-Id` کاربر.

**فایل‌ها**:
- `services/api-gateway/src/tenant-resolution.middleware.ts`

**معیار پذیرش**:
- Gateway `tenantId` را از `Host` یا JWT `tid` استخراج و در signed header داخلی قرار می‌دهد.
- درخواست با Host خارج از `domainAllowList` رد می‌شود.
- downstream صرفاً signed context را می‌پذیرد.

**وابستگی**: P0-1.2، P0-5.1

---

## P0-6 — ABAC و Permissions

### P0-6.1 نقش‌ها و مجوزهای کارگزاری

**هدف**: افزودن نقش‌ها و permissionهای موردنیاز برای broker/MGA/sub-agent.

**فایل‌ها**:
- `services/auth-service/src/role-hierarchy.ts`
- `services/auth-service/src/permissions.ts`

**مجوزهای پیشنهادی**:

```typescript
'broker:carriers:view'
'broker:carriers:manage'
'broker:agreements:view'
'broker:agreements:manage'
'broker:submissions:create'
'broker:quotes:compare'
'broker:placement:bind'
'broker:commissions:view'
'broker:sub_agents:manage'
'broker:brand:manage'
'insurer:agreements:view'
'insurer:agreements:approve'
'insurer:products:publish'
'insurer:projections:receive'
'customer:quotes:compare'
'customer:policies:view_all_carriers'
```

**نقش‌های پیشنهادی**:
- `broker_admin`
- `broker_ops`
- `broker_sales`
- `broker_finance`
- `sub_agent`
- `mga_underwriter`
- `carrier_relationship_manager`

**معیار پذیرش**:
- نقش broker inherits از broker_staff.
- `insurer_admin` به‌طور پیش‌فرض به تمام مجوزهای insurer دسترسی دارد.
- تست: کاربر با نقش broker_sales نمی‌تواند agreement management انجام دهد.

### P0-6.2 Policy Engine برای ABAC

**هدف**: پیاده‌سازی سیاست‌های ABAC ساده برای شروع.

**فایل‌ها**:
- `services/auth-service/src/abac.policy.ts` (بازبینی)
- `services/auth-service/src/resource-context.interceptor.ts` (بازبینی)

**سیاست‌های P0**:

```text
user can read party only if party.tenantId == user.tenantId
user can read policy only if policy.distributionOrganizationId == user.organizationId OR user is in insurer_admin
user can create distribution agreement only if user.organizationId has capability CARRIER or BROKER
```

**معیار پذیرش**:
- تست negative: کاربر tenant دیگر نمی‌تواند داده بخواند.
- تست negative: کارگزار نمی‌تواند قرارداد مربوط به کارگزار دیگر را ببیند.

**وابستگی**: P0-1.1، P0-4.1

---

## P0-7 — Data Isolation و RLS

### P0-7.1 PostgreSQL RLS

**هدف**: enforce tenant/organization isolation در سطح دیتابیس.

**فایل‌ها**:
- مigrations RLS برای هر جدول tenant-scoped.

**مهاجرت‌های نمونه**:

```sql
-- V1800000050__enable_rls_on_organization.sql
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organizations
  USING (tenant_id = current_setting('app.current_tenant')::text);
```

**معیار پذیرش**:
- حتی با دسترسی مستقیم به DB، داده tenant دیگر بدون set کردن `app.current_tenant` دیده نمی‌شود.
- service accountها نیز tenant context محدود دارند.
- bypass RLS فقط برای migration با role محدود مجاز است.

### P0-7.2 Tenant Context Propagation

**هدف**: تزریق `tenantId`/`organizationId` در هر query از طریق TypeORM interceptor.

**فایل‌ها**:
- `services/common/src/tenant/tenant-context.service.ts`
- `services/common/src/tenant/tenant-interceptor.ts`

**معیار پذیرش**:
- همه repository methods بدون `tenantId` explicit خطا می‌دهند.
- تست: query بدون tenant context fail می‌شود.

**وابستگی**: P0-5.2

---

## P0-8 — Audit Log

### P0-8.1 موجودیت Audit Log

**هدف**: ثبت هر تغییر مهم روی Organization، Tenant، Party، Agreement، Policy، Claim و Payment.

**فایل‌ها**:
- `services/audit-service` یا `services/common/src/audit/audit-logger.ts`

**موجودیت**:

```typescript
interface AuditLog {
  auditId: string;
  tenantId: string;
  organizationId: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, any>;
  correlationId: string;
  occurredAt: Date;
}
```

**معیار پذیرش**:
- هر create/update/delete روی Organization/Party/Agreement audit log دارد.
- خواندن داده حساس نیز audit می‌شود.
- لاگ در Elasticsearch/Loki قابل جستجو است.

**وابستگی**: P0-1، P0-2، P0-4

---

## P0-9 — Event Contract Repository

### P0-9.1 ایجاد Repository Contract

**هدف**: ثبت OpenAPI/AsyncAPI برای سرویس‌های insurance.

**مسیر**: `D:\CascadeProjects\ecosystem\contracts\openapi\insurance-*-service\`

**فایل‌ها**:
- `openapi/tenant-organization-service/openapi.yaml`
- `openapi/party-kyc-service/openapi.yaml`
- `openapi/sales-network-service/openapi.yaml`
- `asyncapi/insurance-policy/events/asyncapi.yaml`

**معیار پذیرش**:
- هر endpoint جدید با OpenAPI ثبت شده.
- هر event جدید با AsyncAPI ثبت شده.
- contract test pipeline در CI اجرا می‌شود.
- change approval قبل از merge الزامی است.

**وابستگی**: P0-1.3، P0-2.3، P0-4.2

---

## P0-10 — Migration از وضعیت موجود

### P0-10.1 Backfill داده‌ها

**هدف**: تبدیل داده‌های موجود به مدل جدید بدون downtime.

**اقدامات**:
- ایجاد `Organization` برای هر `Tenant` موجود.
- افزودن `organizationId` به Tenant.
- ایجاد `OrganizationCapability` با `CARRIER` برای بیمه‌گر یا `BROKER` برای کارگزار بر اساس داده‌های موجود.
- به‌روزرسانی `SalesPartner` موجود به مدل جدید Organization/Relationship.
- Backfill `Policy` با `issuerOrganizationId` و `distributionOrganizationId` از روی `tenantId` و `producerOrgUnitId`.

### P0-10.2 Dry-run و Reconciliation

**هدف**: اطمینان از صحت migration قبل از cutover.

**معیار پذیرش**:
- dry-run بدون خطا اجرا شود.
- reconciliation: policy count، premium total و status distribution قبل و بعد از migration برابر باشند.
- رکوردهای مبهم در `migration_quarantine` قرار گیرند و حدس زده نشوند.
- rollback plan تست شده باشد.

**وابستگی**: همه taskهای P0

---

## نقشه راه اجرایی P0

```text
Week 1-2:
  P0-1.1, P0-1.2, P0-1.3
  P0-2.1, P0-2.2
  P0-3.1
  P0-4.1, P0-4.2
  P0-5.1, P0-5.2

Week 3:
  P0-6.1, P0-6.2
  P0-7.1, P0-7.2
  P0-8.1

Week 4:
  P0-9.1
  P0-10.1, P0-10.2
  Integration tests, contract tests, security tests
```

## معیار خروج P0

P0 کامل است اگر و فقط اگر:

- بتوان Organization/Tenant/Capability/Brand را از طریق API مدیریت کرد.
- بتوان Party با نقش‌های متعدد ثبت کرد و `tenantId` جداگانه در هر tenant بود.
- بتوان DistributionAgreement ثبت و اعتبارسنجی کرد.
- ABAC جدایی tenant/organization را enforce کند.
- RLS در PostgreSQL فعال و تست شده باشد.
- Audit log برای هر عملیات حساس ثبت شود.
- OpenAPI/AsyncAPI برای همه APIهای جدید ثبت شده باشد.
- Migration از وضعیت موجود با dry-run و reconciliation موفق انجام شده باشد.
- Global Architecture Gates شامل Money، idempotency، transition audit، JWT validation، observability، NFR و migration rollback پذیرفته شده باشند.

---

## اصلاحات و تکمیلی پس از تطبیق با BROKERAGE_IMPLEMENTATION_PLAN.md

این بخش موارد زیر را که در سند طراحی (`BROKERAGE_IMPLEMENTATION_PLAN.md`) واضح‌تر آمده‌اند تکمیل و اصلاح می‌کند.

### P0-11 — System-of-Record Matrix

**هدف**: تعیین صاحب هر موجودیت از روز اول و آماده‌سازی برای federation.

**فایل‌ها**:
- `services/common/src/federation/system-of-record.ts`
- `config/sor-matrix.yaml`

**matrix نمونه**:
```typescript
const SOR_MATRIX = {
  Organization: { owner: 'homeTenant', projectedIn: [] },
  Party: { owner: 'customerHomeTenant', projectedIn: [] },
  Policy: { owner: 'issuerTenant', projectedIn: ['brokerTenant', 'customerTenant'] },
  Claim: { owner: 'issuerTenant', projectedIn: ['brokerTenant', 'customerTenant'] },
  Submission: { owner: 'brokerTenant', projectedIn: ['issuerTenant'] },
  QuoteRequest: { owner: 'brokerTenant', projectedIn: ['issuerTenant'] },
  QuoteResponse: { owner: 'issuerTenant', projectedIn: ['brokerTenant'] },
  Placement: { owner: 'brokerTenant', projectedIn: ['issuerTenant'] },
  Payment: { owner: 'paymentServiceTenant', projectedIn: ['issuerTenant', 'brokerTenant'] },
};
```

**معیار پذیرش**:
- matrix در config repository versioned باشد.
- هر entity جدید قبل از merge به matrix اضافه شود.
- تست منفی: projection خارج از matrix رد می‌شود.

### P0-12 — IdempotencyRecord

**هدف**: جلوگیری از اجرای duplicate در سطح سرویس.

**فایل‌ها**:
- `services/common/src/idempotency/idempotency-record.entity.ts`
- `services/common/src/idempotency/idempotency.middleware.ts`

**موجودیت**:
```typescript
interface IdempotencyRecord {
  idempotencyKey: string;
  tenantId: string;
  requestPath: string;
  requestHash: string;
  responseRef?: string;
  createdAt: Date;
  expiresAt: Date;
}
```

**معیار پذیرش**:
- کلید idempotency در window ۲۴ ساعته یکتا باشد.
- تست: درخواست duplicate با کلید یکسان پاسخ قبلی را برمی‌گرداند.
- تغییر payload با کلید یکسان reject شود.

### P0-13 — JWT Claim Injection / JWKS Integration

**هدف**: توکن IAM شامل `tenantId`، `organizationId` و `capabilities` باشد و سرویس‌ها از JWKS برای validation استفاده کنند.

**فایل‌ها**:
- `services/auth-service/src/jwt-claims.service.ts`
- `services/common/src/auth/ecosystem-jwt.guard.ts`

**معیار پذیرس**:
- JWT payload شامل `tid`، `oid`، `cap` و `roles`.
- Gateway از `audience` توکن برای tenant resolution استفاده کند.
- JWKS endpoint iam-service با caching TTL قابل اعتبارسنجی باشد.

### P0-14 — Observability Foundation

**هدف**: observability از روز اول برای همه سرویس‌های insurance.

**فایل‌ها**:
- `services/common/src/observability/tracing.ts`
- `services/common/src/observability/metrics.ts`
- `docker-compose.observability.yml`

**اقدامات**:
- توزیع `X-Correlation-Id` در همه درخواست‌ها و eventها.
- متریک‌های latency/error rate بر اساس tenant/organization.
- Kafka consumer lag و DLQ alert.
- Loki logging با PII mask.

**معیار پذیرس**:
- هر request/event قابل trace باشد.
- alert در downtime و lag بالا.
- dashboard RLS/ABAC enforcement.

**نکته**: معیارهای خروج P0 باید شامل System-of-Record Matrix، IdempotencyRecord و observability نیز باشند.

---

## P0-15 — Global Architecture Gates

این گیت‌ها پیش‌شرط همه فازهای P1 تا P8 هستند و از invariants بخش‌های ۳، ۸، ۱۲ و ۱۳ سند طراحی استخراج شده‌اند.

**الزامات**:
- `Money.amountMinor` به‌صورت decimal string و `Money.currency` به‌صورت explicit نگهداری شود؛ هیچ float برای پول مجاز نیست.
- هر command تراکنشی `tenantId`، `operation`، `idempotencyKey` و `requestHash` داشته باشد؛ payload متفاوت با همان کلید reject شود.
- هر status transition با actor، reason، timestamp و optimistic version ثبت شود.
- JWT با `tenantId`، `organizationId` و `capabilities` مستقل از signed internal context validate شود؛ context داخلی جایگزین authorization نیست.
- OpenTelemetry/Jaeger، Prometheus/Alertmanager، Loki، Kafka lag و DLQ monitoring فعال باشد.
- اهداف NFR ثبت و قابل اندازه‌گیری باشند: availability پرتال 99.95٪، backend 99.9٪، RTO کمتر از ۱ ساعت، RPO کمتر از ۱۵ دقیقه، retention بیمه‌نامه/خسارت ۱۰ سال و audit log هفت سال.
- migrationها expand/backfill/dual-read یا dual-write/validation/cutover/rollback را مستند کنند.

**معیار پذیرش**:
- تست منفی برای float پول، duplicate idempotency، JWT tampering، header spoofing، ABAC bypass و SoD وجود داشته باشد.
- backup restore، dry-run، reconciliation و rollback قبل از cutover اجرا و ثبت شوند.

---

## نکات اجرایی

- از روز اول `decimal` برای پول استفاده شود، نه `number` یا `float`.
- `tenantId` هرگز rename نمی‌شود؛ فیلدهای جدید اضافه و backfill می‌شوند.
- همه entityهای جدید `createdAt`/`updatedAt` دارند.
- همه migrations idempotent یا versioned Flyway باشند.
- همه APIها `X-Correlation-Id` را propagate می‌کنند.
- همه تغییرات با contract tests و security tests تست شوند.
- پیش از P1، ADRها برای تصمیمات مهم P0 ثبت شوند.

این بکلاگ مستقیماً از `BROKERAGE_IMPLEMENTATION_PLAN.md` مشتق شده و آماده تبدیل به issue/ticket در tracker تیم است.
