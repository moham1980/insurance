# نقشه راه معماری سامانه کارگزاری بیمه (نسخه اصلاح‌شده)

## ۱. خلاصه و اهداف

این سند نسخه اصلاح‌شده نقشه راه توسعه سامانه موجود است. هدف نهایی این است که پلتفرم بیمه‌محور به‌گونه‌ای طراحی و پیاده‌سازی شود که:

- هم در **شرکت بیمه (Insurer)** و هم در **شرکت کارگزاری (Broker/MGA)** قابل استقرار باشد.
- هر استقرار می‌تواند **مستقل** از نظر برند، داده، workflow و مجوزها عمل کند.
- تجربه مشتری در هر برند **مستقل** باشد، اما در صورت نیاز (SaaS یا super-app) یک **هویت واحد** و داشبورد یکپارچه داشته باشد.
- ارتباط بین دو یا چند استقرار مستقل از طریق **فدراسیون (Federation)** با امنیت و قرارداد مشخص امکان‌پذیر باشد.
- از زیرساخت فعلی (IAM/JWKS، Kafka، Outbox، DLQ، account-as-wallet، ecosystem-ai-gateway) حداکثر بهره‌برداری شود.

## ۲. تصمیمات معماری کلیدی

| تصمیم | توضیحات |
|-------|---------|
| **جداسازی Organization از Tenant** | `Organization` شخصیت حقوقی و نقش‌های تجاری را مشخص می‌کند. `Tenant` مرز استقرار/امنیت/داده است. یک شرکت می‌تواند چندین capability تجاری داشته باشد ولی در یک Tenant یا Tenantهای جداگانه مستقر شود. |
| **توانمندی‌ها به‌جای نوع سازمان** | به‌جای `tenantType = broker|insurer` از `OrganizationCapability` استفاده می‌شود. سازمان می‌تواند هم‌زمان بیمه‌گر، کارگزار، MGA و aggregator باشد. |
| **System-of-Record Matrix** | برای هر داده مشخص می‌شود مرجع اصلی (authoritative) کجاست و projection در کدام Tenantها قرار دارد. این مسئله در استقرار فدرال حیاتی است. |
| **تفکیک صادرکننده (Issuer) از کانال فروش (Channel)** | بیمه‌نامه همیشه دارای `issuerOrganizationId` و `distributionOrganizationId` و `producerPartyId` است. هیچ‌کدام با `tenantId` جایگزین نمی‌شوند. |
| **Bounded Context مستقل برای Placement** | RFQ، market selection، quote normalization، comparison، selection و bind در یک context مستقل (Submission & Placement) قرار می‌گیرند و با `product-service` ادغام نمی‌شوند. |
| **قرارداد توزیع جامع** | `DistributionAgreement` جایگزین `CarrierContract` ساده می‌شود و کلیه ابعاد حقوقی، مالی، صلاحیت صدور، SLA و گزارش‌دهی را پوشش می‌دهد. |
| **مالی تفکیک‌شده** | حق بیمه، کارمزد، fee، tax، client money، تسویه با بیمه‌گر و clawback کاملاً از هم جدا و در sub-ledger ثبت می‌شوند. |
| **هویت جهانی مشتری با Consent** | `GlobalSubject` و `IdentityLink` امکان تجربه مشتری واحد را می‌دهند ولی همه به اشتراک‌گذاری داده منوط به consent و ABAC است. |
| **BFF و Anti-Corruption** | frontend مستقیم به چندین microservice متصل نمی‌شود. هر پرتال یک BFF دارد که view model و security context را مدیریت می‌کند. |
| **عدم اعتماد به Headerهای کاربر** | `X-Tenant-Id` یا `Host` به‌تنهایی معتبر نیستند. Tenant و Organization از token/JWT و membership استخراج و در downstream به‌صورت signed claim تزریق می‌شوند. |
| **Event-First با Contract** | همه رویدادهای بین سازمانی و بین سرویسی دارای نسخه‌بندی، idempotency key، correlation/causation و schema ثبت‌شده هستند. |

## ۳. مدل دامنه و داده

### ۳.۰ انواع پایه و invariants

```typescript
// Money هرگز با float نگهداری نمی‌شود؛ amount بر حسب minor unit است.
interface Money {
  amountMinor: string; // decimal string برای جلوگیری از overflow و خطای اعشاری
  currency: string;    // ISO 4217 یا کد مصوب داخلی؛ IRR و IRT جدا و explicit
}

interface IdempotencyRecord {
  tenantId: string;
  idempotencyKey: string;
  operation: string;
  requestHash: string;
  responseRef?: string;
  expiresAt: Date;
}
```

Invariants اجباری:

- `Money.currency` در هر تراکنش و journal یکسان یا با FX snapshot معتبر باشد.
- `amountMinor` با decimal arithmetic محاسبه شود، نه JavaScript/SQL floating point.
- شناسه‌های خارجی در کنار `sourceSystemId` و `externalId` نگهداری و unique scoped شوند.
- هر command تراکنشی idempotency key داشته باشد.
- هر status transition با actor، reason، timestamp و optimistic version ثبت شود.

### ۳.۱ Organization و قابلیت‌های سازمانی

```typescript
// Organization (شخصیت حقوقی و تجاری)
interface Organization {
  organizationId: string;       // شناسه canonical داخلی؛ شناسه ملی/ثبت‌شده در legal identifiers نگهداری می‌شود
  legalType: 'person' | 'company' | 'government';
  nationalIdBlindIndex?: string; // مقدار خام در PII store، نه در این رکورد
  regulatoryCode?: string;      // کد بیمه مرکزی/سنهاب
  country: string;
  status: 'active' | 'suspended' | 'revoked';
  legalAddress: Address;
  createdAt: Date;
}

// Capability سازمانی (یک سازمان می‌تواند چند تا داشته باشد)
interface OrganizationCapability {
  capabilityId: string;
  organizationId: string;
  tenantId: string;
  capability: 'CARRIER' | 'BROKER' | 'MGA' | 'AGENCY' | 'AGGREGATOR' | 'LOSS_ADJUSTER' | 'SERVICE_PROVIDER';
  scope: string[];             // رشته‌های مجاز
  bindingAuthorityProfileId?: string; // مرجع profile صلاحیت؛ سقف‌ها در قرارداد توزیع تعیین می‌شوند
  effectiveFrom: Date;
  effectiveTo?: Date;
  status: 'active' | 'suspended';
}

// روابط بین سازمانی (graph چندبه‌چند)
interface OrganizationRelationship {
  relationshipId: string;
  sourceOrganizationId: string;    // مثلاً بیمه‌گر
  targetOrganizationId: string;    // مثلاً کارگزار
  relationshipType: 'carrier_broker' | 'mga_carrier' | 'agency_carrier' | 'referrer' | 'service_provider';
  distributionAgreementId?: string;
  validFrom: Date;
  validTo?: Date;
  status: 'draft' | 'active' | 'suspended' | 'expired' | 'terminated';
}

// رابطه افراد با سازمان و شبکه فروش؛ برای sub-agent و marketer از این مدل استفاده می‌شود
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

### ۳.۲ Tenant و Brand

```typescript
interface Tenant {
  tenantId: string;
  organizationId: string;       // مالک اصلی
  deploymentMode: 'single_org' | 'multi_org' | 'saas' | 'federated_node';
  dataIsolation: 'schema' | 'row' | 'database';
  primaryRegion: string;
  brandKey: string;
  status: 'active' | 'suspended';
}

// تنظیمات برند — فقط metadata عمومی؛ credentialها نه
interface BrandConfig {
  brandKey: string;
  tenantId: string;
  displayNameFa: string;
  displayNameEn: string;
  primaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  rtl: boolean;
  calendarType: 'jalali' | 'gregorian';
  defaultCurrency: string;        // IRR, IRT, USD
  supportedLocales: string[];
  supportPhone?: string;
  supportEmail?: string;
  smtpCredentialRef?: string;     // ref به Vault، نه خود رمز
  smsCredentialRef?: string;       // ref به Vault
  domainAllowList: string[];        // دامنه‌های مجاز برای resolve
}
```

### ۳.۳ Party و هویت جهانی

```typescript
// Party در داخل یک Tenant/Organization
interface Party {
  partyId: string;
  tenantId: string;
  globalSubjectId?: string;     // ارجاع به هویت جهانی
  type: 'PERSON' | 'ORGANIZATION';
  fullName: string;
  nationalIdBlindIndex: string;
  mobileBlindIndex?: string;
  status: 'active' | 'inactive';
}

// نقش‌های context-aware
interface PartyRoleAssignment {
  assignmentId: string;
  partyId: string;
  organizationId: string;
  tenantId: string;
  roleType: 'CUSTOMER' | 'INSURED' | 'BENEFICIARY' | 'BROKER' | 'AGENT' | 'SUB_AGENT' | 'MARKETER' | 'LOSS_ADJUSTER' | 'CLAIMANT' | 'PAYER';
  scope?: string[];             // رشته‌ها
  validFrom: Date;
  validTo?: Date;
  status: 'active' | 'revoked';
}

// هویت جهانی برای تجربه مشتری واحد
interface GlobalSubject {
  globalSubjectId: string;
  iamSubjectId: string;          // sub پایدار از iam-service؛ منبع هویت، نه کپی اطلاعات PII
  assuranceLevel: 'low' | 'substantial' | 'high';
  status: 'active' | 'suspended' | 'deleted';
}

interface IdentityIdentifier {
  identifierId: string;
  globalSubjectId: string;
  type: 'MOBILE' | 'NATIONAL_ID' | 'EMAIL' | 'EXTERNAL_SUBJECT';
  blindIndex: string;
  encryptedValueRef?: string;    // مقدار خام فقط در PII store/KMS
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

### ۳.۴ مجوز کارگزار (Broker License)

```typescript
interface BrokerLicense {
  licenseId: string;
  partyId: string;
  organizationId: string;
  brokerCentralCode: string;     // کد رسمی بیمه مرکزی
  licenseNumber: string;
  licenseType: 'life' | 'non_life' | 'both';
  scope: string[];               // رشته‌های مجاز
  issueDate: Date;
  expiryDate: Date;
  status: 'active' | 'suspended' | 'revoked' | 'expired';
  verifiedAt?: Date;
  verifiedBy?: string;
}
```

### ۳.۵ قرارداد توزیع (Distribution Agreement)

```typescript
interface DistributionAgreement {
  agreementId: string;
  carrierOrganizationId: string;      // بیمه‌گر
  distributorOrganizationId: string;    // کارگزار/MGA/آژانس
  agreementType: 'brokerage' | 'agency' | 'mga' | 'referral';
  version: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  status: 'draft' | 'active' | 'terminated' | 'expired';
  linesOfBusiness: string[];
  productScope: string[];             // productIds یا wildcard
  territories: string[];
  bindingAuthority: Money;            // سقف صدور بدون ارجاع
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

### ۳.۶ محصول و Offering

```typescript
interface Product {
  productId: string;
  ownerOrganizationId: string;        // بیمه‌گر
  ownerTenantId: string;
  version: number;
  status: 'draft' | 'active' | 'retired';
  lineOfBusiness: string;
  coverages: CoverageDefinition[];
  ratingTables: RateTableVersion[];
  formSchema: JSONSchema;
  requiredDocuments: DocumentRequirement[];
}

interface ProductVisibility {
  visibilityId: string;
  productId: string;
  distributorOrganizationId?: string;   // null = همه مجاز
  visibilityType: 'private' | 'exclusive' | 'marketplace';
  markupRules?: MarkupRule[];
  effectiveFrom: Date;
  effectiveTo?: Date;
}

interface BrokerProductOffering {
  offeringId: string;
  brokerOrganizationId: string;
  brokerTenantId: string;
  name: string;
  description: string;
  includedProductIds: string[];
  bundleRules: BundleRule[];
  recommendationRules: RecommendationRule[];
  status: 'active' | 'inactive';
}
```

### ۳.۷ RFQ و Placement

```typescript
interface Submission {
  submissionId: string;
  tenantId: string;
  brokerOrganizationId: string;
  customerPartyId: string;
  lineOfBusiness: string;
  exposure: Record<string, any>;
  requestedCoverages: CoverageRequest[];
  documents: DocumentRef[];
  status: 'draft' | 'submitted' | 'quoted' | 'selected' | 'placed' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

interface QuoteRequest {
  quoteRequestId: string;
  tenantId: string;
  submissionId: string;
  distributionAgreementId: string;
  agreementVersion: number;
  carrierOrganizationId: string;
  productId: string;
  connectorType: 'internal' | 'rest' | 'soap' | 'kafka' | 'manual';
  connectorRequestId?: string;
  requestPayload: Record<string, any>;
  idempotencyKey: string;
  attempt: number;
  sentAt?: Date;
  slaDeadline: Date;
  status: 'pending' | 'sent' | 'received' | 'timeout' | 'error' | 'cancelled';
}

interface QuoteResponse {
  quoteResponseId: string;
  tenantId: string;
  quoteRequestId: string;
  receivedAt: Date;
  carrierOrganizationId: string;
  productId: string;
  productVersion: number;
  rateTableVersion: string;
  agreementVersion: number;
  sourceSystemId: string;
  sourceQuoteId?: string;
  premium: Money;
  taxes: Money;
  fees: FeeLine[];
  coverages: CoverageOffer[];
  deductibles: Deductible[];
  exclusions: string[];
  subjectivities: Subjectivity[];
  validUntil: Date;
  quoteSnapshot: Record<string, any>;   // immutable
  status: 'valid' | 'expired' | 'withdrawn';
}

interface Placement {
  placementId: string;
  tenantId: string;                 // tenant کارگزار تا لحظه bind
  distributionAgreementId: string;
  agreementVersion: number;
  submissionId: string;
  selectedQuoteResponseId: string;
  carrierOrganizationId: string;
  brokerOrganizationId: string;
  customerPartyId: string;
  bindDate: Date;
  boundPremium: Money;
  status: 'bound' | 'issued' | 'cancelled' | 'referred';
}
```

### ۳.۸ بیمه‌نامه

```typescript
interface Policy {
  policyId: string;
  policyNumber: string;
  uniqueCode?: string;              // کد یکتا سنهاب
  tenantId: string;                 // مرز مالکیت داده و امنیت؛ هرگز با issuer یا channel جایگزین نمی‌شود
  recordOwnerOrganizationId: string;
  issuerOrganizationId: string;     // بیمه‌گر صادرکننده
  distributionOrganizationId: string; // کارگزار/آژانس/MGA
  servicingOrganizationId?: string;
  authoritativeTenantId: string;    // tenant صادرکننده در حالت federation؛ source of truth Policy
  producerPartyId?: string;         // نماینده/کارگزار فردی
  subAgentPartyId?: string;
  marketerPartyId?: string;
  salesChannelType: 'DIRECT' | 'BROKER' | 'AGENT' | 'MGA' | 'BANCASSURANCE' | 'ONLINE' | 'OFFLINE';
  sourceSystemId: string;
  externalPolicyId?: string;
  placementId?: string;
  customerPartyId: string;
  lineOfBusiness: string;
  productId: string;
  productVersion: number;
  startDate: Date;
  endDate: Date;
  premium: Money;
  taxes: Money;
  fees: FeeLine[];
  totalPayable: Money;
  coverages: Coverage[];
  deductibles: Deductible[];
  commissionSplitSnapshot: CommissionSplitSnapshot;
  status: 'inquiry' | 'bound' | 'issued' | 'active' | 'endorsed' | 'renewed' | 'cancelled';
  version: number;
}
```

### ۳.۹ کارمزد و تسویه

```typescript
interface CommissionSplit {
  splitId: string;
  journalEntryId: string;
  partyId?: string;
  organizationId: string;
  role: 'CARRIER' | 'BROKER' | 'AGENT' | 'SUB_AGENT' | 'MARKETER';
  base: 'premium_gross' | 'premium_net';
  shareBps: number;
  amount: Money;
  effectiveFrom: Date;
  status: 'accrued' | 'paid' | 'clawback' | 'voided';
}

interface LedgerAccount {
  accountId: string;
  tenantId: string;
  organizationId: string;
  code: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'CONTROL';
  currency: string;
  status: 'active' | 'closed';
}

interface JournalEntry {
  journalEntryId: string;
  tenantId: string;
  organizationId: string;
  sourceType: 'POLICY' | 'PAYMENT' | 'REFUND' | 'COMMISSION' | 'SETTLEMENT' | 'CLAWBACK';
  sourceId: string;
  idempotencyKey: string;
  postingDate: Date;
  periodId: string;
  status: 'posted' | 'reversed';
  lines: JournalLine[];
}

interface JournalLine {
  journalLineId: string;
  journalEntryId: string;
  accountId: string;
  debit: Money;
  credit: Money;
  dimensions: Record<string, string>; // carrier, broker, product, policy, branch
}

interface Payable {
  payableId: string;
  debtorOrganizationId: string;
  creditorOrganizationId: string;
  relatedPolicyId?: string;
  type: 'PREMIUM' | 'TAX' | 'LEVY' | 'FEE';
  amount: Money;
  dueDate: Date;
  status: 'open' | 'paid' | 'overdue' | 'written_off' | 'disputed';
}

interface Receivable {
  receivableId: string;
  creditorOrganizationId: string;
  debtorOrganizationId: string;
  type: 'COMMISSION' | 'BONUS' | 'SERVICE_FEE' | 'REFUND';
  amount: Money;
  dueDate: Date;
  status: 'open' | 'paid' | 'clawback' | 'written_off' | 'disputed';
}

interface SettlementBatch {
  batchId: string;
  fromOrganizationId: string;
  toOrganizationId: string;
  periodStart: Date;
  periodEnd: Date;
  totalPremium: Money;
  totalCommission: Money;
  netSettlement: Money;
  reconciliationHash: string;
  status: 'draft' | 'confirmed' | 'paid' | 'reconciled' | 'disputed';
}

// اصل حسابداری: مجموع debit و credit هر JournalEntry باید برابر باشد.
```

### ۳.۱۰ خسارت (Claims)

```typescript
interface Claim {
  claimId: string;
  tenantId: string;
  policyId: string;
  customerPartyId: string;
  brokerOrganizationId?: string;
  representativePartyId?: string;      // وکیل/کارگزار پیگیر
  carrierOrganizationId: string;
  lossDate: Date;
  reportedDate: Date;
  claimType: string;
  status: 'reported' | 'under_review' | 'adjuster_assigned' | 'approved' | 'denied' | 'settled';
  reserveAmount?: Money;
  settlementAmount?: Money;
}

interface ClaimAdvocacyCase {
  caseId: string;
  tenantId: string;
  claimId: string;
  brokerOrganizationId: string;
  customerPartyId: string;
  status: 'open' | 'waiting_carrier' | 'escalated' | 'closed';
  tasks: Task[];
  communications: Communication[];
}
```

### ۳.۱۱ مهاجرت‌های پیشنهادی

```sql
V1800000000__add_organization_and_tenant.sql
V1800000001__create_organization_capability.sql
V1800000002__create_distribution_agreement.sql
V1800000003__create_party_role_assignment.sql
V1800000004__create_broker_license.sql
V1800000005__create_global_subject_identity_link.sql
V1800000006__create_product_visibility.sql
V1800000007__create_broker_product_offering.sql
V1800000008__create_submission_quote_placement.sql
V1800000009__add_issuer_channel_to_policy.sql
V1800000010__create_commission_split.sql
V1800000011__create_payable_receivable_settlement.sql
V1800000012__create_claim_advocacy_case.sql
V1800000013__create_brand_config.sql
V1800000014__create_audit_log.sql
```

## ۴. ماتریس System-of-Record

این ماتریس برای استقرارهای فدرال (یعنی بیمه‌گر و کارگزار روی instanceهای جدا) حیاتی است.

| داده | مرجع اصلی (System of Record) | Projection مجاز در طرف مقابل | نکات |
|------|------------------------------|------------------------------|------|
| Organization | هر سازمان در instance خود | فقط نمای خواندنی با consent | از طریق federation sync |
| Product / Rate Table | بیمه‌گر | کارگزار فقط visibility/offering | بدون افشای فرمول رتبه‌بندی کامل |
| Submission / RFQ | کارگزار | بیمه‌گر فقط پاسخ به RFQ | هر RFQ یک ID canonical دارد |
| QuoteResponse | بیمه‌گر | کارگزار projection خواندنی | snapshot immutable |
| Placement | کارگزار | بیمه‌گر موافقت صدور | binding authority مشخص |
| Policy authoritative | بیمه‌گر | کارگزار projection با policyNumber و uniqueCode | منبع حقیقت اصلی بیمه‌گر است |
| Policy projection | کارگزار | — | رکورد read-only با `sourceSystemId`, `sourceVersion`, `receivedAt` |
| Placement authoritative | کارگزار تا مرحله bind؛ پس از issue، رابطه با policy بیمه‌گر immutable می‌شود | بیمه‌گر فقط bind/issue result | هر دو طرف reconciliation دارند |
| Customer Party | سازمانی که رابطه KYC را دارد | با Identity Link و consent | party در هر tenant جدا است |
| Claim decision | بیمه‌گر | کارگزار advocacy case | کارگزار نمی‌تواند مبلغ نهایی را عوض کند |
| Commission / Settlement | هر سازمان دفتر خود را دارد | reconciliation statement مشترک | Double-entry در هر طرف |
| Document | سازمانی که ایجاد کرده | با ACL share | امضای دیجیتال و digest |

## ۵. معماری سرویس‌ها (Backend)

### ۵.۱ سرویس‌های موجود و تغییرات آن‌ها

| سرویس | نقش در کارگزاری | تغییرات کلیدی |
|-------|----------------|---------------|
| `auth-service` | مدیریت Tenant، Organization، capability، نقش و توکن | افزودن `Organization` و `OrganizationCapability`؛ نقش‌های کارگزاری؛ JWT با `tenantId`, `organizationId`, `capabilities` |
| `party-kyc-service` | Party، هویت جهانی، مجوز کارگزار | افزودن `PartyRoleAssignment`, `BrokerLicense`, `GlobalSubject`, `IdentityLink` |
| `sales-network-service` | شبکه فروش، commission ledger | افزودن `DistributionAgreement`, `CommissionSplit`, رویداد `BrokerCommissionAccrued` |
| `product-service` | محصول، قیمت‌گذاری، form schema | افزودن `ProductVisibility`, `RateTableVersion`, `ProductVersion`؛ جدا کردن quote تک‌محصولی از RFQ چندبیمه‌گر |
| `policy-service` | صدور، الحاقیه، تمدید | افزودن `issuerOrganizationId`, `distributionOrganizationId`, `producerPartyId`, `subAgentPartyId`, `placementId`, `commissionSplitSnapshot` |
| `underwriting-service` | Risk appetite و ارجاع | محدود کردن appetite به `carrierId` و `distributionAgreementId`؛ قوانین referral per agreement |
| `claims-service` | خسارت | افزودن `ClaimAdvocacyCase`؛ لینک به ارزیاب خسارت از طریق workflow؛ فیلدهای broker |
| `billing-service` | صورت‌حساب و double-entry ledger | افزودن sub-ledgerهای `ClientMoney`, `PremiumPayable`, `CommissionReceivable`, `Clawback` |
| `payments-service` | پرداخت | استفاده از `EcosystemPaymentController` بانک (port 8085) با rail selection؛ حساب clearing/escrow از طریق `accountRef` محیطی resolve می‌شود و شماره حساب در کد/سند hardcode نمی‌شود |
| `collections-service` | اقساط و مطالبات | پشتیبانی از اقساط کارگزار/بیمه‌گر و تقسیم درآمد |
| `regulatory-gateway-service` | سنهاب، بیمه مرکزی | پیاده‌سازی `RealSanhabClient`؛ اعتبارسنجی مجوز کارگزار؛ گزارش per issuer + broker |
| `notification-service` | اطلاع‌رسانی | قالب white-label per brand؛ sender credential ref به Vault |
| `document-service` / `document-ai-service` | مدارک و OCR | ACL چندسازمانی؛ OCR فرم‌های مختلف بیمه‌گر |
| `workflow-service` / `orchestrator-service` | گردش کار | workflowهای multi-party شامل RFQ-to-bind، broker endorsement، broker claim advocacy |
| `api-gateway` | مسیریابی و BFF | resolve tenant از Host/audience claim؛ تزریق signed context؛ rate limit per partner |
| `reporting-service` | گزارش‌دهی | reports per organization/tenant؛ TCoR؛ commission reconciliation |
| `customer-360-service` | دید ۳۶۰ درجه مشتری | aggregation با consent؛ نشان دادن پورتفو across carriers؛ بدون تبدیل projection به source of truth |
| `copilot-service` / `knowledge-service` | AI | Next Best Action، comparison recommendation، OCR؛ فراخوانی از `ecosystem-ai-gateway` (port 8540) |
| `model-switchboard-service` / `ai-governance-service` | مدل و حاکمیت | مدل چندtenant؛ explainability؛ rate limiting per tenant |
| `fraud-service` / `aml-service` | تقلب/AML | ruleها per agreement و per carrier |

### ۵.۲ سرویس/ماژول‌های پیشنهادی جدید (یا می‌توانند ابتدا داخل سرویس موجود باشند)

| سرویس/ماژول | وظیفه | نحوه شروع |
|-------------|-------|-----------|
| `tenant-organization-service` (یا داخل `auth-service`) | مدیریت Organization، Tenant، Capability، Brand | شروع داخل `auth-service` و تفکیک تدریجی |
| `distribution-agreement-service` | `DistributionAgreement`، `OrganizationRelationship` | شروع داخل `sales-network-service` |
| `submission-placement-service` | `Submission`, `QuoteRequest`, `QuoteResponse`, `Placement` | سرویس مستقل از روز اول؛ با `product-service`, `policy-service`, `underwriting-service` ارتباط دارد |
| `carrier-connector-hub` | adapterها برای دریافت quote از بیمه‌گران خارجی | ماژول داخل `submission-placement-service` |
| `commission-settlement-service` | `CommissionSplit`, `SettlementBatch`, `Receivable`, `Payable` | شروع داخل `billing-service` |
| `claim-advocacy-service` | `ClaimAdvocacyCase` و ارتباط با ارزیاب | شروع داخل `claims-service` |

### ۵.۳ الگوی Carrier Connector

برای دریافت quote از بیمه‌گران خارجی یا سامانه‌های داخلی دیگر:

```typescript
interface CarrierConnector {
  submitRisk(risk: RiskSubmission): Promise<QuoteRequestRef>;
  requestQuote(ref: QuoteRequestRef): Promise<CanonicalQuoteResponse>;
  pollQuote(ref: QuoteRequestRef): Promise<CanonicalQuoteResponse>;
  acceptQuote(quoteId: string): Promise<BindResult>;
  uploadDocument(doc: Document): Promise<DocumentRef>;
  cancelRequest(ref: QuoteRequestRef): Promise<void>;
}
```

adapterها می‌توانند REST، SOAP، Kafka، email/manual یا internal باشند. خروجی همه به `CanonicalQuoteResponse` نرمال‌سازی می‌شود.

## ۶. فرآیندهای کسب‌وکار

### ۶.۱ RFQ تا صدور (Quote-to-Bind)

```
Customer/Broker creates Submission
       ↓
Submission-Placement Service validates data completeness
       ↓
Determine eligible carriers from DistributionAgreement
       ↓
For each carrier:
   Call internal QuoteEngine (if internal carrier)
   OR call CarrierConnector (if external carrier)
       ↓
Collect QuoteResponse with SLA and timeout handling
       ↓
Normalize and rank responses
       ↓
Apply broker recommendation rules + disclosure
       ↓
Customer/Broker selects preferred quote
       ↓
Subjectivities & documents fulfilled
       ↓
Underwriting referral if outside binding authority
       ↓
Bind Placement created
       ↓
Policy Service issues authoritative policy (issuer = carrier)
       ↓
Billing/Payments split premium and fees
       ↓
CommissionSplit accrued for broker and sub-agents
       ↓
Regulatory Gateway registers unique code (Sanhab)
       ↓
Notification delivers branded policy pack
       ↓
Settlement batch created periodically
```

### ۶.۲ Saga و Compensating Actions

هر مرحله باید دارای compensating action باشد:

| مرحله | Success | Failure / Timeout | Compensating Action |
|-------|---------|-------------------|---------------------|
| Quote received | store response | carrier timeout | mark `timeout`, notify broker, try alternatives |
| Bind | create placement | payment fail | release hold, cancel bind, notify customer |
| Issue policy | policy active | Sanhab fail | policy `pending_regulatory`, retry queue, manual resolve |
| Payment | funds captured | payment fail | reverse bind, expire quote |
| Unique code | code assigned | regulator reject | policy `rejected`, refund, notify |

## ۷. یکپارچه‌سازی بین سازمانی (Federation)

### ۷.۱ اصول

- هر سازمان یک `Organization` رکورد دارد و در instance خود صاحب داده است.
- ارتباط با OAuth2 Client Credentials یا mTLS با certificate rotation.
- JWT توکن بین سازمانی با `aud` محدود به partner و `scope`های قراردادی.
- eventها از طریق Kafka topic مشترک یا webhook signed با JWS ارسال شوند.
- Idempotency key الزامی است.
- API versioning (`/v1/partner/...`) و backward compatibility حفظ شود.
- Non-repudiation: هر event/policy doc باید digest + signature داشته باشد.
- Data residency: داده KYC در سازمان مالک باقی بماند؛ projectionها فقط با consent.

### ۷.۲ نمونه توپولوژی فدرال

```
[Broker Instance]
    tenant = broker_tenant
    Organization = BrokerCo (capability: BROKER)
    DistributionAgreement with InsurerA, InsurerB
    |
    +-- mTLS/OAuth2 --> [InsurerA Instance]
    |                     tenant = insurer_a
    |                     Organization = InsurerA (capability: CARRIER)
    |
    +-- mTLS/OAuth2 --> [InsurerB Instance]
```

در این مدل:
- Submission در broker ایجاد می‌شود.
- QuoteRequest به insurerها ارسال می‌شود.
- QuoteResponse به broker برمی‌گردد.
- Placement در broker ثبت و bind به insurer ارسال می‌شود.
- Policy authoritative در insurer ایجاد می‌شود و projection به broker ارسال می‌شود.
- Claim در broker ثبت ولی تصمیم نهایی در insurer است.

### ۷.۳ احراز هویت سرویس‌به‌سرویس

توکن مشتری که برای API کارگزار صادر شده، نباید مستقیماً برای API بیمه‌گر ارسال شود. جریان امن به این صورت است:

```text
Customer JWT (aud = broker-bff)
       ↓
Broker BFF authorizes customer and creates a scoped service request
       ↓
OAuth2 Client Credentials or RFC 8693 Token Exchange
       ↓
Insurer token:
  aud = insurer-partner-api
  sub = broker-service-client
  act = original customer subject (audited)
  agreementId = active distribution agreement
  scopes = policy:projection:read / quote:submit
       ↓
Insurer validates issuer, audience, certificate, agreement and field ACL
```

در federation باید از service token محدود، mTLS، certificate rotation، signed request، replay protection و partner-specific scopes استفاده شود. `x-tenant-context` فقط header داخلی امضاشده gateway است و هرگز جایگزین authorization مستقل downstream نیست.

## ۸. امنیت و انزوا (Security & Isolation)

### ۸.۱ اصول

- `tenantId` و `organizationId` از token JWT با signature معتبر استخراج می‌شود.
- `Host` یا `X-Tenant-Id` تنها برای resolve اولیه استفاده می‌شوند؛ اما در downstream اعتبارسنجی نمی‌شوند.
- Downstream services JWT را مستقل validate و authorize می‌کنند؛ context داخلی signed فقط برای propagation است و جایگزین authorization نمی‌شود.
- هر query روی جدول tenant-scoped باید tenant filter و در صورت وجود organization scope داشته باشد؛ policyهای PostgreSQL RLS این invariant را در سطح دیتابیس enforce می‌کنند.
- service accountها نیز باید tenant context محدود داشته باشند؛ bypass کردن RLS فقط برای migration با role جدا، زمان محدود و audit مجاز است.
- ABAC: سیاست‌هایی مانند «کارگزار فقط بیمه‌نامه‌های توزیع‌کننده خود را ببیند».
- SoD: صدور و تأیید تسویه توسط افراد متفاوت.
- Audit log برای هر create/update/delete روی Policy, Claim, Payment, Commission, Agreement.
- PII encryption at rest برای کد ملی، موبایل، شماره حساب.
- Credentialها در Vault/KMS نگهداری شوند، نه در `BrandConfig`.

### ۸.۲ مدل دسترسی در federation

```
Customer logs into Broker Portal
       ↓
Broker auth-service issues JWT with:
  - sub = iamSubjectId
  - tenantId = broker_tenant
  - organizationId = BrokerCo
  - scope = customer:policies:view
  - audience = broker-bff
       ↓
Broker BFF performs authorization and token exchange/service authentication
       ↓
InsurerA receives partner-scoped token with agreementId and field ACL
       ↓
InsurerA returns only explicitly allowed projection fields
       ↓
Broker stores projection with sourceVersion and receivedAt
```

## ۹. تجربه مشتری (Frontend)

### ۹.۱ استراتژی Frontend

- **BFF برای هر پرتال**: `customer-experience-bff`, `channel-workspace-bff`, `insurer-operations-bff`.
- **Design System مشترک**: کامپوننت‌های React/Next.js در `packages/ui` یا `services/common/ui`.
- **White-Label**: `BrandConfig` لود می‌شود؛ رنگ، لوگو، فونت، زبان، تقویم، واحد پول.
- **RTL + شمسی**: پشتیبانی از راست‌به‌چپ و Jalali Calendar.

### ۹.۲ پرتال‌ها

#### ۱) Customer Portal (`customer-portal-ui`)

- ورود با OTP (Kavenegar/Twilio).
- داشبورد بیمه‌نامه‌های تمام بیمه‌گران (اگر consent داده).
- استعلام از offering کارگزار.
- مقایسه quote و انتخاب بیمه‌گر.
- پرداخت از طریق `EcosystemPaymentController` بانک.
- ثبت خسارت و انتخاب بیمه‌گر.
- تمدید و پیگیری.

#### ۲) Channel Workspace (`channel-workspace-ui`)

این پرتال جایگزین `agent-portal-ui` می‌شود و قابلیت‌های زیر را دارد:

- داشبورد فروش.
- CRM مشتریان.
- ویزارد `Submission` و `RFQ`.
- جدول `QuoteComparison`.
- صدور `Placement` و bind.
- بیمه‌نامه‌ها به تفکیک بیمه‌گر.
- زیرمجموعه (sub-agent, marketer) و سلسله‌مراتب.
- دفتر کارمزد و تسویه.
- ثبت و پیگیری خسارت.
- بارگذاری مدارک per carrier.
- تنظیمات برند (در صورت داشتن مجوز).
- نمایش منو بر اساس `OrganizationCapability` و permissions.

#### ۳) Insurer Operations (`web-ui`)

- مدیریت Organization/Tenant.
- `DistributionAgreement` و مدیریت کارگزاران.
- `ProductVersion` و visibility.
- Risk appetite و underwriting queue.
- Claims decision و loss adjuster assignment.
- Regulatory reporting.
- Commission reconciliation.
- Executive BI.

### ۹.۳ کامپوننت‌های مشترک

| کامپوننت | مسیر | کاربرد |
|----------|------|--------|
| `QuoteComparisonTable` | `packages/ui/QuoteComparisonTable.tsx` | مقایسه side-by-side |
| `CarrierSelector` | `packages/ui/CarrierSelector.tsx` | انتخاب بیمه‌گر |
| `SubmissionWizard` | `packages/ui/SubmissionWizard.tsx` | چندمرحله‌ای RFQ |
| `PolicyTimeline` | `packages/ui/PolicyTimeline.tsx` | وضعیت صدور/خسارت |
| `CommissionLedgerCard` | `packages/ui/CommissionLedgerCard.tsx` | دفتر کارمزد |
| `SubAgentTree` | `packages/ui/SubAgentTree.tsx` | سلسله‌مراتب نمایندگان |
| `BrandWrapper` | `packages/ui/BrandWrapper.tsx` | اعمال theme/brand |
| `ConsentPanel` | `packages/ui/ConsentPanel.tsx` | مدیریت رضایت داده |

## ۱۰. یکپارچه‌سازی‌های خارجی

| سیستم | مسیر/سرویس | جزئیات |
|-------|------------|--------|
| **IAM / SSO** | `iam-service` با JWKS endpoint و OIDC discovery | تمام سرویس‌ها با `jwks-rsa` یا JWKS client خود توکن را validate می‌کنند. insurance-portal و tabibemaher قبلاً در `SecurityConfig.java` ثبت شده‌اند. |
| **سنهاب / بیمه مرکزی** | `regulatory-gateway-service` | `RealSanhabClient` واقعی با WSDL، گواهی، کلید؛ استعلام کد یکتا؛ گزارش per issuer+broker. |
| **پرداخت بانکی** | `payment-service` EcosystemPaymentController port 8085 | `POST /api/v1/ecosystem/payments/initiate` با railهای SATNA/PAYA/SHETAB و idempotency با `X-Idempotency-Key`. Insurance از `ECOSYSTEM` provider استفاده کند؛ حساب clearing/escrow با `accountRef` محیطی مانند `insurance-premium-clearing` resolve شود و شماره حساب hardcode نشود. |
| **SMS/OTP** | `notification-service` | Kavenegar برای فارسی/ایران، Twilio/SES برای بین‌المللی. sender credential در Vault. |
| **AI/LLM** | `ecosystem-ai-gateway` port 8540 | endpoints `/consult`, `/rag-compat`, `/chat-compat`, `/workflows` برای Copilot، recommendation، OCR. Insurance از این gateway استفاده کند نه banking AI. |
| **Kafka / Outbox** | `outbox-relay` + `ecosystem-common` Outbox | برای insurance، outbox-relay و DLQ قبلاً وجود دارد. ecosystem Spring Boot از `OutboxDispatcher` و `IdempotencyGuard` استفاده می‌کند. |
| **Banking AI fallback** | `ecosystem-ai-gateway.banking-ai-gateway.url` | rollback switch در صورت نیاز به banking AI قدیمی (localhost:8528). |

## ۱۱. مدل‌های استقرار

| مدل | توضیح | مناسب برای |
|-----|-------|------------|
| **Insurer-only** | یک Tenant با capability `CARRIER`؛ محصولات مستقیم + شبکه نمایندگی | شرکت بیمه |
| **Broker-only** | یک Tenant با capability `BROKER`؛ چند DistributionAgreement با بیمه‌گران | شرکت کارگزاری |
| **MGA/Hybrid** | یک Tenant با capabilityهای `CARRIER` و `BROKER` | کارگزار با صلاحیت صدور |
| **SaaS Multi-tenant** | چند Organization روی یک instance با row-level isolation | ارائه‌دهنده پلتفرم |
| **Federated Nodes** | هر سازمان instance جدا با mTLS/OAuth2/event sync | بیمه‌گران بزرگ با IT مستقل |
| **Super-app / Marketplace** | customer از app واحد وارد شده و به broker/carrier مناسب هدایت می‌شود | Shaxi super-app |

## ۱۲. NFR، تست، Observability و Migration

### ۱۲.۱ NFR

| شاخص | هدف |
|------|-----|
| Availability | 99.95٪ برای پرتال؛ 99.9٪ برای backend |
| Quote latency (internal) | p95 < 500ms |
| External carrier quote | SLA < 5s sync یا async with callback |
| Throughput | 1000 quote/min per tenant |
| RTO | < 1h برای خدمات حیاتی |
| RPO | < 15min |
| Data retention | 10 سال برای Policy/Claim؛ 7 سال برای audit log |

### ۱۲.۲ Observability

- Distributed tracing با OpenTelemetry و Jaeger.
- Metrics با Prometheus؛ alerting با Alertmanager.
- Logs با Loki؛ correlationId در همه سرویس‌ها.
- Kafka consumer lag monitoring.
- DLQ monitoring.
- Settlement reconciliation dashboard.

### ۱۲.۳ تست

- **Contract tests** برای هر OpenAPI/AsyncAPI.
- **Unit/Integration tests** برای quote engine، commission split، settlement.
- **E2E tests** با Playwright/Cypress برای quote-to-bind و claim.
- **Tenant isolation tests**: یک tenant نباید داده tenant دیگر را ببیند.
- **Federation tests**: round-trip RFQ بین دو instance.
- **Idempotency tests**: duplicate request handling.
- **SoD tests**: صدور و تسویه توسط یک نفر نشود.
- **Security tests**: JWT tampering، header spoofing، ABAC bypass.

### ۱۲.۴ Migration

- فازبندی مهاجرت بر اساس `Organization` جدید.
- **Zero-downtime migration**: expand schema، backfill، dual-read، dual-write کنترل‌شده، invariant validation، cutover، سپس حذف legacy؛ بدون rename مخرب `tenantId`.
- Backfill `issuerOrganizationId` و `distributionOrganizationId` از روی `tenantId` و `producerOrgUnitId` موجود؛ رکوردهای مبهم در quarantine قرار گیرند و حدس زده نشوند.
- Reconciliation با مقایسه policy count، premium total، status distribution، commission total و hash نمونه رکوردها.
- Feature flag فقط برای rollout است و نباید جایگزین authorization شود.
- هر migration دارای rollback plan، backup verification، dry-run و runbook باشد.

## ۱۳. قرارداد رویدادها و API

تمام APIها و eventها باید در repository قراردادها versioned و قابل تست باشند؛ ادعای «Event-First» بدون contract قابل قبول نیست.

### ۱۳.۱ Envelope اجباری رویداد

```typescript
interface DomainEventEnvelope<T> {
  eventId: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: string;
  producer: string;
  tenantId: string;
  organizationId: string;
  correlationId: string;
  causationId?: string;
  idempotencyKey: string;
  dataClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'PII';
  subject: { type: string; id: string };
  data: T;
}
```

### ۱۳.۲ رویدادهای اصلی

```text
SubmissionCreated.v1
QuoteRequested.v1
CarrierQuoteReceived.v1
QuoteExpired.v1
QuoteSelected.v1
RiskReferred.v1
BindRequested.v1
BindConfirmed.v1
PolicyIssued.v1
PolicyProjected.v1
PremiumCollected.v1
CommissionAccrued.v1
CommissionClawedBack.v1
SettlementStatementIssued.v1
SettlementReconciled.v1
ClaimRegistered.v1
ClaimDecisionReceived.v1
ConsentGranted.v1
ConsentRevoked.v1
```

برای هر event باید schema، owner، compatibility policy، retention، ACL، retry/DLQ، consumer contract و reconciliation procedure ثبت شود. انتشار باید با Outbox و مصرف با idempotency انجام شود.

## ۱۴. کنترل‌های کسب‌وکار، افشا و رتبه‌بندی

- ranking quote نباید فقط بر اساس کمیسیون باشد؛ premium، پوشش، exclusions، SLA، solvency/quality و نیاز مشتری باید قابل توضیح باشند.
- هر recommendation باید `reasonCodes`، نسخه rule و timestamp داشته باشد.
- recommendation و AI فقط تصمیم‌یار است؛ بدون policy decision، approval و audit انسانی حق bind/issue ندارد.
- داده PII نباید به LLM/OCR provider ارسال شود مگر با consent، data minimization، provider allow-list و ثبت audit.
- conflict of interest و commission disclosure قبل از انتخاب مشتری نمایش داده شود.
- fee/markup فقط در صورت مجاز بودن طبق مقررات، قرارداد و approval workflow اعمال شود؛ در غیر این صورت به‌صورت `brokerServiceFee` مستقل و شفاف ثبت شود.
- quote، rate table، product form و commission rule باید immutable version داشته باشند.
- quote در زمان bind دوباره از نظر expiry، agreement، license، consent، payment authority و binding limit اعتبارسنجی شود.

## ۱۵. معیارهای پذیرش نهایی

| حوزه | معیار پذیرش |
|------|-------------|
| Isolation | کاربر/توکن/tenant نتواند داده tenant یا organization دیگر را بخواند یا تغییر دهد؛ با تست منفی واقعی اثبات شود |
| Identity | یک customer بتواند با consent معتبر projection چند insurer را ببیند و revoke consent فوراً دسترسی آینده را قطع کند |
| Quote | حداقل یک carrier داخلی، یک connector خارجی و یک مسیر manual با timeout، retry، snapshot و expiry کار کند |
| Bind | bind/issue/payment/regulatory failureها Saga و compensating action قابل مشاهده داشته باشند |
| Policy | policy authoritative فقط در insurer ثبت شود و projection idempotent، versioned و قابل reconciliation باشد |
| Finance | هر تراکنش journal دوطرفه متوازن، immutable و idempotent تولید کند؛ refund و clawback پوشش داده شود |
| Federation | token exchange یا service token، mTLS، scope، audience، replay protection و audit end-to-end تست شود |
| Compliance | license، agreement، commission، consent و Sanhab status قبل از عملیات حساس کنترل شود |
| Frontend | customer، broker/agent و insurer workspace با capability/permission صحیح و brand مستقل کار کنند |
| Operations | metrics، trace، DLQ، consumer lag، projection freshness و settlement discrepancy alert داشته باشند |
| Migration | dry-run، backup restore، reconciliation و rollback قبل از cutover موفق باشد |

## ۱۶. نقشه راه فازها (Vertical Slices)

| فاز | محور | خروجی |
|-----|------|-------|
| **P0 — Foundation** | Organization/Tenant/Capability/Brand؛ IAM؛ ABAC؛ Identity Linking؛ System-of-Record matrix | امکان ثبت بیمه‌گر/کارگزار/MGA در یک پلتفرم |
| **P1 — Distribution & Product** | DistributionAgreement؛ Product version/visibility؛ BrokerProductOffering | کارگزار می‌تواند محصولات بیمه‌گر را ببیند و offering بسازد |
| **P2 — Quote-to-Bind** | Submission/RFQ؛ CarrierConnector hub； canonical QuoteResponse؛ Placement； bind workflow | مقایسه و انتخاب بیمه‌گر و صدور placement |
| **P3 — Policy & Commission** | تغییر Policy؛ commission split؛ billing ledger | صدور بیمه‌نامه با attribution کامل و کارمزد دقیق |
| **P4 — Payments & Settlement** | EcosystemPaymentController؛ escrow؛ payable/receivable؛ settlement batch | پرداخت و تسویه با بیمه‌گران |
| **P5 — Claims Advocacy** | ClaimAdvocacyCase؛ workflow با ارزیاب خسارت؛ projection | پیگیری خسارت توسط کارگزار |
| **P6 — Regulatory & Reporting** | Sanhab واقعی؛ unique code؛ broker transaction report؛ TCoR/BI | انطباق و گزارش‌دهی |
| **P7 — Experience & AI** | Channel Workspace؛ Customer Portal white-label؛ Copilot/NBA/OCR | تجربه مشتری و ارزش افزوده |
| **P8 — Federation** | mTLS/OAuth2 token exchange؛ partner API gateway؛ signed events؛ projection/reconciliation | استقرار مستقل اما یکپارچه؛ الزامات federation از P0 طراحی می‌شوند و در P8 عملیاتی می‌گردند |

## ۱۷. ریسک‌ها و پیش‌فرض‌ها

### ریسک‌ها

- تغییر مدل `Policy` و `Tenant` می‌تواند migration پیچیده‌ای ایجاد کند.
- بیمه‌گران خارجی API ندارند؛ نیاز به carrier connector manual یا ایمیلی.
- قوانین کارمزد و tax در ایران ممکن است تغییر کند؛ مدل باید rule-driven باشد.
- Sanhab واقعی نیازمند گواهی و قرارداد با بیمه مرکزی است.
- استقرار فدرال پیچیدگی امنیتی و consistency بالا دارد.

### پیش‌فرض‌ها

- تیم به TypeORM/NestJS/Spring Boot/React/Next.js تسلط دارد.
- PostgreSQL برای persistence اصلی استفاده می‌شود.
- Kafka برای event backbone موجود است.
- Vault/KMS برای نگهداری credential در دسترس خواهد بود.
- OpenTelemetry/Jaeger/Prometheus/Loki برای observability در دسترس است.
- قوانین حقوقی، مالیاتی، کارمزد و retention توسط Compliance/Legal تأیید می‌شوند؛ مقادیر این سند جایگزین نظر حقوقی نیستند.
- contract repository مرجع رسمی OpenAPI/AsyncAPI است و هر تغییر API/event با compatibility check و approval منتشر می‌شود.

### تصمیم‌های غیرقابل مذاکره پیش از کدنویسی

1. تصویب مدل `Organization/Tenant/Party` و System-of-Record توسط Architecture Board.
2. تصویب مدل حسابداری و chart of accounts توسط Finance/Accounting.
3. تصویب DistributionAgreement، commission/fee و disclosure توسط Legal/Compliance.
4. تعریف connector contract و یک carrier pilot واقعی.
5. تصویب threat model، token exchange، mTLS و tenant isolation test plan.
6. ثبت API/event contractها در repository رسمی و ساخت contract-test pipeline.
7. تعیین owner، SLA، SLO و runbook برای هر bounded context.

## ۱۸. فایل‌های کلیدی برای شروع

- `services/auth-service/src/role-hierarchy.ts`
- `services/auth-service/src/permissions.ts`
- `services/party-kyc-service/src/entities/Party.ts`
- `services/sales-network-service/src/entities/SalesPartner.ts`
- `services/sales-network-service/src/entities/CommissionContract.ts`
- `services/product-service/src/entities/Product.ts`
- `services/product-service/src/quote-engine.ts`
- `services/policy-service/src/entities/Policy.ts`
- `services/policy-service/src/policy.service.ts`
- `services/claims-service/src/entities/Claim.ts`
- `services/billing-service/src/entities/*`
- `services/payments-service/src/entities/*`
- `services/regulatory-gateway-service/src/sanhab-clients/real-sanhab.client.ts`
- `services/regulatory-gateway-service/src/sanhab-clients/mock-sanhab.client.ts`
- `services/customer-portal-ui/src/app/page.tsx`
- `services/agent-portal-ui/src/pages/index.tsx`
- `services/web-ui/src/app/sales-network/page.tsx`
- `D:\CascadeProjects\ecosystem\contracts\openapi\insurance-service\openapi.yaml`
- `D:\CascadeProjects\ecosystem\contracts\asyncapi\insurance-service\asyncapi.yaml`
