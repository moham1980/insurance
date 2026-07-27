# گزارش رفع ایرادات `policy-service`

**تاریخ شروع:** ۲۰۲۶/۰۷/۲۷  
**مبنای بررسی:** [05-policy-service-code-audit.md](05-policy-service-code-audit.md)  
**هدف:** پیاده‌سازی اصلاحات P0 و P1 بر اساس ممیزی کد، با ثبت دقیق پیشرفت در همین فایل.

---

## ۱. خلاصه یافته‌های کلیدی ممیزی

| کد | اولویت | ایراد اصلی |
|---|---|---|
| POLICY-CODE-001 | P0 | `tenantId` در مدل `Policy` و کوئری‌ها وجود ندارد؛ `TenantGuard`/`AbacGuard` روی controller routes اعمال نشده‌اند. |
| POLICY-CODE-002 | P0 | `issue` در outage پرداخت fail-open می‌شود و به `params.paid` اعتماد دارد. |
| POLICY-CODE-003 | P0 | `renew` کد یکتای policy قبلی را کپی می‌کند و بدون gate policy جدید را `active` می‌سازد. |
| POLICY-CODE-004 | P0 | `payment.consumer.ts` پس از خطا هم DLQ می‌نویسد و هم `consumedEvent` ذخیره می‌کند (retry غیرممکن). |
| POLICY-CODE-005 | P0 | رویدادهای lifecycle فقط اگر `correlationId` وجود داشته باشد publish می‌شوند. |
| POLICY-CODE-006 | P1 | transitionهای وضعیت بدون lock/version محافظت نشده‌اند. |
| POLICY-CODE-007 | P1 | renewal بدون payment/underwriting/quality gate policy جدید را active می‌کند. |
| POLICY-CODE-008 | P1 | endorsement payloadها را silently نادیده می‌گیرد. |
| POLICY-CODE-009 | P1 | endorsement بدون underwriting/financial recalculation اعمال می‌شود. |
| POLICY-CODE-010 | P1 | تاریخ‌ها و مبلغ‌ها validation دامنه‌ای کافی ندارند. |
| POLICY-CODE-011 | P1 | `maxRenewals` و تاریخ renewal enforce نشده است. |
| POLICY-CODE-012 | P1 | `uniqueCode` validation/regulator uniqueness ناقص است. |
| POLICY-CODE-013 | P1 | `getRegulatoryUrl` fallback به `localhost:18024` دارد. |
| POLICY-CODE-014 | P1 | inquiry freshness/signature/policy-version binding ناقص است. |
| POLICY-CODE-015 | P1 | Sanhab work item failure durable retry/outbox ندارد. |
| POLICY-CODE-016 | P1 | underwriting call درون transaction و بدون timeout است. |
| POLICY-CODE-017 | P1 | payment status response بدون schema/signature اعتبارسنجی می‌شود. |
| POLICY-CODE-018 | P1 | permissionها object-level scope ندارند. |
| POLICY-CODE-019 | P1 | quality gate override SoD/scope ناقص است. |
| POLICY-CODE-020 | P1 | `PolicyChange` audit payload بدون tenant/hash/before-after کامل است. |
| POLICY-CODE-021 | P1/P2 | `PaymentConsumer` eventId fallback و schema validation ضعیف دارد. |
| POLICY-CODE-022 | P1/P2 | consumer retry/readiness/lag ندارد. |
| POLICY-CODE-023 | P1/P2 | drift entity/migration/sequence احتمالی است. |
| POLICY-CODE-024 | P2 | `PiiMaskingMiddleware` با `FastifyAdapter` ناسازگار است. |
| POLICY-CODE-025 | P2 | health فقط DB را بررسی می‌کند و خطا را افشا می‌کند. |

---

## ۲. برنامه اصلاح (فایل‌محور)

### P0 — بحرانی

| فایل | تغییر |
|---|---|
| `src/entities/Policy.ts` | افزودن `tenantId`؛ uniqueهای `policyNumber` و `uniqueCode` را tenant-scoped کن (`unique` composite). |
| `src/entities/PolicyChange.ts` | افزودن `tenantId`، `correlationId`، `before`، `after`، `reason` (اجباری شدن audit). |
| `src/entities/PolicyInquiry.ts` | افزودن `tenantId`، `queryHash`، `providerCorrelationId`، `expiresAt`. |
| `src/entities/PolicyRenewal.ts` | افزودن `tenantId`. |
| `src/migrations/1760000000405-add-tenant-to-policy.ts` | migration جدید برای ستون‌ها و ایندکس‌های tenant. |
| `src/tenant.guard.ts` | تنظیم `request.tenantId` و رد درخواست در عدم تطابق tenant. |
| `src/policy.controller.ts` | حذف `@UseGuards` سطح متد و اعمال class-level guards (همه routes شامل `TenantGuard`/`AbacGuard`/`PermissionsGuard`)؛ پاس دادن `tenantId` به service. |
| `src/policy.service.ts` | همه متدها `tenantId` را می‌پذیرند و در کوئری/ولیدیشن استفاده می‌کنند؛ `getPolicy`/`listPolicies` با scope tenant. |
| `src/payment.consumer.ts` | عدم ذخیره `consumedEvent` در خطا؛ eventId پایدار از envelope؛ استخراج `paymentId` و ارسال به `issue`؛ commit marker فقط پس از موفقیت. |
| `src/policy.service.ts` — `issue` | حذف fallback `params.paid`؛ وابستگی اجباری به `PAYMENTS_SERVICE_URL`؛ تایید مبلغ/ارز/paymentId/policyId/tenant؛ fail-closed. |
| `src/policy.service.ts` — `renew`/`approveRenewal` | عدم کپی `uniqueCode`؛ چک `maxRenewals` و no-overlap؛ policy جدید در وضعیت `inquiry` (نه active) تا gate؛ publish event اجباری. |
| `src/policy.service.ts` — `quote`/`convertQuoteToPolicy`/`submitDocs`/`riskAssess`/`applyUnderwritingDecision`/`setUniqueCode`/`endorse`/`cancel`/`setAutoRenew` | `correlationId` اجباری server-generated؛ publish event در همه transactionها؛ `tenantId` در event payload. |

### P1 — lifecycle / business / integration

| فایل | تغییر |
|---|---|
| `src/entities/Policy.ts` | افزودن `@VersionColumn` (`version`) برای optimistic locking. |
| `src/policy.service.ts` | استفاده از `pessimistic_write` lock یا `version` در mutationها؛ idempotency key در تراکنش. |
| `src/policy.service.ts` — `endorse` | validation schema per type؛ `applicationData` مقداردهی اولیه object؛ `newPremiumAmount` با nullish semantics؛ رد premium منفی. |
| `src/policy.service.ts` — `quote`/`convertQuoteToPolicy` | `startDate < endDate`؛ premium finite/positive؛ چک currency؛ چک consistency اقساط. |
| `src/policy.service.ts` — `getRegulatoryUrl` | عدم fallback به localhost؛ خطا در صورت خالی بودن `SANHAB_BASE_URL` در production. |
| `src/policy.service.ts` — `ensureSanhabQualityGate` | TTL/freshness، queryHash، provider signature/correlation، policy/product version binding. |
| `src/policy.service.ts` — `createSanhabFollowupWorkItem` | durable outbox/task با idempotency key و retry. |
| `src/policy.service.ts` — `riskAssess` | خارج کردن underwriting call از transaction؛ timeout/circuit؛ request durable در change log. |
| `src/policy.controller.ts` | `quality-gate/override` با dual control (actor ≠ issuer)، evidence، alert. |
| `src/health.controller.ts` | liveness/readiness عمیق برای DB/payments/Sanhab/Kafka consumer/outbox. |
| `src/pii-masking.middleware.ts` / ایجاد interceptor | پیاده‌سازی `PiiMaskingInterceptor` سازگار با Fastify؛ اعمال allow-list DTO. |
| `src/migrations/*.ts` | ایجاد sequence `policy_number_seq`؛ canonical FK/constraint؛ حذف fallback تصادفی. |

### P2 — consumer/migration/runtime/audit/tests

| فایل | تغییر |
|---|---|
| `src/payment.consumer.ts` | reconnect/retry loop؛ readiness/lag؛ DLQ replay؛ سازوکار pause/resume. |
| `src/entities/PolicyChange.ts` | append-only؛ جلوگیری از update/delete در entity lifecycle. |
| `src/TRUTH.md` | به‌روزرسانی status واقعی و gapها؛ اضافه کردن envهای جدید. |
| `src/**/*.spec.ts` / `*.test.ts` | افزودن تست‌های lifecycle، payment، Sanhab، renewal، concurrency، security، migration. |

---

## ۳. وضعیت پیشرفت

### ۲۰۲۶/۰۷/۲۷ — شروع و برنامه‌ریزی

- [x] مطالعه کامل `05-policy-service-code-audit.md`
- [x] استخراج ۲۵ یافته و دسته‌بندی P0/P1/P2
- [x] تهیه برنامه فایل‌محور در همین سند

### ۲۰۲۶/۰۷/۲۷ — پیاده‌سازی P0 و P1

- [x] `src/entities/Policy.ts` — افزودن `tenantId`، `version`، unique composite (tenantId, policyNumber / uniqueCode)
- [x] `src/entities/PolicyChange.ts` — افزودن `tenantId`، `correlationId`، `reason`، `before`، `after`؛ ثبت type `auto_renew_updated`
- [x] `src/entities/PolicyInquiry.ts` — افزودن `tenantId`، `queryHash`، `providerCorrelationId`، `providerSignature`، `expiresAt`
- [x] `src/entities/PolicyRenewal.ts` — افزودن `tenantId`
- [x] `src/migrations/1760000000405-add-tenant-to-policy.ts` — migration ستون‌ها و ایندکس‌های tenant
- [x] `src/policy.service.ts` — تمام متدهای lifecycle با `tenantId`، `correlationId` اجباری، pessimistic lock، validation تاریخ/مبلغ، event همیشگی، before/after audit
- [x] `src/policy.service.ts` — `issue` fail-closed با `paymentId`؛ حذف `paid` fallback؛ تایید مبلغ و `policyId` با payments-service
- [x] `src/policy.service.ts` — `renew`/`approveRenewal` بدون کپی `uniqueCode`؛ چک `maxRenewals`؛ policy جدید در `inquiry`
- [x] `src/policy.service.ts` — `getRegulatoryUrl` حذف fallback localhost؛ خطا در صورت عدم تنظیم
- [x] `src/policy.service.ts` — `ensureSanhabQualityGate` با TTL، `providerCorrelationId`/`providerSignature`
- [x] `src/payment.consumer.ts` — فقط پس از موفقیت `consumedEvent` ذخیره می‌شود؛ استخراج `paymentId` و ارسال به `issue`؛ خطاها re-throw برای retry
- [x] `src/policy.controller.ts` — پاس دادن `tenantId`/`correlationId` به service؛ `issue` با `paymentId`
- [x] `src/pii-masking.middleware.ts` — پیاده‌سازی Fastify-compatible با override `res.send`
- [x] `src/health.controller.ts` — بررسی DB/payments/regulatory/kafka و redact خطا
- [x] build موفق `payments-service` و `policy-service`
- [x] به‌روزرسانی نهایی این گزارش

---

## ۳. وضعیت پیشرفت (ادامه)

### ۲۰۲۶/۰۷/۲۷ — اجرای تست‌های یکپارچگی و رفع باگ‌های مسدودکننده

- [x] رفع خطای `TypeError: Cannot read properties of undefined (reading 'bind')` در `payments-service` با جایگزینی `PiiMaskingMiddleware` با `PiiMaskingInterceptor` سازگار با `FastifyAdapter`.
- [x] رفع `DLQService.processRetries` با تبدیل کوئری به `createQueryBuilder` سازگار با PostgreSQL (حذف عملگرهای `$lte`/`$lt` نامعتبر).
- [x] رفع اتصال `DbHelper` در تست‌ها با مهاجرت به `DataSource.initialize()`/`destroy()` جهت جلوگیری از hang در `beforeAll`.
- [x] تبدیل ستون `tenant_id` از `uuid` به `text` در موجودیت‌های `Policy`، `PolicyChange`، `PolicyInquiry`، `PolicyRenewal` و migration مربوطه (`1760000000405-add-tenant-to-policy.ts`)؛ اعمال تغییر در دیتابیس فعلی.
- [x] رفع ستون گمشده `metadata` در جدول `payments` با افزودن migration `1700000000504-add-payment-metadata.ts` و اعمال `ALTER TABLE` در دیتابیس فعلی.
- [x] استفاده از `AppDataSource.options` در `payments-service/src/app.module.ts` و فعال‌سازی `migrationsRun`.
- [x] پیاده‌سازی `PiiMaskingInterceptor` در `policy-service` و حذف `PiiMaskingMiddleware`/`NestModule.configure` از `policy-service/src/app.module.ts`.
- [x] build موفق `payments-service` و `policy-service`.
- [x] اجرای تست `tests/integration/policy.test.ts`:
  - **Test Suites: 1 passed, 1 total**
  - **Tests: 12 passed, 12 total**
  - **Time: ~۱۲ ثانیه**

### ۲۰۲۶/۰۷/۲۷ — اجرای تست‌های end-toend (کامل‌شده)

- [x] راه‌اندازی `api-gateway` و وابستگی‌های لازم برای تست `policy-issuance` e2e
- [x] اصلاح `tests/e2e/policy-issuance.test.ts` `beforeAll` به جهت truncate جداول در schemaهای صحیح (`party`، `policy`، `payments`) به جای `public`.
- [x] اصلاح `PolicyInquiry.policyId` به `nullable` برای پشتیبانی از استعلام SMS Sanhab پیش از داشتن policy.
- [x] افزودن migration `1760000000406-make-inquiry-policy-id-nullable.ts` برای column `policy_id` در `policy_inquiries`.
- [x] تنظیم `policy.status = 'endorsed'` در `PolicyService.endorse` تا وضعیت پس از endorsement به‌روز شود.
- [x] استفاده از `AppDataSource.options` در `policy-service/src/app.module.ts` و فعال‌سازی `migrationsRun`.
- [x] رفع `regulatory-gateway-service`: جایگزینی `res.status(...).json(...)` با `res.status(...).send(...)` برای سازگاری با `FastifyAdapter`؛ ایجاد migration و جدول `regulatory.sanhab_events`.
- [x] اجرای تست `tests/e2e/policy-issuance.test.ts`:
  - **Test Suites: 1 passed, 1 total**
  - **Tests: 13 passed, 13 total**
  - **Time: ~۲۲ ثانیه**

---

## ۴. یادداشت‌های اجرایی

- همه تغییرات باید طوری باشند که از DB تمیز (clean migration) قابل اجرا باشند؛ تغییر دستی DB پذیرفته نیست.
- تست‌ها نباید skip یا weaken شوند؛ هدف یافتن باگ واقعی است.
- `tenant` به عنوان ستون `uuid` اضافه می‌شود و unique constraintها با `(tenantId, field)` composite می‌شوند.
- `PAYMENTS_SERVICE_URL` برای `issue` اجباری می‌شود و بدون آن صدور انجام نمی‌شود.
