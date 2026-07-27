# گزارش پیشرفت اصلاحات `claims-service`

**تاریخ:** ۲۰۲۶/۰۷/۲۷  
**دوره:** اصلاحات P0/P1 بر اساس ممیزی `07-claims-service-code-audit.md`

## خلاصه اجرایی

اصلاحات اساسی زیر در `claims-service` اعمال شد. همه فایل‌های اصلی دوباره نوشته یا بازنویسی شدند، `tsc` بدون خطا کامپایل می‌کند و تنظیمات runtime (port/schema) هم‌راستا شده‌اند.

---

## ۱. رفع یافته‌های P0

### CLAIMS-CODE-001 — tenant در Claim و queryها
- **فایل‌ها:** `src/entities/Claim.ts`, `src/claims.service.ts`, `src/claims.controller.ts`, `src/tenant.guard.ts`
- **تغییرات:**
  - ستون‌های `tenantId`، `version`، `currency`، `idempotencyPayloadHash` و `paymentReference` به `Claim` اضافه شد.
  - migration `1700000000107-tenant-currency-and-audit-columns.ts` این ستون‌ها و ایندکس‌های unique `(tenant_id, idempotency_key)` و `(tenant_id, payment_reference)` را می‌سازد.
  - همه متدهای `ClaimsService` پارامتر `tenantId` می‌گیرند و queryها با `tenant_id` فیلتر می‌شوند.
  - `TenantGuard` context نهایی را روی `request.tenantId` و `user.tenantId` می‌نویسد و نبود tenant را رد می‌کند.

### CLAIMS-CODE-002 — کنترل دقیق مبلغ و currency
- **فایل:** `src/claims.service.ts`
- **تغییرات:**
  - `validateAmount` عدد، `NaN/Infinity`، منفی و سقف ۱e۱۲ را بررسی می‌کند.
  - `validateCurrency` کد سه‌حرفی ISO می‌خواهد.
  - `assessClaim` مبلغ ارزیابی را ذخیره می‌کند.
  - `approveClaim` فقط تا `assessedAmount` مجاز است.
  - `payClaim` فقط برابر `approvedAmount` و با `paymentReference` یکتا پذیرفته می‌شود.

### CLAIMS-CODE-003 — idempotency در API
- **فایل‌ها:** `src/claims.service.ts`، `src/claims.controller.ts`
- **تغییرات:**
  - controller کلید `Idempotency-Key` را از header/body می‌خواند.
  - service `idempotencyPayloadHash` را محاسبه و در صورت مغایرت payload خطای `IDEMPOTENCY_CONFLICT` می‌دهد.
  - در صورت تکرار کلید با payload یکسان، رکورد قبلی برگردانده می‌شود.

### CLAIMS-CODE-004 — atomic consumeOnce
- **فایل:** `src/claims-events.consumer.ts`
- **تغییرات:**
  - به‌جای ثبت consumed قبل از business effect، کل عملیات در `dataSource.transaction` قرار گرفت.
  - ابتدا `INSERT` به `consumed_events` انجام می‌شود، سپس `handleVerifiedEvent` اجرا می‌شود و در پایان `processed=true` ثبت می‌شود.
  - در صورت خطا کل تراکنش rollback شده و پیام به DLQ فرستاده می‌شود.

### CLAIMS-CODE-005 — event پرداخت بدون اعتبارسنجی
- **فایل:** `src/claims-events.consumer.ts`
- **تغییرات:**
  - `handlePaymentEvent` tenant event را با claim مقایسه می‌کند.
  - `verifyPayment` مبلغ، currency، payment reference و وضعیت `executed/settled` را چک می‌کند.
  - فقط از state `approved` به `paid` گذار داده می‌شود.
  - `PaymentFailed` state را به `approved` بازمی‌گرداند تا قابل retry باشد.

### CLAIMS-CODE-006 — migration و runtime schema/port
- **فایل‌ها:** `src/app.module.ts`، `src/data-source.ts`، `src/main.ts`، `Dockerfile`، `src/health.controller.ts`
- **تغییرات:**
  - `DB_SCHEMA` پیش‌فرض `claims` در `app.module.ts` و `data-source.ts` یکسان شد.
  - پورت پیش‌فرض runtime `3002` و `Dockerfile EXPOSE 3002` و `ENV PORT=3002` هم‌راستا شد.
  - health check اکنون `current_schema()` را برمی‌گرداند و خطای خام DB را expose نمی‌کند.

---

## ۲. رفع یافته‌های P1

### CLAIMS-CODE-007/۰۱۰/۰۱۴ — lock، SoD و policy gates
- **فایل:** `src/claims.service.ts`
- **تغییرات:**
  - تمام mutationها `pessimistic_write` lock دارند.
  - `assertSoD` جلوگیری می‌کند ارزیاب همان approver/payer باشد.
  - `approveClaim` بدون `policyValidated=true` خطا می‌دهد.
  - outbox event حتماً با همان `manager` تراکنش publish می‌شود (atomic outbox).

### CLAIMS-CODE-009 — policy validation fail-closed
- **فایل:** `src/claims.service.ts`
- **تغییرات:**
  - `validatePolicyForClaim` در صورت عدم تنظیم `POLICY_SERVICE_URL` یا دریافت پاسخ نامعتبر خطا می‌دهد.
  - `policyValidated` فقط در صورت `policyActive && withinPolicyPeriod && coverageValid` `true` می‌شود.
  - مقایسه coverage به‌صورت case-insensitive انجام می‌شود.

### CLAIMS-CODE-011 — محاسبه فرانشیز
- **فایل:** `src/claims.service.ts`
- **تغییرات:**
  - `calculateDeductible` کل mبلغ ناخالص، deductible (ثابت/درصدی)، franchise (با threshold) و net payable را محاسبه و در claim ذخیره می‌کند.
  - محاسبه در تراکنش با lock انجام می‌شود.

### CLAIMS-CODE-013/۰۲۰ — ABAC و PII Masking با Fastify
- **فایل‌ها:** `src/abac.guard.ts`، `src/tenant.guard.ts`، `src/pii-masking.middleware.ts`
- **تغییرات:**
  - `AbacGuard` از `request.url`، `request.routerPath` و `request.raw.url` استفاده می‌کند و mutationهای محدود را بر اساس role محدود می‌کند.
  - `TenantGuard` tenant را از JWT یا header می‌گیرد و mismatch را `Forbidden` می‌کند.
  - `PiiMaskingMiddleware` برای Express از `res.json` و برای Fastify از `res.send` استفاده می‌کند.

### CLAIMS-CODE-017 — fraud event با state/tenant
- **فایل:** `src/claims-events.consumer.ts`
- **تغییرات:**
  - `FraudCaseEscalated` فقط stateهای `registered/assessed/adjuster_review` را تغییر می‌دهد.
  - `FraudCaseResolved` با `confirmed_fraud` فقط تا `approved` قابل reject است.

### CLAIMS-CODE-023/۰۲۵/۰۲۶ — migration، health، port
- **فایل‌ها:** `tsconfig.json`، `src/health.controller.ts`، `src/main.ts`، `Dockerfile`
- **تغییرات:**
  - `tsconfig.json` از `src/**/*` استفاده می‌کند تا همه sourceها کامپایل شوند.
  - `health.controller.ts` schema را گزارش می‌دهد.
  - port و schema canonical شد.

---

## ۳. build و وضعیت کامپایل

```powershell
npx tsc --noEmit   # ✅ بدون خطا
npx tsc            # ✅ dist/ تولید شد
```

> هشدار `npm warn Unknown env config "python"` مربوط به npm محلی است و تأثیری بر compile ندارد.

---

## ۴. فایل‌های تغییریافته

- `src/entities/Claim.ts`
- `src/data-source.ts`
- `src/app.module.ts`
- `src/migrations/1700000000107-tenant-currency-and-audit-columns.ts`
- `src/claims.service.ts`
- `src/claims.controller.ts`
- `src/claims-events.consumer.ts`
- `src/tenant.guard.ts`
- `src/abac.guard.ts`
- `src/pii-masking.middleware.ts`
- `src/permissions.guard.ts`
- `src/health.controller.ts`
- `src/main.ts`
- `tsconfig.json`
- `Dockerfile`
- `TRUTH.md`

---

## ۵. گاف‌های باقی‌مانده (P2 / نیاز به تست)

| گاف | اولویت | توضیح |
|---|---|---|
| تست unit/integration | P2 | هنوز `*.spec.ts` یا `*.test.ts` در سرویس وجود ندارد؛ موارد P0 بدون تست automated ثابت نشده‌اند. |
| تست همزمانی approve/pay | P2 | lock و idempotency عملیاتی‌اند اما باید با تست چندنخی تأیید شوند. |
| readiness عمیق | P2 | health فقط DB را بررسی می‌کند؛ Kafka consumer، outbox و وابستگی‌های downstream باید اضافه شوند. |
| consumer retry دائمی | P2 | retry تا ۵ بار و سپس stop؛ باید با exponential backoff/jitter و metric/recover خودکار جایگزین شود. |
| encryption PII در rest | P2 | PII هنوز plaintext در JSONB ذخیره می‌شود؛ classification/retention/encryption نیاز دارد. |
| event schema/registry | P2 | validation schema رسمی برای eventها و consumer contract هنوز مستقل نیست. |
| mTLS / service token audience | P2 | `getServiceToken` همچنان به قرارداد auth-service متکی است؛ audience/tenant binding باید تقویت شود. |

---

## ۶. نتیجه

موارد P0 ممیزی `07-claims-service-code-audit` در سطح کد برطرف شدند. سرویس در وضعیت **compile-ready و آماده تست runtime/Integration** قرار دارد. برای رسیدن به `Production-ready` باید تست‌های unit/integration، smoke test container و migration upgrade بر روی DB واقعی اجرا شوند.
