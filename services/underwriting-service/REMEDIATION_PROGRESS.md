# برنامه رفع و گزارش پیشرفت — Underwriting-Service

این سند بر اساس گزارش `doc/last audit/09-underwriting-service-code-audit.md` تهیه شده و هر مرحله پس از اجرا به‌روزرسانی می‌شود.

## خلاصه وضعیت

- **دامنه:** `services/underwriting-service`
- **اهداف:** رفع نقاط بحرانی P0، اصلاحات امنیتی P1، بهبود عملکرد P2/P3.
- **اصلاحات انجام‌شده:** نهایی‌شده (P0/P1/P2 اصلی) — بخش P3 محدود به redaction و اعتبارسنجی اضافی انجام شد.
- **تست‌ها:** `npx jest` → 3 suite / 12 test PASS.
- **بیلد:** `npx tsc --noEmit` PASS.

## مرحله ۱ — P0: طرح و مهاجرت دیتابیس

- [x] ساخت migration جدید برای `underwriting_appetite` (`1700000000602-create-underwriting-appetite.ts`)
- [x] افزودن ستون‌های `tenant_id` / `priority` / `min_sum_insured` / `min_premium` به `UnderwritingAppetite`
- [x] افزودن ستون‌های `tenant_id` / `assigned_underwriter_id` / `escalation_reason` / `source` / `version` / `risk_assessment_history` به `UnderwritingRequest`
- [x] migration تکمیلی برای `underwriting_requests` (`1700000000603-add-underwriting-request-tenant-audit.ts`)
- [x] همگام‌سازی `data-source.ts` و `app.module.ts` با `UnderwritingRequest`, `UnderwritingAppetite`, `OutboxEvent`
- [x] غیرفعال کردن `synchronize` در `data-source.ts` و `app.module.ts`

## مرحله ۲ — P0: عایق‌بندی tenant

- [x] افزودن `tenantId` به موجودیت‌ها و همه درخواست‌های create/update/delete/query
- [x] اعمال فیلتر `tenantId` در `getRequest`, `listRequests`, `decide`, `escalateOverdueReview`, `assessRisk`, `checkSlaBreaches`, `getSlaMetrics`
- [x] اعمال فیلتر `tenantId` در عملیات appetite (`createAppetiteRule`, `evaluateAppetite`, `listAppetiteRules`, `updateAppetiteRule`, `deleteAppetiteRule`)
- [x] محکم‌سازی `TenantGuard` برای رد درخواست بدون `tenantId` (کدهای `TENANT_REQUIRED` / `TENANT_MISMATCH`)

## مرحله ۳ — P0: Idempotency

- [x] پیاده‌سازی `IdempotencyService` با Redis (در صورت `REDIS_URL`) یا in-memory Map به‌عنوان fallback
- [x] پیاده‌سازی `IdempotencyInterceptor` برای خواندن `x-idempotency-key` و replay پاسخ موفق
- [x] اعمال خودکار idempotency روی endpointهای command از طریق `APP_INTERCEPTOR`
- [x] TTL قابل تنظیم از طریق `IDEMPOTENCY_TTL_SECONDS`

## مرحله ۴ — P1: امنیت و اعتبارسنجی

- [x] جایگزینی `JwtAuthGuard` با `EcosystemJwtGuard` پشتیبانی JWKS/RS256 با fallback HS256
- [x] حذف `AbacGuard` از زنجیره Guards و `providers` (جلوگیری از escalation غیرمجاز)
- [x] افزودن `class-validator` DTOs در `src/dto/underwriting.dto.ts`
- [x] افزودن `ValidationPipe` سراسری در `main.ts`
- [x] افزودن `@fastify/helmet` در `main.ts`
- [x] پیاده‌سازی `PiiRedactionInterceptor` با استفاده از `redactPiiInObject` در خروجی‌ها
- [x] redaction PII در `auditLogger` (`src/audit.logger.ts`)

## مرحله ۵ — P1: عملکرد و درستی منطق

- [x] اصلاح `checkSlaBreaches` جهت استفاده از `cutoffDate` و فیلتر `tenantId`
- [x] بهینه‌سازی `getSlaMetrics` با aggregateهای SQL و پنجره تاریخ (`from` / `to`)
- [x] بازنگری `evaluateAppetite` با `priority DESC`, `created_at DESC`, `min/max` sum insured و premium
- [x] externalize risk scoring: `RiskScoringService` + `default-risk-config.ts` + پشتیبانی از فایل `RISK_SCORING_CONFIG`
- [x] ذخیره history در `assessRisk` (`riskAssessmentHistory`)
- [x] Graceful shutdown برای `OutboxWorker` و `KafkaProducer` در `main.ts` (Fastify `onClose` hook)
- [x] هشدار در صورت خالی بودن `KAFKA_BROKERS`

## مرحله ۶ — P2/P3: تکمیلی

- [x] ارسال event برای `updateAppetiteRule` (`UnderwritingAppetiteRuleUpdated`) و `deleteAppetiteRule` (`UnderwritingAppetiteRuleDeleted`)
- [x] بروزرسانی `TRUTH.md` مطابق کد واقعی
- [x] افزودن `jest.config.js` و تست‌های واحد برای `RiskScoringService`, `TenantGuard`, `IdempotencyService`
- [ ] OpenAPI/Swagger decorators کامل (DTO-ها آماده‌اند؛ `@nestjs/swagger` اضافه شد اما `SwaggerModule` setup نیاز به `@fastify/swagger` دارد)
- [ ] Rate limiting (Fastify plugin) هنوز اضافه نشده

## فایل‌ها و ماژول‌های کلیدی تغییریافته

- `src/migrations/1700000000602-create-underwriting-appetite.ts` (جدید)
- `src/migrations/1700000000603-add-underwriting-request-tenant-audit.ts` (جدید)
- `src/entities/UnderwritingRequest.ts`
- `src/entities/UnderwritingAppetite.ts`
- `src/data-source.ts`
- `src/app.module.ts`
- `src/main.ts`
- `src/underwriting.service.ts`
- `src/underwriting.controller.ts`
- `src/dto/underwriting.dto.ts` (جدید)
- `src/ecosystem-jwt.guard.ts` (جدید)
- `src/tenant.guard.ts`
- `src/idempotency.service.ts` (جدید)
- `src/idempotency.interceptor.ts` (جدید)
- `src/pii-redaction.interceptor.ts` (جدید)
- `src/risk-scoring/risk-scoring.service.ts` (جدید)
- `src/risk-scoring/default-risk-config.ts` (جدید)
- `src/risk-scoring/risk-config.types.ts` (جدید)
- `src/audit.logger.ts`
- `src/tenant.guard.spec.ts` (جدید)
- `src/idempotency.service.spec.ts` (جدید)
- `src/risk-scoring/risk-scoring.service.spec.ts` (جدید)
- `TRUTH.md`
- `package.json`
- `jest.config.js` (جدید)

## نتایج تأیید

| فرمان | خروجی |
|---|---|
| `npx tsc --noEmit` | PASS (بدون خطای کامپایل) |
| `npx jest` | 3 suite / 12 test PASS |

## لاگ پیشرفت

| تاریخ/زمان | مرحله | توضیح |
|---|---|---|
| آغاز | تحلیل | خواندن کامل `09-underwriting-service-code-audit.md` و فایل‌های سرویس |
| مرحله ۱ | P0 | ایجاد migrationهای `underwriting_appetite` و افزودن ستون‌های tenant/audit |
| مرحله ۲ | P0 | اضافه شدن `tenantId` به موجودیت‌ها و فیلترهای لایه سرویس |
| مرحله ۳ | P0 | پیاده‌سازی `IdempotencyService` و `IdempotencyInterceptor` |
| مرحله ۴ | P1 | جایگزینی JWT guard، حذف `AbacGuard`، افزودن DTOها/ValidationPipe/helmet/PII |
| مرحله ۵ | P1/P2 | اصلاح SLA/risk/appetite و graceful shutdown |
| مرحله ۶ | P3 | redaction در audit logger و تست‌های واحد |
| پایان | تأیید | `tsc --noEmit` و `jest` هر دو PASS |

## نکات باقی‌مانده و پیشنهادات

1. **Swagger/OpenAPI:** DTOها با `class-validator` آماده‌اند؛ برای راه‌اندازی کامل `@nestjs/swagger` در Fastify نیاز به نصب/تنظیم `@fastify/swagger` و `@fastify/swagger-ui` است.
2. **Rate limiting:** پیشنهاد می‌شود `@fastify/rate-limit` یا معادل NestJS در `main.ts` ثبت شود.
3. **Idempotency در multi-replica:** در صورت چند replica، باید `REDIS_URL` تنظیم شود تا store مشترک داشته باشد.
4. **تست‌های یکپارچگی:** تست‌های فعلی unit هستند؛ برای coverage کامل ترکیب TypeORM + Testcontainer/PostgreSQL توصیه می‌شود.
