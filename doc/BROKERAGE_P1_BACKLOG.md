# بکلاگ اجرایی فاز P1 — Distribution & Product

هدف فاز P1 این است که پس از آماده‌سازی زیرساخت Organization/Tenant در P0، محصولات بیمه‌گر قابل تعریف، نسخه‌بندی، قابل مشاهده و قابل ارائه توسط کارگزار شوند. این فاز مستقیماً به P0 وابسته است و زمینه P2 (Quote-to-Bind) را فراهم می‌کند.

## اصول کلی P1

- Product/Rate Table authoritative در بیمه‌گر است.
- کارگزار فقط `ProductVisibility` و `BrokerProductOffering` دارد؛ فرمول رتبه‌بندی و rate table کامل در اختیار کارگزار قرار نمی‌گیرد.
- هر product دارای `version`، `status lifecycle` و `effective period` است.
- visibility بر اساس `DistributionAgreement` و `OrganizationCapability` کنترل می‌شود.
- offering کارگزار بر اساس محصولات مجاز بیمه‌گر ساخته می‌شود و snapshot از agreement version نگهداری می‌کند.
- همه APIها و eventها در contract repository ثبت می‌شوند.

---

## P1-0 — پیش‌نیازها از P0

قبل از شروع P1، موارد زیر باید کامل و تست‌شده باشند:

- P0-1: Organization/Tenant/Capability
- P0-2: Party/Identity/Role
- P0-4: DistributionAgreement (basic CRUD + active/inactive)
- P0-6: ABAC
- P0-7: Data Isolation/RLS
- P0-9: Contract Repository

---

## P1-1 — مدیریت محصول و نسخه‌بندی

### P1-1.1 موجودیت Product

**هدف**: بازطراحی Product برای پشتیبانی از نسخه، چند tenant/organization و federation.

**فایل‌ها**:
- `services/product-service/src/entities/Product.ts`
- `services/product-service/src/entities/CoverageDefinition.ts`
- `services/product-service/src/entities/RateTableVersion.ts`
- `services/product-service/src/entities/ProductVersion.ts`

**موجودیت‌ها**:

```typescript
interface Product {
  productId: string;
  tenantId: string;
  ownerTenantId: string;
  ownerOrganizationId: string;
  productCode: string;
  lineOfBusiness: string;
  status: 'draft' | 'active' | 'retired';
  currentVersion: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductVersion {
  productVersionId: string;
  productId: string;
  version: number;
  status: 'draft' | 'active' | 'superseded' | 'retired';
  effectiveFrom: Date;
  effectiveTo?: Date;
  coverages: CoverageDefinition[];
  ratingTables: RateTableVersion[];
  formSchema: JSONSchema;
  requiredDocuments: DocumentRequirement[];
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
}

interface CoverageDefinition {
  coverageId: string;
  productVersionId: string;
  code: string;
  name: string;
  description: string;
  type: 'mandatory' | 'optional';
  minLimit?: Money;
  maxLimit?: Money;
  deductibleOptions: Deductible[];
  defaultSelected: boolean;
}

interface RateTableVersion {
  rateTableVersionId: string;
  productVersionId: string;
  version: number;
  algorithmType: 'table' | 'formula' | 'ml_model';
  // الگوریتم/فرمول فقط در اختیار بیمه‌گر یا ML inference قرار دارد
  parametersSchema: JSONSchema;
  status: 'draft' | 'active' | 'superseded';
}
```

**مهاجرت‌ها**:
- `V1810000000__add_owner_organization_to_product.sql`
- `V1810000004__add_owner_tenant_to_product.sql`
- `V1810000001__create_product_version.sql`
- `V1810000002__create_coverage_definition.sql`
- `V1810000003__create_rate_table_version.sql`

**معیار پذیرش**:
- product فقط در tenant/organization بیمه‌گر owner قابل ایجاد است.
- یک product فقط یک نسخه `active` می‌تواند داشته باشد.
- `ProductVersion` immutable است؛ ویرایش منجر به نسخه جدید می‌شود.
- rate table/formula به کارگزار expose نمی‌شود.

### P1-1.2 API مدیریت محصول

**فایل‌ها**:
- `services/product-service/src/product.controller.ts` (بازبینی)
- `services/product-service/src/product.service.ts` (بازبینی)

**APIهای پیشنهادی**:

```text
POST /api/v1/products
GET /api/v1/products
GET /api/v1/products/{productId}
GET /api/v1/products/{productId}/versions
POST /api/v1/products/{productId}/versions
POST /api/v1/products/{productId}/versions/{version}/activate
POST /api/v1/products/{productId}/versions/{version}/retire
POST /api/v1/products/{productId}/versions/{version}/clone
```

**معیار پذیرش**:
- فقط `ownerOrganizationId` مربوط به Organization با capability `CARRIER` یا `MGA` می‌تواند product ایجاد کند.
- activate یک نسخه جدید باعث supersede شدن نسخه قبلی می‌شود.
- API دارای filtering و pagination بر اساس tenant/organization/lineOfBusiness است.

**وابستگی**: P0-1.1، P0-6.1

---

## P1-2 — Product Visibility

### P1-2.1 موجودیت ProductVisibility

**هدف**: تعیین کدام محصولات بیمه‌گر برای کدام کارگزار/آژانس قابل مشاهده هستند.

**فایل‌ها**:
- `services/product-service/src/entities/ProductVisibility.ts`

**موجودیت**:

```typescript
interface ProductVisibility {
  visibilityId: string;
  tenantId: string;
  productId: string;
  productVersion: number;
  distributorOrganizationId?: string; // null = همه مجاز
  visibilityType: 'private' | 'exclusive' | 'marketplace';
  distributionAgreementId: string;
  agreementVersionAtCreation: number;
  markupRules?: MarkupRule[];
  allowedTerritories: string[];
  allowedSalesChannels: string[];
  status: 'draft' | 'active' | 'revoked';
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
}
```

**مهاجرت**:
- `V1810000010__create_product_visibility.sql`

**معیار پذیرش**:
- visibility فقط برای product با `active` version قابل تعریف است.
- `distributorOrganizationId` باید با `distributionAgreement.distributorOrganizationId` مطابقت داشته باشد.
- بازه زمانی visibility در بازه effective قرارداد باشد.
- `markupRules` فقط در صورت مجاز بودن طبق قرارداد قابل ذخیره است.

### P1-2.2 API Product Visibility

**APIهای پیشنهادی**:

```text
POST /api/v1/products/{productId}/visibility
GET /api/v1/products/{productId}/visibility
PATCH /api/v1/products/{productId}/visibility/{visibilityId}
POST /api/v1/products/{productId}/visibility/{visibilityId}/revoke
GET /api/v1/distributors/{distributorOrganizationId}/visible-products
```

**معیار پذیرش**:
- کارگزار فقط محصولات مربوط به توزیع‌کننده خود را می‌بیند.
- تست منفی: کارگزار A نمی‌تواند visibility کارگزار B را ببیند.
- فقط carrier owner یا کاربر با مجوز `insurer:products:publish` می‌تواند visibility ایجاد کند.

**وابستگی**: P1-1.1، P0-4.1

---

## P1-3 — Broker Product Offering

### P1-3.1 موجودیت BrokerProductOffering

**هدف**: کارگزار بتواند bundle، name و description سفارشی روی محصولات مجاز بیمه‌گر بسازد.

**فایل‌ها**:
- `services/product-service/src/entities/BrokerProductOffering.ts`
- `services/product-service/src/entities/BundleRule.ts`
- `services/product-service/src/entities/RecommendationRule.ts`

**موجودیت**:

```typescript
interface BrokerProductOffering {
  offeringId: string;
  tenantId: string;
  brokerTenantId: string;
  brokerOrganizationId: string;
  name: string;
  description: string;
  includedProductIds: string[];
  bundleRules: BundleRule[];
  recommendationRules: RecommendationRule[];
  markupRules?: MarkupRule[];
  allowedSalesChannels: string[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  status: 'active' | 'inactive';
}

interface BundleRule {
  ruleId: string;
  offeringId: string;
  productIds: string[];
  discountBps?: number;
  reasonCode: string;
}

interface RecommendationRule {
  ruleId: string;
  offeringId: string;
  priority: number;
  criteria: Record<string, any>;
  rankWeight: Record<string, number>;
  reasonCode: string;
}
```

**مهاجرت**:
- `V1810000020__create_broker_product_offering.sql`
- `V1810000021__create_bundle_rule.sql`
- `V1810000022__create_recommendation_rule.sql`

**معیار پذیرش**:
- offering فقط شامل productIds باشد که visibility `active` برای brokerOrganizationId داشته باشند.
- `markupRules` با قرارداد مربوطه سازگار است.
- recommendation weight فقط از فاکتورهای مجاز استفاده می‌کند.
- توضیح reasonCode برای هر recommendation الزامی است.

### P1-3.2 API Broker Product Offering

**APIهای پیشنهادی**:

```text
POST /api/v1/broker-offerings
GET /api/v1/broker-offerings
GET /api/v1/broker-offerings/{offeringId}
PATCH /api/v1/broker-offerings/{offeringId}
POST /api/v1/broker-offerings/{offeringId}/activate
POST /api/v1/broker-offerings/{offeringId}/inactivate
GET /api/v1/customers/offerings?lineOfBusiness=...
```

**معیار پذیرش**:
- API `/customers/offerings` فقط `active` offeringهای مرتبط با کارگزار فعلی را برمی‌گرداند.
- هر offering شامل لیست بیمه‌گران زیرین و دلیل recommendation است.
- ranking قابل توضیح (explainable) باشد.

**وابستگی**: P1-2.1

---

## P1-4 — Distribution Agreement Lifecycle

### P1-4.1 پیشرفت قرارداد توزیع

**هدف**: آماده‌سازی قرارداد برای P2؛ اضافه کردن eligibility، approval workflow و binding authority profile.

**فایل‌ها**:
- `services/sales-network-service/src/entities/DistributionAgreement.ts` (بازبینی)
- `services/sales-network-service/src/entities/BindingAuthorityProfile.ts`

**موجودیت‌های تکمیلی**:

```typescript
interface BindingAuthorityProfile {
  profileId: string;
  agreementId: string;
  lineOfBusiness: string;
  maxPerRisk: Money;
  maxAggregate: Money;
  currency: string;
  autoBind: boolean;
  referralThreshold: Money;
}

interface AgreementApproval {
  approvalId: string;
  agreementId: string;
  approverPartyId: string;
  decision: 'approved' | 'rejected';
  comment?: string;
  approvedAt: Date;
}
```

**مهاجرت**:
- `V1810000030__create_binding_authority_profile.sql`
- `V1810000031__create_agreement_approval.sql`

**معیار پذیرش**:
- agreement فقط پس از `approved` و `effectiveFrom` قابل استفاده در RFQ است.
- binding authority per lineOfBusiness در eligibility بررسی می‌شود.
- autoBind فقط در صورت وجود توافق و اعتبار مالی کارگزار فعال است.

### P1-4.2 API Eligibility و Approval

**APIهای پیشنهادی**:

```text
POST /api/v1/distribution-agreements/{agreementId}/submit-for-approval
POST /api/v1/distribution-agreements/{agreementId}/approve
POST /api/v1/distribution-agreements/{agreementId}/reject
GET /api/v1/distribution-agreements/{agreementId}/eligibility?lineOfBusiness=...&riskAmount=...
```

**معیار پذیرش**:
- Eligibility برای risk کمتر از maxPerRisk و در aggregate limit `true` برمی‌گرداند.
- Eligibility برای risk بیشتر `referral` یا `false` برمی‌گرداند.
- SoD: approver نمی‌تواند همان personی باشد که agreement را ایجاد کرده، مگر با workflow override ثبت‌شده.

**وابستگی**: P0-4.1، P0-3.1

---

## P1-5 — Product Catalog BFF

### P1-5.1 سرویس catalog-bff

**هدف**: تجمیع محصولات، visibility و offering برای پرتال‌ها.

**فایل‌ها**:
- `services/catalog-bff/src/catalog.controller.ts`
- `services/catalog-bff/src/catalog.service.ts`

**APIهای پیشنهادی**:

```text
GET /api/v1/catalog/products
GET /api/v1/catalog/products/{productId}
GET /api/v1/catalog/offerings
GET /api/v1/catalog/offerings/{offeringId}/comparison-hint
```

**معیار پذیرش**:
- API صرفاً view model مشتری/کارگزار را برمی‌گرداند؛ rate table/formula expose نمی‌شود.
- هر پاسخ شامل `tenantId`, `organizationId`, `productVersion`, `agreementVersion` است.
- caching با TTL مناسب و cache invalidation در تغییر نسخه product.

**وابستگی**: P1-1.2، P1-2.2، P1-3.2

---

## P1-6 — Event‌های محصول و visibility

### P1-6.1 Event Contract P1

**هدف**: ثبت eventهای این فاز در contract repository.

**eventهای پیشنهادی**:

```text
ProductCreated.v1
ProductVersionActivated.v1
ProductVersionRetired.v1
ProductVisibilityGranted.v1
ProductVisibilityRevoked.v1
BrokerProductOfferingCreated.v1
BrokerProductOfferingActivated.v1
DistributionAgreementApproved.v1
DistributionAgreementTerminated.v1
```

**Envelope**:

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

**معیار پذیرش**:
- تمام eventهای فوق در AsyncAPI ثبت شوند.
- producer و consumer contract testها در CI pass شوند.
- انتشار با Outbox و مصرف با idempotency انجام شود.

**وابستگی**: P0-9.1

---

## P1-7 — تست و کیفیت

### P1-7.1 تست‌های واحد و یکپارچگی

**فایل‌ها**:
- `services/product-service/test/product-version.e2e-spec.ts`
- `services/product-service/test/visibility-isolation.e2e-spec.ts`
- `services/sales-network-service/test/distribution-agreement-eligibility.e2e-spec.ts`

**تست‌های الزامی**:

- product version lifecycle (draft → active → superseded → retired)
- visibility isolation بین کارگزاران
- offering فقط شامل visible products
- eligibility binding authority
- ABAC: کارگزار نمی‌تواند product بیمه‌گر دیگر را ببیند
- event contract test

**معیار پذیرش**:
- coverage > 75٪ برای product-service و sales-network-service
- هیچ test skip نشود
- تست‌ها با داده واقعی (PostgreSQL Testcontainers) اجرا شوند

### P1-7.2 تست امنیت

**تست‌ها**:

- tenant isolation برای product/visibility/offering
- حذف یا mask کردن rate table/formula در response کارگزار
- تلاش برای create product با capability `BROKER` رد شود

**وابستگی**: P0-7

---

## P1-8 — Migration داده‌های موجود

### P1-8.1 Backfill محصولات

**هدف**: تبدیل محصولات موجود به مدل version/visibility.

**اقدامات**:
- ایجاد `Product` با `ownerOrganizationId` استخراج‌شده از `tenantId` موجود.
- ایجاد `ProductVersion` اولیه با version 1.
- مهاجرت coverageها و rate tableهای موجود به جداول جدید.
- ایجاد `ProductVisibility` برای توزیع‌کنندگان موجود (بر اساس `SalesPartner` یا `CommissionContract`).

### P1-8.2 Reconciliation

**معیار پذیرش**:
- تعداد محصولات قبل و بعد از migration برابر است.
- هیچ product بدون ownerOrganizationId باقی نماند.
- هیچ `ProductVersion` بدون `productId` معتبر نماند.
- رکوردهای مبهم در `migration_quarantine` قرار گیرند.

**وابستگی**: P0-10

---

## نقشه زمانی P1

```text
Week 1:
  P1-1.1, P1-1.2 (Product & Versioning)
  P1-2.1, P1-2.2 (Product Visibility)

Week 2:
  P1-3.1, P1-3.2 (Broker Product Offering)
  P1-4.1, P1-4.2 (Distribution Agreement Lifecycle & Eligibility)

Week 3:
  P1-5.1 (Catalog BFF)
  P1-6.1 (Event Contract)
  P1-7.1, P1-7.2 (Tests)

Week 4:
  P1-8.1, P1-8.2 (Migration & Reconciliation)
  Bug fixing, contract tests, security review
```

---

## معیارهای خروج P1

P1 کامل است اگر و فقط اگر:

- بیمه‌گر بتواند product با version و coverage/rate table تعریف کند.
- بیمه‌گر بتواند visibility به کارگزار/آژانس بدهد یا لغو کند.
- کارگزار بتواند offering بر اساس محصولات مجاز بسازد.
- قرارداد توزیع دارای lifecycle، approval و binding authority باشد.
- API/catalog فقط اطلاعات مجاز را expose کند؛ rate table/formula مخفی بماند.
- ABAC و RLS تست شده باشند.
- OpenAPI/AsyncAPI برای همه APIهای جدید ثبت شده باشد.
- migration با reconciliation موفق انجام شده باشد.

---

## اصلاحات و تکمیلی پس از تطبیق با BROKERAGE_IMPLEMENTATION_PLAN.md

### P1-8 — Business Controls و Commission/Markup Disclosure

**هدف**: پوشش الزامات بخش ۱۴ سند طراحی (Business Controls) در فاز Distribution & Product.

**اقدامات**:
- هر `BrokerProductOffering` حتماً snapshot از `agreementVersion` و `distributionAgreementId` نگه دارد.
- API `/customers/offerings` علاوه بر ranking، `conflictOfInterest` و `commissionDisclosure` را برگرداند.
- هر `MarkupRule` و `brokerServiceFee` قبل از نمایش به مشتری `disclosure` شود و در quote/facture به‌صورت خط جداگانه ثبت گردد.
- `ProductVersion` immutable است؛ ویرایش منجر به نسخه جدید می‌شود و rate table/formula هرگز به کارگزار expose نمی‌شود.

**معیار پذیرش**:
- تست منفی: کارگزار نمی‌تواند rate table/formula را از API استخراج کند (403 یا mask).
- تست: فاکتور/quote شامل خطوط brokerServiceFee و premium با disclosure reasonCode باشد.

### P1-9 — Contract Compatibility Gate

**هدف**: هر تغییر در OpenAPI/AsyncAPI قبل از merge با compatibility check و approval عبور کند.

**فایل‌ها**:
- `.github/workflows/contract-check.yml`

**معیار پذیرس**:
- breaking change در contract باعث fail شدن CI شود.
- change approval توسط API owner الزامی باشد.
- contract repository تنها منبع truth برای API/event نسخه‌بندی‌شده باشد.

---

## نکات اجرایی

- در P1 هنوز quote و bind اجرا نمی‌شود؛ فاصل بین محصول و quote را P2 پر می‌کند.
- `RecommendationRule` در P1 صرفاً rule-based است؛ ML/AI در P7 اضافه می‌شود.
- هر `ProductVisibility` به `DistributionAgreement` وابسته است؛ تغییر agreement منجر به invalidation یا اخطار می‌شود.
- `BrokerProductOffering` باید snapshot از `agreementVersion` را نگهداری کند تا تغییر future agreement تاثیری بر offering فعال نگذارد.
- `MarkupRule` فقط در صورت مجاز بودن قرارداد اعمال شود و در UI قبل از انتخاب مشتری disclosure شود.

این بکلاگ مستقیماً از `BROKERAGE_IMPLEMENTATION_PLAN.md` مشتق شده و فاز P2 را برای RFQ-to-Bind آماده می‌کند.
