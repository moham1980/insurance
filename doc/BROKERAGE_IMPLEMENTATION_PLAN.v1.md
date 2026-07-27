# نقشه راه توسعه سامانه کارگزاری بیمه روی سامانه موجود

## هدف

سامانه موجود به‌گونه‌ای توسعه داده شود که هم‌زمان (یا مستقل از هم) قابل استقرار در **شرکت بیمه** و **شرکت کارگزاری** باشد. هر کدام باید تجربه مشتری **مستقل** (white-label/برند اختصاصی) ولی در عین حال پلتفرم **واحد** یکپارچه‌ای داشته باشند.

## ۱. تصمیمات معماری کلیدی

| اصل | توضیحات |
|-----|---------|
| **چند‌مستاجری با نوع Tenant** | هر شرکت = یک `Tenant` با `type ∈ {insurer, broker, mga, hybrid, aggregator}`. این امکان مستقر شدن در هر دو مدل سازمانی را می‌دهد. |
| **تفکیک شرکت بیمه‌گر (Issuer) از فروشنده (Channel)** | هر بیمه‌نامه دارای `issuerId/issuerType` (شرکت بیمه‌گر) و `producerOrgUnitId` / `brokerId` / `agentId` (کانال فروش) است. |
| **مدل Party یکپارچه** | مشتری، بیمه‌گر، کارگزار، نماینده، ارزیاب، بازاریاب همه موجودیت `Party` در `party-kyc-service` هستند. |
| **قرارداد کارگزار-بیمه‌گر** | موجودیت `CarrierContract` تعیین می‌کند کدام کارگزار با کدام بیمه‌گر، در چه رشته‌ای، با چه کارمزدی مجاز به صدور/استعلام است. |
| **Offering/Product Catalog** | بیمه‌گر محصولات (`Product`) را تعریف می‌کند؛ کارگزار با افزودن markup/rules به آن‌ها `BrokerProductOffering` می‌سازد. |
| **RFQ ↔ QuoteResponse ↔ Placement** | فرآیند کارگزاری: درخواست استعلام مشتری → ارسال به چند بیمه‌گر → دریافت پاسخ → مقایسه → انتخاب → bind (استقرار). |
| **تسویه دوطرفه** | حق بیمه به حساب بیمه‌گر واریز می‌شود؛ کارمزد کارگزار/زیرمجموعه از بیمه‌گر مطالبه و تسویه می‌شود. |
| **تجربه مشتری مستقل** | هر Tenant دارای `BrandConfig` شامل logo، رنگ، domain، SMTP/SMS sender، i18n، تقویم، واحد پول و پرتال اختصاصی است. |

---

## ۲. تغییرات Backend (سرویس‌ها)

### ۲.۱ `auth-service` — مدیریت نقش‌ها و چندمستاجری

**فایل‌های مرتبط:**
- `services/auth-service/src/role-hierarchy.ts`
- `services/auth-service/src/permissions.ts`
- `services/auth-service/src/entities/User.ts` و `Tenant.ts`

**تغییرات:**
1. افزودن `TenantType` به `Tenant`: `insurer`, `broker`, `mga`, `hybrid`, `aggregator`, `service_provider`.
2. افزودن `parentTenantId` و `brandConfig` به `Tenant` برای شبکه‌های کارگزاری/آژانسی.
3. نقش‌های کارگزاری:
   - `broker_admin`, `broker_ops`, `broker_sales`, `broker_finance`, `sub_agent`, `mga_underwriter`, `carrier_relationship_manager`.
4. مجوزهای جدید:
   ```ts
   'broker:carriers:manage'
   'broker:contracts:manage'
   'broker:quotes:compare'
   'broker:placement:bind'
   'broker:commissions:view'
   'broker:sub_agents:manage'
   'customer:quotes:compare'
   'customer:policies:view_all_carriers'
   ```
5. نقش `broker_owner` از `broker_staff` و `sub_agent` ارث می‌برد.
6. در JWT payload افزودن `tenantType` و `primaryPartyId` (party کارگزار/بیمه‌گر).

### ۲.۲ `party-kyc-service` — مدل Party و اعتبارسنجی کارگزار

**فایل‌های مرتبط:**
- `services/party-kyc-service/src/entities/Party.ts`
- `services/party-kyc-service/src/party.controller.ts`
- `services/party-kyc-service/src/party.service.ts`

**تغییرات:**
1. افزودن `role` / `subType` به `Party`:
   - `individual`, `company` (مانند قبل)
   - `role`: `customer`, `insurer`, `broker`, `mga`, `agent`, `sub_agent`, `adjuster`, `marketer`, `loss_adjuster`
2. موجودیت `BrokerLicense`:
   - `brokerCentralCode`, `licenseNumber`, `issueDate`, `expiryDate`, `scope` (رشته‌های مجاز), `status` (active/suspended/revoked)
3. موجودیت `PartyRelationship`:
   - `parentPartyId` (کارگزار)، `childPartyId` (زیرنماینده/بازاریاب)، `relationshipType` (`sub_agent`, `marketer`, `referrer`), `carrierId`
4. اعتبارسنجی زنده مجوز کارگزار قبل از هر صدور/استعلام (call به `regulatory-gateway-service` یا بیمه مرکزی).

### ۲.۳ `sales-network-service` — شبکه فروش چندسطحی

**فایل‌های مرتبط:**
- `services/sales-network-service/src/entities/SalesPartner.ts`
- `services/sales-network-service/src/entities/CommissionContract.ts`
- `services/sales-network-service/src/sales-network.service.ts`
- `services/sales-network-service/src/sales-network.controller.ts`

**تغییرات:**
1. `SalesPartnerKind` ارتقا پیدا کند:
   ```ts
   'agency' | 'brokerage' | 'branch' | 'general_agent' | 'life_agent' | 'marketer' | 'online' | 'offline'
   ```
2. افزودن `carrierId` به `SalesPartner` برای نمایندگان وابسته به یک بیمه‌گر خاص (نماینده تک‌شرکتی).
3. موجودیت `CarrierContract` توسعه پیدا کند:
   - `carrierId` (بیمه‌گر)
   - `brokerId` (کارگزار)
   - `lineOfBusiness`
   - `commissionRateBps` / `fixedFee`
   - `markupBps` ( markup کارگزار روی حق بیمه )
   - `bindingAuthorityLimit` (سقف صدور بدون ارجاع به بیمه‌گر)
   - `settlementCycle` (روزهای تسویه)
4. موجودیت `CommissionSplit` برای تقسیم کارمزد بین کارگزار، نماینده جنرال، بازاریاب، شعبه.
5. رویداد `BrokerPolicyIssued` و `BrokerQuoteRequested` به Kafka ارسال شود.
6. داشبورد KPI بر اساس carrier و broker قابل فیلتر باشد.

### ۲.۴ `product-service` — کاتالوگ محصول و موتور استعلام چندبیمه‌گر

**فایل‌های مرتبط:**
- `services/product-service/src/entities/Product.ts`
- `services/product-service/src/quote-engine.ts`
- `services/product-service/src/product.controller.ts`

**تغییرات:**
1. `Product` صاحب (`ownerType` + `ownerId`) را مشخص کند:
   - `ownerType`: `insurer`, `broker`
   - `ownerId`: tenant/party مالک
2. افزودن `ProductVisibility`:
   - `visibility`: `private` (فقط owner)، `broker_exclusive` (فقط کارگزاران قراردادی)، `marketplace` (همه کارگزاران مجاز)
3. موتور `MultiCarrierQuoteEngine`:
   - دریافت `QuoteRequest` با رشته، ریسک، پوشش‌ها
   - تعیین فهرست بیمه‌گران مجاز از روی `CarrierContract`
   - فراخوانی `QuoteEngine.compute` برای هر محصول/بیمه‌گر
   - تولید `QuoteResponse[]` با premium، coverages، excess، carrier، commission، markup
4. موجودیت `BrokerProductOffering`:
   - `offeringId`, `brokerId`, `name`, `description`, `carrierProductIds[]`, `bundleRules`, `markupRules`, `isActive`
   - کارگزار می‌تواند محصولات چند بیمه‌گر را bundle کند.

### ۲.۵ `policy-service` — صدور با شناسایی Issuer و Channel

**فایل‌های مرتبط:**
- `services/policy-service/src/entities/Policy.ts`
- `services/policy-service/src/policy.service.ts`
- `services/policy-service/src/policy.controller.ts`

**تغییرات:**
1. افزودن فیلدهای کلیدی به `Policy`:
   - `issuerId`, `issuerType` (party/tenant بیمه‌گر)
   - `brokerId`, `brokerOrgUnitId` (کارگزار)
   - `subAgentId`, `marketerId` (زیرمجموعه)
   - `salesChannelType`: `direct`, `broker`, `agent`, `mga`, `bancassurance`, `online`
   - `placementId` (ارجاع به RFQ)
   - `commissionSplitSnapshot` (JSON)
2. تغییر `tenantId` به `operatingTenantId` (tenant کارگزار/بیمه‌گر که سامانه را اجرا می‌کند) و افزودن `issuerTenantId`.
3. تبدیل quote به policy از طریق `convertQuote` با `selectedCarrierId`.
4. پشتیبانی از `endorsement` و `renewal` با مالکیت بیمه‌گر و کانال فروش.

### ۲.۶ `underwriting-service` — مدیریت Risk Appetite و ارجاع به بیمه‌گر

**فایل‌های مرتبط:**
- `services/underwriting-service/src/underwriting.service.ts`
- `services/underwriting-service/src/risk-appetite/*`

**تغییرات:**
1. `RiskAppetite` به `carrierId` و `brokerId` متصل شود.
2. قوانین auto-decline/bind برای هر کارگزار و قرارداد مجزا.
3. در صورت خارج شدن از حد صلاحیت، case به `workflow-service` ارجاع شود.

### ۲.۷ `billing-service` / `payments-service` — تسویه دوطرفه

**فایل‌های مرتبط:**
- `services/billing-service/src/entities/*`
- `services/payments-service/src/entities/*`
- `services/collections-service/src/entities/*`

**تغییرات:**
1. افزودن `Payable` (بدهی کارگزار به بیمه‌گر) و `Receivable` (کارمزد طلب کارگزار).
2. افزودن `SettlementBatch` برای تسویه دوره‌ای با هر بیمه‌گر.
3. افزودن `CommissionInvoice` به `billing-service`.
4. `payments-service` باید بتواند پرداخت مشتری را بین `insurer` و `broker` (و زیرمجموعه) توزیع کند.
5. پشتیبانی از درگاه‌های ایرانی (Sadad، Zarinpal، Mellat) در `payments-service`.

### ۲.۸ `claims-service` — Claims Advocacy کارگزار

**فایل‌های مرتبط:**
- `services/claims-service/src/entities/Claim.ts`
- `services/claims-service/src/claims.service.ts`
- `services/claims-service/src/claims.controller.ts`

**تغییرات:**
1. `Claim` فیلدهای `brokerId` و `representativePartyId` داشته باشد.
2. API برای ثبت خسارت توسط کارگزار از طرف مشتری.
3. ارتباط مستقیم کارگزار با `loss_adjuster` از طریق `workflow-service` (ticket/task/comment).
4. مشاهده وضعیت خسارت در پرتال کارگزار و مشتری.

### ۲.۹ `regulatory-gateway-service` — انطباق و گزارش‌دهی به بیمه مرکزی

**فایل‌های مرتبط:**
- `services/regulatory-gateway-service/src/sanhab-clients/real-sanhab.client.ts`
- `services/regulatory-gateway-service/src/sanhab-clients/mock-sanhab.client.ts`
- `services/regulatory-gateway-service/src/regulatory.service.ts`

**تغییرات:**
1. پیاده‌سازی واقعی `RealSanhabClient` با WSDL، گواهی و کلید.
2. پشتیبانی از گزارش‌دهی به بیمه مرکزی به تفکیک بیمه‌گر (`issuerId`) و کارگزار (`brokerId`).
3. اعتبارسنجی کد یکتا و استعلام بیمه‌نامه/خودرو.
4. گزارش دوره‌ای تراکنش‌های کارگزار (`sanhab-events` + `broker-transaction-report`).
5. کنترل سقف کارمزد آیین‌نامه ۱۰۲ در لایه rule-engine یا sales-network.

### ۲.۱۰ `workflow-service` / `orchestrator-service` — گردش کار چندجانبه

**فایل‌های مرتبط:**
- `services/workflow-service/src/`
- `services/orchestrator-service/src/`

**تغییرات:**
1. تعریف workflowهای:
   - `RFQ → QuoteResponse → Bind → Issue`
   - `Broker Endorsement`
   - `Broker Renewal`
   - `Broker Claim Submission → Carrier Review`
2. Task inbox برای بیمه‌گر، کارگزار، ارزیاب خسارت.

### ۲.۱۱ `notification-service` — اطلاع‌رسانی White-Label

**فایل‌های مرتبط:**
- `services/notification-service/src/templates/*`
- `services/notification-service/src/notification.service.ts`

**تغییرات:**
1. قالب‌ها per `tenantId` و `brandKey` بارگذاری شوند.
2. `from` شماره/ایمیل قابل تنظیم per tenant.
3. پشتیبانی از الگوهای فارسی (Kavenegar) و بین‌المللی.

### ۲.۱۲ `api-gateway` — مسیریابی و BFF

**فایل‌های مرتبط:**
- `services/api-gateway/src/`

**تغییرات:**
1. مسیریابی بر اساس `Host` یا `X-Tenant-Id`.
2. مسیرهای `/broker/*` و `/customer/*` و `/insurer/*`.
3. تزریق `tenantId`, `tenantType`, `brandConfig` به upstream headers.
4. Rate limiting و ABAC per tenant.

---

## ۳. مدل داده (موجودیت‌ها و مهاجرت)

### ۳.۱ موجودیت‌های جدید

```text
Tenant
  - tenantId, tenantType, parentTenantId, brandConfig, isActive, legalInfo

PartyRole (جدول واسط)
  - partyId, role, carrierId, licenseId, scope, validFrom, validTo

BrokerLicense
  - licenseId, partyId, brokerCentralCode, licenseNumber, issueDate, expiryDate, scope, status

PartyRelationship
  - relationshipId, parentPartyId, childPartyId, relationshipType, carrierId, commissionShareBps

CarrierContract
  - contractId, carrierId, brokerId, lineOfBusiness, commissionRateBps, markupBps, bindingAuthorityLimit, settlementCycle, status

BrokerProductOffering
  - offeringId, brokerId, name, description, carrierProductIds, bundleRules, markupRules, isActive

QuoteRequest / QuoteResponse
  - quoteRequestId, customerPartyId, brokerId, lineOfBusiness, exposure, status
  - quoteResponseId, quoteRequestId, carrierId, productId, premium, coverages, commission, markup, isSelected

Placement
  - placementId, quoteRequestId, selectedQuoteResponseId, brokerId, customerPartyId, status, bindDate

Policy (افزودن)
  - issuerId, issuerType, brokerId, brokerOrgUnitId, subAgentId, marketerId, salesChannelType, placementId, commissionSplitSnapshot

CommissionSplit
  - splitId, ledgerEntryId, partyId, role, shareBps, amount

Payable / Receivable
  - partyId, counterPartyId, amount, currency, dueDate, status

BrandConfig
  - brandKey, tenantId, logoUrl, primaryColor, rtl, calendarType, currency, domain, smtpConfig, smsSender
```

### ۳.۲ مهاجرت‌ها

- `V1800000000__add_tenant_type_and_brand_config.sql`
- `V1800000001__create_party_role_and_broker_license.sql`
- `V1800000002__create_party_relationship.sql`
- `V1800000003__create_carrier_contract.sql`
- `V1800000004__add_issuer_broker_to_policy.sql`
- `V1800000005__create_quote_request_response.sql`
- `V1800000006__create_placement.sql`
- `V1800000007__create_broker_product_offering.sql`
- `V1800000008__create_commission_split.sql`
- `V1800000009__create_payable_receivable.sql`

---

## ۴. تغییرات Frontend

### ۴.۱ استراتژی UI

- **ساخت یک Design System مشترک** در `services/common/ui` یا `packages/ui`:
  - کامپوننت‌های quote card، comparison table، commission ledger، policy timeline، document viewer، form builder.
- **پشتیبانی از RTL + شمسی + ریال/تومان** در همه پرتال‌ها.
- **BrandConfig per Tenant**: لود لوگو، رنگ اصلی، فونت از API `/branding`.

### ۴.۲ `web-ui` (Admin & Ops)

**صفحات جدید/توسعه:**
- `/admin/tenants`: مدیریت بیمه‌گر/کارگزار + brand config
- `/admin/carrier-contracts`: قراردادهای بیمه‌گر-کارگزار
- `/admin/broker-licenses`: اعتبارسنجی پروانه‌ها
- `/admin/product-offerings`: طراحی offering کارگزار
- `/admin/commission-splits`: تقسیم کارمزد
- `/admin/settlements`: تسویه با بیمه‌گران
- `/sales-network/partners` (تکمیل): تفکیک کارگزار حقیقی/حقوقی، برخط/غیربرخط، ثبت زیرنماینده‌ها
- `/underwriting/risk-appetite`: per carrier/broker
- `/reports/brokerage`: گزارش کارمزد، پرتفو، TCoR

### ۴.۳ `agent-portal-ui` → ارتقا به `broker-portal-ui`

**تغییرات:**
1. تغییر نام و پیکربندی برای کارگزار (نه فقط نماینده).
2. صفحات جدید:
   - `quote/new`: ویزارد استعلام با ورود risk و انتخاب پوشش‌ها
   - `quotes/compare`: جدول مقایسه side-by-side شرکت‌های بیمه‌گر
   - `policies`: بیمه‌نامه‌های صادرشده به تفکیک بیمه‌گر
   - `customers`: CRM مشتریان
   - `sub-agents`: ثبت و مدیریت نمایندگان جنرال/زندگی/بازاریاب
   - `carrier-contracts`: مشاهده قراردادها و صلاحیت‌ها
   - `commissions`: دفتر کارمزد و تسویه
   - `claims`: ثبت و پیگیری خسارت
   - `documents`: بارگذاری مدارک per carrier
   - `profile/brand`: تنظیمات برند پرتال
3. اجازه صدور بیمه‌نامه فقط برای `carrierProductId`های مجاز در `CarrierContract`.

### ۴.۴ `customer-portal-ui`

**تغییرات:**
1. لود `brandConfig` بر اساس `Host` یا `?broker={brokerId}`.
2. صفحه `products` به جای محصولات تک شرکت، **offering کارگزار** را نشان دهد.
3. `quote/compare`: مشتری نرخ‌ها و پوشش‌ها را مقایسه کند.
4. `checkout`: انتخاب بیمه‌گر و پرداخت.
5. `policies`: مشاهده تمام بیمه‌نامه‌های خریداری‌شده از هر بیمه‌گر در یک داشبورد واحد.
6. `claims`: ثبت خسارت، انتخاب بیمه‌گر، پیگیری.
7. `renewals`: پیشنهاد تمدید per policy.

### ۴.۵ کامپوننت‌های مشترک پیشنهادی

| کامپوننت | مسیر پیشنهادی | کاربرد |
|----------|--------------|--------|
| `QuoteComparisonTable` | `packages/ui/QuoteComparisonTable.tsx` | مقایسه نرخ/پوشش چند بیمه‌گر |
| `PolicyTimeline` | `packages/ui/PolicyTimeline.tsx` | وضعیت صدور/خسارت |
| `CommissionLedgerCard` | `packages/ui/CommissionLedgerCard.tsx` | نمایش دفتر کارمزد |
| `CarrierSelector` | `packages/ui/CarrierSelector.tsx` | انتخاب بیمه‌گر در quote/bind |
| `SubAgentTree` | `packages/ui/SubAgentTree.tsx` | سلسله‌مراتب نمایندگان کارگزار |
| `BrandWrapper` | `packages/ui/BrandWrapper.tsx` | اعمال تم و brand config |

---

## ۵. فرآیندهای کسب‌وکار (Workflow)

### ۵.۱ استعلام و صدور از سمت کارگزار

```
Customer/Broker creates QuoteRequest
       ↓
Product Service: determine eligible carriers (CarrierContract)
       ↓
For each carrier → call QuoteEngine.compute
       ↓
Store QuoteResponse records
       ↓
Broker/Customer compares side-by-side
       ↓
Select preferred carrier
       ↓
Underwriting Service: risk appetite check
       ↓
If approved → Placement created
       ↓
Policy Service: issue policy with issuerId = selected carrier
       ↓
Billing/Payments: split premium (carrier share) and commission (broker share)
       ↓
Regulatory Gateway: Sanhab unique code registration per issuer
       ↓
Notification: policy issued to customer & broker
```

### ۵.۲ تمدید

```
System scans policies nearing expiry
       ↓
Generate renewal QuoteRequest for existing carrier(s) + possibly alternative carriers
       ↓
Broker/Customer reviews comparison
       ↓
Issue renewal policy (new issuer or same issuer)
```

### ۵.۳ خسارت

```
Customer or Broker submits claim
       ↓
Claims Service: determine carrier (issuerId)
       ↓
Assign to carrier's loss adjuster
       ↓
Broker monitors status, communicates with adjuster via workflow tasks
       ↓
Carrier approves/denies
       ↓
Payment disbursed to customer; broker may receive fee if applicable
```

---

## ۶. یکپارچه‌سازی‌های خارجی

| سیستم خارجی | سرویس مسئول | نیازمندی |
|-------------|-------------|----------|
| **بیمه مرکزی / Sanhab** | `regulatory-gateway-service` | کد یکتا، استعلام بیمه‌نامه، مجوز کارگزار |
| **درگاه پرداخت (Sadad/Mellat/Zarinpal)** | `payments-service` | پرداخت حق بیمه و کارمزد |
| **Kavenegar / SMS** | `notification-service` | OTP، یادآوری تمدید، اعلام خسارت |
| **LLM/OCR (OpenAI/Claude/Azure)** | `copilot-service`, `document-ai-service` | مشاوره هوشمند، OCR مدارک، مقایسه پوشش |
| **سامانه بانکی (Remittance)** | `payments-service`, `billing-service` | تسویه با بیمه‌گران |
| **SSO / IAM** | `auth-service`, `iam-service` | ورود یکپارچه بین پرتال‌ها |

---

## ۷. مدل‌های استقرار

| مدل | توضیح | پیکربندی |
|-----|-------|----------|
| **شرکت بیمه (Insurer-only)** | یک `Tenant` نوع `insurer`، محصولات مستقیم + شبکه نمایندگان | `TENANT_TYPE=insurer` |
| **شرکت کارگزاری (Broker-only)** | یک `Tenant` نوع `broker`، چند `CarrierContract` به سایر بیمه‌گران | `TENANT_TYPE=broker` |
| **MGA / Hybrid** | `Tenant` نوع `mga` یا `hybrid` با binding authority | `TENANT_TYPE=mga` |
| **SaaS چندمستاجره** | چند بیمه‌گر و کارگزار روی یک instance | row-level tenant isolation + per-tenant brand |
| **استقرار مستقل اما یکپارچه** | هر شرکت instance جداگانه دارد و از طریق API/Federation با هم ارتباط دارند | OIDC federation + cross-tenant API keys |

---

## ۸. امنیت و مجوزها

1. **ABAC** به جای RBAC ساده: سیاست‌هایی مثل «کارگزار فقط بیمه‌نامه‌های کارگزاران زیرمجموعه خود را ببیند».
2. **Data segregation**: همه کوئری‌ها دارای `tenantId` و `partyId` filter باشند.
3. **Field-level encryption** برای کدملی/شماره حساب در `party-kyc-service`.
4. **Audit log** برای هر تراکنش کارگزاری (صدور، کارمزد، تسویه، تغییر مجوز).
5. **SoD**: کارگزار نمی‌تواند همزمان صدور کند و هم تسویه را تأیید کند.

---

## ۹. نقشه راه توسعه (فازها)

| فاز | محتوا | خروجی قابل交付 |
|-----|-------|----------------|
| **A. P0 — زیرساخت هویت و چندمستاجری** | تغییر `Tenant`/`User`/`Party`، نقش‌ها، مدل قرارداد | امکان ثبت بیمه‌گر/کارگزار در یک سامانه |
| **B. P1 — کاتالوگ و استعلام چندبیمه‌گر** | `CarrierContract`, `MultiCarrierQuoteEngine`, `QuoteRequest/Response` | مقایسه نرخ بین شرکت‌ها |
| **C. P2 — صدور، bind و کارمزد کارگزاری** | `Placement`, تغییر `Policy`, `CommissionSplit` | صدور بیمه‌نامه از طریق کارگزار |
| **D. P3 — پرتال کارگزار و white-label مشتری** | `broker-portal-ui`, brand config در `customer-portal-ui` | تجربه مستقل مشتری |
| **E. P4 — خسارت، تسویه و گزارش‌دهی** | Claims Advocacy، `Payable/Receivable`, Sanhab واقعی | تسویه با بیمه‌گران و بیمه مرکزی |
| **F. P5 — AI و تحلیل پیشرفته** | Next Best Action، OCR فرم‌های بیمه‌گر، TCoR dashboard | ارزش افزوده کارگزاری |

---

## ۱۰. فایل‌های کلیدی برای شروع

- `services/auth-service/src/role-hierarchy.ts`
- `services/auth-service/src/permissions.ts`
- `services/party-kyc-service/src/entities/Party.ts`
- `services/sales-network-service/src/entities/SalesPartner.ts`
- `services/sales-network-service/src/entities/CommissionContract.ts`
- `services/product-service/src/quote-engine.ts`
- `services/product-service/src/entities/Product.ts`
- `services/policy-service/src/entities/Policy.ts`
- `services/regulatory-gateway-service/src/sanhab-clients/real-sanhab.client.ts`
- `services/web-ui/src/app/sales-network/page.tsx`
- `services/agent-portal-ui/src/pages/index.tsx`
- `services/customer-portal-ui/src/app/page.tsx`
