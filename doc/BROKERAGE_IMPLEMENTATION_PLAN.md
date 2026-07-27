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

### ۳.۱ Organization و قابلیت‌های سازمانی

```typescript
// Organization (شخصیت حقوقی و تجاری)
interface Organization {
  organizationId: string;       // UUID یا کد ملی/ثبت‌شده
  legalType: 'person' | 'company' | 'government';
  nationalId?: string;          // کد ملی/شناسه ملی
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
  bindingAuthorityLimit?: Money;
  effectiveFrom: Date;
  effectiveTo?: Date;
  status: 'active' | 'suspended';
}

// روابط بین سازمانی (graph چندبه‌چند)
interface OrganizationRelationship {
  relationshipId: string;
  sourceOrganizationId: string;    // مثلاً بیمه‌گر
  targetOrganizationId: string;    // مثلاً کارگزار
  relationshipType: 'carrier_broker' | 'mga_carrier' | 'agency_carrier' | 'sub_agent' | 'referrer';
  distributionAgreementId?: string;
  validFrom: Date;
  validTo?: Date;
  status: 'active' | 'expired' | 'terminated';
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
  primaryIdentifiers: Identifier[];
  iamSubjectId?: string;        // sub در iam-service
  consentRecords: ConsentRecord[];
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
  customerPartyId: string;
  brokerOrganizationId: string;
  brokerTenantId: string;
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
  submissionId: string;
  carrierOrganizationId: string;
  productId: string;
  requestPayload: Record<string, any>;
  sentAt: Date;
  slaDeadline: Date;
  status: 'pending' | 'received' | 'timeout' | 'error';
}

interface QuoteResponse {
  quoteResponseId: string;
  quoteRequestId: string;
  carrierOrganizationId: string;
  productId: string;
  productVersion: number;
  rateTableVersion: string;
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
  operatingTenantId: string;          // tenant صاحب رکورد
  issuerOrganizationId: string;       // بیمه‌گر صادرکننده
  issuerTenantId?: string;          // در federation الزامی
  distributionOrganizationId: string; // کارگزار/آژانس/قنال
  producerPartyId?: string;         // نماینده/کارگزار فردی
  subAgentPartyId?: string;
  marketerPartyId?: string;
  salesChannelType: 'DIRECT' | 'BROKER' | 'AGENT' | 'MGA' | 'BANCASSURANCE' | 'ONLINE' | 'OFFLINE';
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
  ledgerEntryId: string;
  partyId: string;
  organizationId: string;
  role: 'CARRIER' | 'BROKER' | 'AGENT' | 'SUB_AGENT' | 'MARKETER';
  base: 'premium_gross' | 'premium_net';
  shareBps: number;
  amount: Money;
  status: 'accrued' | 'paid' | 'clawback';
}

interface Payable {
  payableId: string;
  debtorOrganizationId: string;     // مثلاً کارگزار
  creditorOrganizationId: string;   // مثلاً بیمه‌گر
  relatedPolicyId?: string;
  type: 'PREMIUM' | 'TAX' | 'LEVY' | 'FEE';
  amount: Money;
  dueDate: Date;
  status: 'open' | 'paid' | 'overdue' | 'written_off';
}

interface Receivable {
  receivableId: string;
  creditorOrganizationId: string;   // طلبکار
  debtorOrganizationId: string;     // بدهکار
  type: 'COMMISSION' | 'BONUS' | 'SERVICE_FEE' | 'REFUND';
  amount: Money;
  dueDate: Date;
  status: 'open' | 'paid' | 'clawback' | 'written_off';
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
  status: 'draft' | 'confirmed' | 'paid' | 'reconciled';
}
```

### ۳.۱۰ خسارت (Claims)

```typescript
interface Claim {
  claimId: string;
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
| Policy projection | کارگزار | — | مرجع اصلی بیمه‌گر |
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
| `payments-service` | پرداخت | استفاده از `EcosystemPaymentController` بانک (port 8085) با rail selection و escrow accounts (1000000003 insurance) |
| `collections-service` | اقساط و مطالبات | پشتیبانی از اقساط کارگزار/بیمه‌گر و تقسیم درآمد |
| `regulatory-gateway-service` | سنهاب، بیمه مرکزی | پیاده‌سازی `RealSanhabClient`؛ اعتبارسنجی مجوز کارگزار؛ گزارش per issuer + broker |
| `notification-service` | اطلاع‌رسانی | قالب white-label per brand؛ sender credential ref به Vault |
| `document-service` / `document-ai-service` | مدارک و OCR | ACL چندسازمانی؛ OCR فرم‌های مختلف بیمه‌گر |
| `workflow-service` / `orchestrator-service` | گردش کار | workflowهای multi-party شامل RFQ-to-bind، broker endorsement، broker claim advocacy |
| `api-gateway` | مسیریابی و BFF | resolve tenant از Host/audience claim؛ تزریق signed context؛ rate limit per partner |
| `reporting-service` | گزارش‌دهی | reports per organization/tenant؛ TCoR؛ commission reconciliation |
| `customer-360-service` | دید ۳۶۰ درجه مشتری | aggregation با consent؛ نشان دادن پورتفو across carriers |
| `copilot-service` / `knowledge-service` | AI | Next Best Action، comparison recommendation، OCR؛ فراخوani از `ecosystem-ai-gateway` (port 8540) |
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

## ۸. امنیت و انزوا (Security & Isolation)

### ۸.۱ اصول

- `tenantId` و `organizationId` از token JWT با signature معتبر استخراج می‌شود.
- `Host` یا `X-Tenant-Id` تنها برای resolve اولیه استفاده می‌شوند؛ اما در downstream اعتبارسنجی نمی‌شوند.
- Downstream services فقط claim امضاشده `x-tenant-context` یا `x-organization-context` را می‌پذیرند.
- هر کوئری پایگاه‌داده باید شامل `tenant_id` و `organization_id` باشد (row-level security).
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
  - sub = customer globalSubjectId
  - tenantId = broker_tenant
  - organizationId = BrokerCo
  - scope = customer:policies:view
  - audience restricted to BrokerCo APIs
       ↓
Broker requests Policy projection from InsurerA
       ↓
InsurerA validates token (or service-token) and ACL
       ↓
InsurerA returns only allowed fields
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
| **پرداخت بانکی** | `payment-service` EcosystemPaymentController port 8085 | `POST /api/v1/ecosystem/payments/initiate` با rails SATNA/PAYA/SHETAB، escrow account 1000000003، idempotency با `X-Idempotency-Key`. Insurance از `ECOSYSTEM` provider استفاده کند. |
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
-zero-downtime: dual-write read-old then read-new.
- Backfill `issuerOrganizationId` و `distributionOrganizationId` از روی `tenantId` و `producerOrgUnitId` موجود.
- Reconciliation بعد از migration با مقایسه policy count و premium total.
- Feature flag برای enable/disable broker capabilities.

## ۱۳. نقشه راه فازها (Vertical Slices)

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
| **P8 — Federation** | mTLS/OAuth2 cross-org؛ partner API gateway؛ signed events | استقرار مستقل اما یکپارچه |

## ۱۴. ریسک‌ها و پیش‌فرض‌ها

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

## ۱۵. فایل‌های کلیدی برای شروع

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
