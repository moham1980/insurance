# بکلاگ اجرایی فاز P7 — Experience & AI

هدف فاز P7 این است که تجربه مشتری، کارگزار، نماینده و بیمه‌گر را از طریق کانال‌های متعدد (پرتال‌ها، موبایل، Copilot) و با استفاده از AI/ML بهبود دهد. AI در این فاز صرفاً **تصمیم‌یار** است و هیچ‌گاه بدون approval و audit انسانی تصمیم‌گیرنده نیست. این فاز به P0 تا P6 وابسته است.

## اصول کلی P7

- AI/ML فقط decision-support است؛ هیچ bind/issue/payment/claim decision بدون approval انسانی نمی‌شود.
- PII نباید به LLM/OCR provider ارسال شود مگر با consent، data minimization، allow-list و audit.
- هر recommendation/prediction باید `reasonCode`، confidence score و version داشته باشد.
- کانال‌های مختلف (web، mobile، call center) با BrandConfig و white-label یکپارچه شوند.
- Copilot/Chatbot فقط به داده‌های مجاز دسترسی دارد.
- همه APIها و eventها در contract repository ثبت می‌شوند.

---

## P7-0 — پیش‌نیازها از P0 تا P6

قبل از شروع P7 موارد زیر باید کامل باشند:

- P0-1 Organization/Tenant/Capability
- P0-2 Party/Identity/Role
- P0-5 BrandConfig
- P0-6 ABAC
- P0-7 RLS
- P0-8 Audit Log
- P1-3 Broker Product Offering
- P2-4 Quote Comparison
- P3-3 Policy Projection Sync
- P4-2 Customer Payment
- P5-2 ClaimAdvocacyCase
- P5-6 Customer Portal Claims
- P6-5 Executive BI Dashboards

---

## P7-1 — Channel Workspaces

### P7-1.1 Workspace Entity

**هدف**: پشتیبانی از کانال‌های مختلف با brand و permission مجزا.

**فایل‌ها**:
- `services/auth-service/src/entities/ChannelWorkspace.ts`
- `services/auth-service/src/entities/WorkspaceMembership.ts`

**موجودیت**:

```typescript
interface ChannelWorkspace {
  workspaceId: string;
  tenantId: string;
  organizationId: string;
  channelType: 'web' | 'mobile_app' | 'call_center' | 'branch' | 'agent_portal' | 'broker_portal' | 'insurer_portal';
  brandKey: string;
  domain?: string;
  allowedCapabilities: string[];
  status: 'active' | 'suspended';
}

interface WorkspaceMembership {
  membershipId: string;
  workspaceId: string;
  partyId: string;
  role: string;
  grantedAt: Date;
  revokedAt?: Date;
}
```

**مهاجرت**:
- `V1870000000__create_channel_workspace.sql`
- `V1870000001__create_workspace_membership.sql`

**معیار پذیرس**:
- هر کاربر فقط workspaceهای مرتبط با tenant/organization خود را می‌بیند.
- `brandKey` به `BrandConfig` link باشد.
- permission در workspace بر اساس ABAC.

### P7-1.2 API Workspaces

**APIهای پیشنهادی**:

```text
POST /api/v1/workspaces
GET /api/v1/workspaces
GET /api/v1/workspaces/{workspaceId}
POST /api/v1/workspaces/{workspaceId}/members
DELETE /api/v1/workspaces/{workspaceId}/members/{membershipId}
GET /api/v1/me/workspaces
```

**معیار پذیرس**:
- کاربر فقط workspaceهایی را می‌بیند که member آن است.
- admin نمی‌تواند workspace tenant دیگر را ویرایش کند.

**وابستگی**: P0-5.1

---

## P7-2 — Customer Portal White-Label

### P7-2.1 White-Label Config

**هدف**: شخصی‌سازی کامل پرتال مشتری بر اساس tenant/brand.

**فایل‌ها**:
- `services/customer-portal-ui/src/app/page.tsx` (بازبینی)
- `services/customer-portal-ui/src/config/brand-provider.tsx`
- `services/customer-portal-ui/src/themes/brand-theme.ts`

**پیکربندی**:

- Logo، رنگ‌ها، فونت، favicon
- زبان فارسی/انگلیسی و تقویم Jalali
- RTL/LTR
- نام سازمان و channel branding
- footer/legal text

**معیار پذیرس**:
- پرتال بر اساس `Host` یا `brandKey` brand مناسب را load می‌کند.
- هیچ credential در source UI نیست؛ همه از BFF دریافت می‌شوند.
- تست: تغییر BrandConfig بدون redeploy UI اعمال می‌شود.

### P7-2.2 Customer Portal Features

**فایل‌ها**:
- `services/customer-portal-bff/src/customer/customer.controller.ts` (تکمیل)
- `services/customer-portal-ui/src/app/dashboard/page.tsx`
- `services/customer-portal-ui/src/app/policies/page.tsx`
- `services/customer-portal-ui/src/app/claims/page.tsx`
- `services/customer-portal-ui/src/app/payments/page.tsx`

**features**:

- مشاهده policy projections همه بیمه‌گران با consent
- مشاهده و پیگیری claims
- پرداخت فاکتور حق‌بیمه
- مشاهده quotes/offering مقایسه‌ای
- مشاهده documents و communications

**معیار پذیرس**:
- هر مشتری فقط داده‌های خود را می‌بیند.
- revoke consent فوراً دسترسی آینده را قطع می‌کند.
- UI با BrandConfig و RTL کار کند.

**وابستگی**: P5-6.1

---

## P7-3 — Agent/Broker/Insurer Portals

### P7-3.1 Channel Workspace

**هدف**: پرتال مشترک agent/broker/channel برای فروش و پیگیری.

**فایل‌ها**:
- `services/channel-workspace-ui/src/pages/index.tsx` (بازبینی)
- `services/channel-workspace-bff/src/channel/channel.controller.ts`

**features**:

- مشاهده offeringها و محصولات مجاز
- ثبت submission و RFQ
- مشاهده commission و statements
- مشاهده customers و leads

**معیار پذیرس**:
- agent فقط داده‌های `distributionOrganizationId` خود را می‌بیند.
- sub-agent فقط scope محدود.

### P7-3.2 Broker Operations View

**فایل‌ها**:
- `services/channel-workspace-ui/src/pages/broker/index.tsx`
- `services/channel-workspace-bff/src/broker/broker.controller.ts`

**features**:

- مدیریت carrier agreements و visibility
- مدیریت broker product offerings
- submissions، quotes، placements
- settlements و commissions
- claim advocacy cases
- reports و dashboards

**معیار پذیرس**:
- broker فقط داده‌های `brokerOrganizationId` خود را می‌بیند.
- multi-carrier view با permission مجاز.

### P7-3.3 Insurer Operations

**فایل‌ها**:
- `services/web-ui/src/app/insurer-operations/` (ساختار جدید)
- `services/insurer-operations-bff/src/insurer/insurer.controller.ts`

**features**:

- مدیریت products/versions/rate tables
- مدیریت distribution agreements و visibility
- دریافت و پردازش RFQ
- مدیریت claims و loss adjusters
- settlements و broker performance
- regulatory reports

**معیار پذیرس**:
- insurer فقط داده‌های `issuerOrganizationId` خود را می‌بیند.
- نمایش projection و analytics.

**وابستگی**: P0-6.1

---

## P7-4 — Copilot / AI Assistant

### P7-4.1 Copilot Backend

**هدف**: دستیار هوشمند برای کارگزار، نماینده و بیمه‌گر.

**فایل‌ها**:
- `services/ai-assistant-service/src/copilot/copilot.controller.ts`
- `services/ai-assistant-service/src/copilot/copilot.service.ts`
- `services/ai-assistant-service/src/rag/rag.service.ts`

**constraints**:

- Copilot فقط به داده‌هایی دسترسی دارد که user ABAC دارد.
- PII نباید به LLM ارسال شود؛ داده‌ها anonymize/aggregate شوند.
- هر پاسخ دارای `source refs` و `confidence` باشد.
- Copilot نمی‌تواند bind/issue/payment انجام دهد.

**APIهای پیشنهادی**:

```text
POST /api/v1/copilot/ask
POST /api/v1/copilot/recommend-product
POST /api/v1/copilot/summarize-claim
POST /api/v1/copilot/draft-communication
```

**معیار پذیرس**:
- پاسخ Copilot قابل trace به source document/policy باشد.
- user با permission کمتر نمی‌تواند داده sensitiv دریافت کند.
- همه interaction در audit log ثبت شود.

### P7-4.2 Copilot UI

**فایل‌ها**:
- `packages/ui/CopilotChat.tsx`
- `packages/ui/CopilotSuggestionCard.tsx`

**معیار پذیرس**:
- chat interface در همه portalها قابل embed.
- نمایش confidence و source refs.
- دکمه escalate to human.

**وابستگی**: P7-3.2

---

## P7-5 — Next Best Action (NBA)

### P7-5.1 NBA Engine

**هدف**: پیشنهاد action بعدی به کارگزار/نماینده/مشتری بر اساس rule و داده.

**فایل‌ها**:
- `services/ai-assistant-service/src/nba/nba-engine.ts`
- `services/ai-assistant-service/src/nba/nba-rule.ts`

**rules نمونه**:

- renewal upcoming → ارسال پیشنهاد تمدید
- installment overdue → ارسال reminder
- claim pending document → درخواست سند
- high-value customer → پیشنهاد upsell/cross-sell

**معیار پذیرس**:
- هر action دارای reasonCode و score باشد.
- customer می‌تواند opt-out کند.
- rule version و audit log.
- NBA فقط از داده‌های مجاز user استفاده می‌کند.

### P7-5.2 NBA API

**APIهای پیشنهادی**:

```text
GET /api/v1/nba/pending-actions
POST /api/v1/nba/actions/{actionId}/dismiss
POST /api/v1/nba/actions/{actionId}/execute
```

**وابستگی**: P3-1.1

---

## P7-6 — OCR & Document AI

### P7-6.1 OCR Pipeline

**هدف**: استخراج اطلاعات از اسناد خسارت/هویت/فاکتور.

**فایل‌ها**:
- `services/ai-assistant-service/src/ocr/ocr-pipeline.ts`
- `services/ai-assistant-service/src/ocr/document-redaction.ts`

**constraints**:

- PII قبل از ارسال به OCR provider redact شود.
- OCR فقط برای document types مجاز (repair estimate, police report, invoice).
- نتیجه OCR توسط کاربر تایید شود.
- OCR provider در allow-list ثبت شده باشد.

**APIهای پیشنهادی**:

```text
POST /api/v1/ocr/extract
GET /api/v1/ocr/jobs/{jobId}
POST /api/v1/ocr/jobs/{jobId}/confirm
```

**معیار پذیرس**:
- extraction داده‌های کلیدی (amount، date، plate number) با confidence.
- PII mask در request log.
- confirmation قبل از استفاده در claim workflow.

### P7-6.2 Document Classification

**فایل‌ها**:
- `services/ai-assistant-service/src/ocr/document-classifier.ts`

**معیار پذیرس**:
- classification نوع سند با accuracy > 85% در تست set.
- هرگونه misclassification قابل override توسط کاربر.

**وابستگی**: P5-5.1

---

## P7-7 — Model Inventory & Governance

### P7-7.1 Model Card Entity

**هدف**: ثبت و مدیریت مدل‌های AI.

**فایل‌ها**:
- `services/ai-assistant-service/src/governance/model-card.entity.ts`
- `services/ai-assistant-service/src/governance/model-inventory.service.ts`

**موجودیت**:

```typescript
interface ModelCard {
  modelCardId: string;
  tenantId: string;
  name: string;
  version: string;
  purpose: string;
  owner: string;
  trainingDataRef?: string;
  biasRisks: string[];
  allowedDataTypes: string[];
  piiHandling: 'redact' | 'anonymize' | 'forbidden';
  approvalStatus: 'draft' | 'approved' | 'retired';
  performanceMetrics: Record<string, number>;
  auditLogs: ModelAuditLog[];
}
```

**مهاجرت**:
- `V1870000010__create_model_card.sql`

**معیار پذیرس**:
- هر مدل قبل از deploy دارای Model Card باشد.
- مدل PII-forbidden بدون redaction اجازه اجرا ندارد.
- approval workflow برای deploy/retire.

### P7-7.2 AI Audit & Bias Monitoring

**فایل‌ها**:
- `services/ai-assistant-service/src/governance/ai-audit.service.ts`
- `services/ai-assistant-service/src/governance/bias-monitor.service.ts`

**معیار پذیرس**:
- هر output AI با model version، input hash، output و user approval ثبت شود.
- bias monitoring بر اساس demographic parity یا equalized odds.
- alert در صورت drift یا performance degradation.

**وابستگی**: P0-8.1

---

## P7-8 — Notifications & Communications

### P7-8.1 Notification Service

**هدف**: ارسال اطلاع‌رسانی از طریق SMS/Email/Push بر اساس BrandConfig.

**فایل‌ها**:
- `services/notification-service/src/notification.service.ts` (تکمیل)
- `services/notification-service/src/channels/sms-channel.ts`
- `services/notification-service/src/channels/email-channel.ts`
- `services/notification-service/src/channels/push-channel.ts`

**معیار پذیرس**:
- channel provider در BrandConfig یا env config باشد.
- credential در Vault.
- template قابل white-label.
- delivery status track و retry.
- PII mask در log.

### P7-8.2 OTP/SMS Service

**فایل‌ها**:
- `services/notification-service/src/otp/otp.service.ts`
- `services/notification-service/src/otp/otp-verification.service.ts`

**معیار پذیرس**:
- OTP با TTL و rate limit.
- integration با provider واقعی (Twilio/Kavenegar/etc.).
- fallback به mock در dev.
- brute-force protection.

**وابستگی**: P0-5.1

---

## P7-9 — Event‌ها و Contract

### P7-9.1 Eventهای P7

**eventهای پیشنهادی**:

```text
WorkspaceCreated.v1
CustomerPortalPageViewed.v1
CopilotQuestionAsked.v1
CopilotResponseGenerated.v1
NBActionGenerated.v1
NBActionExecuted.v1
OCRJobStarted.v1
OCRJobCompleted.v1
OCRJobConfirmed.v1
ModelDeployed.v1
ModelRetired.v1
NotificationSent.v1
OTPVerified.v1
```

**معیار پذیرس**:
- همه eventها در AsyncAPI ثبت شوند.
- producer/consumer contract tests pass شوند.
- Outbox pattern.

### P7-9.2 OpenAPI

**فایل‌ها**:
- `D:\CascadeProjects\ecosystem\contracts\openapi\customer-portal-bff\openapi.yaml`
- `D:\CascadeProjects\ecosystem\contracts\openapi\ai-assistant-service\openapi.yaml`
- `D:\CascadeProjects\ecosystem\contracts\openapi\notification-service\openapi.yaml`

**وابستگی**: P6-8.2

---

## P7-10 — تست‌ها

### P7-10.1 Unit/Integration Tests

**فایل‌ها**:
- `services/customer-portal-ui/test/brand-config.spec.ts`
- `services/ai-assistant-service/test/copilot.spec.ts`
- `services/ai-assistant-service/test/nba.spec.ts`
- `services/ai-assistant-service/test/ocr.spec.ts`
- `services/notification-service/test/otp.spec.ts`

**تست‌های الزامی**:

- BrandConfig load و white-label.
- Customer portal tenant isolation.
- Copilot PII redaction و source refs.
- NBA reasonCode و opt-out.
- OCR extraction و user confirmation.
- Model Card approval workflow.
- OTP rate limit و brute-force protection.

### P7-10.2 E2E Tests

**فایل‌ها**:
- `e2e/experience-ai.spec.ts`

**سناریوها**:

- مشتری login → مشاهده policy projections → receive renewal NBA → pay invoice.
- کارگزار asks Copilot → receives recommendation with source → executes NBA.
- Upload claim document → OCR extracts amount → user confirms → claim updated.

**وابستگی**: P7-4.1

---

## P7-11 — Migration

### P7-11.1 Backfill Experience & AI

**اقدامات**:
- ایجاد `ChannelWorkspace` برای هر portal/tenant موجود.
- ایجاد `BrandConfig` اگر هنوز وجود نداشته باشد.
- backfill `ModelCard` برای OCR/NBA models.
- migration templates notification.

### P7-11.2 Reconciliation

**معیار پذیرس**:
- تعداد workspaceها با tenant/portal mapping موجود مطابقت داشته باشد.
- هیچ BrandConfig بدون tenant/organization نماند.
- رکوردهای مبهم در `migration_quarantine` قرار گیرند.

**وابستگی**: P6-10.2

---

## نقشه زمانی P7

```text
Week 1:
  P7-1.1, P7-1.2 (Channel Workspaces)
  P7-2.1, P7-2.2 (Customer Portal White-Label)

Week 2:
  P7-3.1, P7-3.2, P7-3.3 (Agent/Broker/Insurer Portals)
  P7-4.1, P7-4.2 (Copilot)

Week 3:
  P7-5.1, P7-5.2 (NBA)
  P7-6.1, P7-6.2 (OCR & Document AI)
  P7-7.1, P7-7.2 (Model Inventory & Governance)

Week 4:
  P7-8.1, P7-8.2 (Notifications & OTP)
  P7-9.1, P7-9.2 (Event & Contract)
  P7-10.1, P7-10.2 (Tests)
  P7-11.1, P7-11.2 (Migration)
  Bug fixing, UX review, demo
```

---

## معیارهای خروج P7

P7 کامل است اگر و فقط اگر:

- Customer Portal با white-label و RTL کار کند.
- Agent/Broker/Insurer Portals با permission و brand مجزا کار کنند.
- Copilot بدون ارسال PII، با source refs و confidence پاسخ دهد.
- NBA با reasonCode و opt-out قابل اجرا باشد.
- OCR با PII redaction و user confirmation کار کند.
- Model Card و AI governance پیاده‌سازی شده باشد.
- Notification/OTP با provider واقعی و rate limit کار کند.
- تست E2E برای portal، Copilot، NBA و OCR pass شوند.
- OpenAPI/AsyncAPI برای API/eventهای جدید ثبت شده باشد.
- migration با reconciliation موفق انجام شده باشد.

---

## اصلاحات و تکمیلی پس از تطبیق با BROKERAGE_IMPLEMENTATION_PLAN.md

### P7-12 — Ecosystem AI Gateway Integration

**هدف**: Copilot و OCR از `ecosystem-ai-gateway` (port 8540) استفاده کنند و fallback به banking AI داشته باشند.

**فایل‌ها**:
- `services/ai-assistant-service/src/gateways/ecosystem-ai.gateway.ts`
- `services/ai-assistant-service/src/copilot/copilot.service.ts`
- `services/ai-assistant-service/src/ocr/ocr-pipeline.ts`

**یکپارچه‌سازی**:
- تمام فراخوانی‌ها از طریق endpointها و DTOهای versioned ثبت‌شده در contract repository برای `ecosystem-ai-gateway` انجام شود.
- base URL از config (`ECOSYSTEM_AI_GATEWAY_URL`) خوانده شود؛ مقدار توسعه‌ای می‌تواند `http://localhost:8540` باشد.
- مسیرهای `consult`، `workflows`، `chat-compat` و `rag-compat` فقط مطابق قرارداد gateway استفاده شوند؛ endpoint جدید بدون ثبت contract مجاز نیست.

**اقدامات**:
- PII redaction/anonymization قبل از ارسال به gateway.
- `fallbackSwitch` برای rollback به مدل داخلی در صورت عدم دسترسی.
- هر پاسخ دارای `modelVersion`، `confidence` و `sourceRefs`.

**معیار پذیرس**:
- تست: Copilot بدون ارسال PII و با source refs پاسخ دهد.
- تست: fallback switch بدون downtime کار کند.

### P7-13 — Customer-360 Service

**هدف**: aggregation پرتفوی مشتری از چند بیمه‌گر با consent.

**فایل‌ها**:
- `services/customer-360-service/src/portfolio/portfolio-aggregator.service.ts`
- `services/customer-360-service/src/consent/consent-check.service.ts`

**اقدامات**:
- aggregate policy projections، claims و payments با `globalSubjectId`.
- فقط داده‌هایی که consent فعال دارند نمایش داده شوند.
- revoke consent فوراً دسترسی future را قطع کند.

**معیار پذیرس**:
- تست: مشتری پرتفوی چند بیمه‌گر را با consent مشاهده کند.
- تست: revoke consent بلافاصله aggregate را محدود کند.

### P7-14 — Model Switchboard

**هدف**: مدیریت مسیریابی بین مدل‌های AI per tenant.

**فایل‌ها**:
- `services/ai-assistant-service/src/model-switchboard/model-switchboard.service.ts`
- `services/ai-assistant-service/src/model-switchboard/model-router.ts`

**اقدامات**:
- per-tenant/organization model selection.
- rate limiting و circuit breaker.
- A/B testing با `modelVersion` tracking.

### P7-15 — Consent Panel Shared Component

**هدف**: کامپوننت مشترک `ConsentPanel` برای نمایش و مدیریت consent در همه پرتال‌ها.

**فایل‌ها**:
- `packages/ui/ConsentPanel.tsx`
- `services/customer-portal-ui/src/app/consent/page.tsx`

**معیار پذیرس**:
- مشتری بتواند purpose و data types را ببیند و revoke کند.
- event `ConsentGranted`/`ConsentRevoked` منتشر شود.

### P7-16 — Notification Providers & Sender Credential Vault

**هدف**: پشتیبانی از providerهای واقعی (Kavenegar/Twilio/SES) با credential در Vault.

**فایل‌ها**:
- `services/notification-service/src/providers/kavenegar.provider.ts`
- `services/notification-service/src/providers/twilio.provider.ts`
- `services/notification-service/src/providers/ses.provider.ts`

**معیار پذیرس**:
- provider بر اساس BrandConfig/env انتخاب شود.
- sender credential در Vault نگهداری شود.
- delivery status track و fallback به mock در dev.

---

## نکات اجرایی

- AI هیچ‌گاه decision-maker نیست؛ همیشه approval انسانی و audit الزامی است.
- PII به LLM/OCR provider ارسال نشود؛ redaction/anonymization اجباری.
- Copilot فقط به داده‌هایی دسترسی دارد که user بر اساس ABAC دارد.
- BrandConfig باید بدون redeploy UI قابل تغییر باشد.
- Notification providers credential در Vault نگهداری شوند.
- Model Card قبل از deploy هر مدل AI الزامی است.
- OCR output فقط پس از user confirmation در claim workflow استفاده شود.

این بکلاگ مستقیماً از `BROKERAGE_IMPLEMENTATION_PLAN.md` مشتق شده و آماده پیاده‌سازی فاز Experience & AI است.
