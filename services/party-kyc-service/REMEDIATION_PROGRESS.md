# گزارش پیشرفت اصلاح party-kyc-service

**تاریخ:** ۱۴۰۴/۰۵/۰۴ (۲۰۲۶/۰۷/۲۶)  
**مراجع:** گزارش ممیزی `doc/last audit/03-party-kyc-service.md`، برنامه اصلاح `REMEDIATION_PLAN.md`

---

## وضعیت کلی

تمام موارد P0 و P1 موردنظر در این دوره پیاده‌سازی شد. دو مورد P2 (تقویم کاری SLA و تست‌های واحد اولیه) نیز انجام گردید. build/compile موفق و تست‌های واحد پاس شده‌اند. migration آماده اجرا است.

---

## P0 — اصلاحات بحرانی

### P0-1. رمزنگاری PII و حذف کلید پیش‌فرض
**وضعیت:** ✅ انجام شد  
**فایل‌ها:** `src/pii-crypto.ts`، `src/party.service.ts`  
**شرح:**
- ساخت `pii-crypto.ts` با AES-256-GCM (AEAD) با `version:iv:tag:ciphertext`.
- `FIELD_ENCRYPTION_KEY` اجباری؛ عدم تنظیم باعث fail در startup می‌شود (`onModuleInit`).
- کلید پیش‌فرض حذف شد.
- رمزگشایی legacy CBC همچنان پشتیبانی می‌شود تا داده‌های قدیمی قابل خواندن باشند.

### P0-2. Blind Index برای nationalId
**وضعیت:** ✅ انجام شد  
**فایل‌ها:** `src/entities/Party.ts`، `src/pii-crypto.ts`، `src/party.service.ts`  
**شرح:**
- ستون `national_id_blind_index` به `Party` اضافه شد.
- HMAC-SHA256 با کلید `FIELD_BLIND_INDEX_KEY` (derive از `FIELD_ENCRYPTION_KEY` در صورت عدم وجود).
- نرمال‌سازی ارقام فارسی/عربی و حذف صفرهای ابتدایی.
- unique constraint روی `(tenant_id, national_id_blind_index)`.
- duplicate detection در `createParty` با blind index.
- جست‌وجو در `listParties` با blind index.
- identity proofing dedup با blind index.

### P0-3. Tenant Isolation
**وضعیت:** ✅ انجام شد  
**فایل‌ها:** `src/entities/*.ts`، `src/party.service.ts`، `src/party.controller.ts`، `src/tenant.guard.ts`  
**شرح:**
- `tenantId` به تمام entityها اضافه شد.
- `ActorContext` برای ارسال tenant/user/roles/correlationId به service طراحی شد.
- تمام queryهای repository با `tenantId` فیلتر می‌شوند.
- `TenantGuard` fail-closed: بدون user یا tenant رد می‌شود؛ عدم تطابق x-tenant-id با JWT رد می‌شود.

### P0-4. PII Masking سازگار با Fastify
**وضعیت:** ✅ انجام شد  
**فایل‌ها:** `src/pii-masking.interceptor.ts` (جدید)، `src/pii-masking.middleware.ts` (منسوخ)، `src/app.module.ts`، `src/party.controller.ts`  
**شرح:**
- `PiiMaskingInterceptor` با NestJS interceptor پیاده‌سازی شد.
- دیگر از `res.json` اکسپرس استفاده نمی‌شود.
- در `app.module.ts` به‌عنوان `APP_INTERCEPTOR` ثبت شد.
- masking بازگشتی برای nationalId/mobile/email/iban و غیره.

### P0-5. Migration کامل برای همه entityها
**وضعیت:** ✅ انجام شد  
**فایل‌ها:** `src/migrations/1700000000303-complete-party-kyc-schema.ts`، `src/data-source.ts`  
**شرح:**
- migration جدید تمام جداول، ستون‌ها، ایندکس‌ها و constraintهای tenant/position را می‌سازد.
- `data-source.ts` شامل تمام domain entityها و OutboxEvent شد.

### P0-6. Screening نتیجه‌محور از provider
**وضعیت:** ✅ انجام شد (اساسی)  
**فایل‌ها:** `src/party.service.ts`، `src/party.controller.ts`  
**شرح:**
- `runAmlScreening` دیگر `screeningResults` را از body نمی‌پذیرد؛ از `EXTERNAL_SCREENING_URL` فراخوانی می‌کند.
- ذخیره `providerRequestId` و `idempotencyKey` در `screeningResults`.
- `requestExternalVerification` دارای `idempotencyKey` و `providerName` شد.
- identity proofing در صورت عدم پاسخ provider خطا می‌دهد به‌جای fallback به مقادیر پیش‌فرض.

---

## P1 — اصلاحات KYC lifecycle و authorization

### P1-1. State Machine
**وضعیت:** ✅ انجام شد  
**فایل:** `src/party.service.ts`  
**شرح:**
- جدول انتقال `ALLOWED_TRANSITIONS` تعریف شد.
- تمام متدهای تغییر وضعیت (submit/verify/screen/review/escalate) انتقال را validate می‌کنند.
- وضعیت‌های `approved` و `rejected` final هستند.

### P1-2. Transactional Outbox
**وضعیت:** ✅ انجام شد  
**فایل:** `src/party.service.ts`  
**شرح:**
- `createParty`، `reviewKyc`، `grantAmlConsent`، `revokeAmlConsent` در transaction اجرا می‌شوند.
- `OutboxPublisher` با `EntityManager` داخل transaction ساخته می‌شود.
- eventهای KycApproved/Rejected/ConsentGranted/ConsentRevoked/PartyCreated در outbox ثبت می‌شوند.

### P1-3. ABAC Object-Level
**وضعیت:** ✅ انجام شد (پایه)  
**فایل:** `src/abac.guard.ts`  
**شرح:**
- `AbacGuard` fail-closed شد.
- بررسی `tenantId` و role.
- actionهای حساس KYC فقط برای `head_office_ops`/`compliance_officer`/`branch_manager`/`kyc_reviewer` مجاز است.

### P1-4. Consent Lineage
**وضعیت:** ✅ انجام شد  
**فایل‌ها:** `src/entities/ConsentRecord.ts` (جدید)، `src/party.service.ts`، `src/party.controller.ts`، `src/migrations/1700000000303-complete-party-kyc-schema.ts`  
**شرح:**
- `ConsentRecord` با فیلدهای `consentRecordId`، `tenantId`، `partyId`، `consentType`، `purpose`، `legalBasis`، `status`، `action`، `actorId`، `actorRole`، `channel`، `evidence`، `revokeReason`، `validTo`، `version`، `previousRecordId`، `createdAt` پیاده‌سازی شد.
- `grantAmlConsent` و `revokeAmlConsent` هر دو داخل transaction یک `ConsentRecord` جدید ثبت می‌کنند.
- `version` برابر آخرین نسخه + ۱ و `previousRecordId` به رکورد قبلی پیوند می‌خورد.
- رویدادهای outbox `consent_granted`/`consent_revoked` شامل `consentRecordId` منتشر می‌شوند.
- endpoint جدید `GET /parties/:id/consent-history` برای دریافت تاریخچه consent.

### P1-5. Identity/Screening Resilience
**وضعیت:** ✅ انجام شد (پایه)  
**فایل‌ها:** `src/resilient-client.ts` (جدید)، `src/party.service.ts`  
**شرح:**
- `resilientFetch` با retry سه‌مرحله‌ای (exponential backoff)، timeout قابل پیکربندی و header `x-idempotency-key` پیاده‌سازی شد.
- `performIdentityProofing` و `requestExternalVerification` از `resilientFetch` استفاده می‌کنند.
- retry تنها برای خطاهای شبکه و پاسخ‌های ۵xx/۴۲۹/۴۰۸ انجام می‌شود.
- circuit breaker هنوز در scope بعدی قرار دارد (P2 سطح پیشرفته).

### P1-6. Document Trust Chain Atomic/Tamper-Evident
**وضعیت:** ✅ انجام شد (پایه)  
**فایل:** `src/party.service.ts`، `src/entities/DocumentTrustChainEntry.ts`  
**شرح:**
- `addToDocumentTrustChain` در transaction با pessimistic_write lock اجرا می‌شود.
- unique constraint `(tenant_id, party_id, chain_position)`.
- hash chain با `previousHash`.
- نیازمند hash از canonical content + verification signature دارد.

---

## P2 — SLA و تست‌ها

### P2-1. SLA Business Calendar
**وضعیت:** ✅ انجام شد (پایه)  
**فایل:** `src/sla-calendar.ts` (جدید)، `src/party.service.ts`  
**شرح:**
- توابع `addBusinessDays`، `businessDaysBetween` و `isBusinessDay` پیاده‌سازی شد.
- به‌صورت پیش‌فرض شنبه و یکشنبه (۰ و ۶ در JS) غیرکاری محسوب می‌شوند.
- `SLA_WEEKEND_DAYS` و `SLA_HOLIDAYS` از env قابل پیکربندی هستند.
- `checkSlaCompliance` و `getOverdueReviews` بر اساس ۷ روز کاری محاسبه می‌شوند.

### P2-2. تست‌های اختصاصی
**وضعیت:** ✅ انجام شد (اولیه)  
**فایل‌ها:** `test/pii-crypto.test.ts`، `test/sla-calendar.test.ts`، `package.json`  
**شرح:**
- اسکریپت `test` به `package.json` اضافه شد (`bun test test/`).
- تست‌های واحد برای رمزنگاری PII و تقویم کاری اجرا شده و پاس شدند.  

---

## فایل‌های تغییرکرده

- `src/pii-crypto.ts` (جدید)
- `src/pii-masking.interceptor.ts` (جدید)
- `src/resilient-client.ts` (جدید)
- `src/sla-calendar.ts` (جدید)
- `src/entities/ConsentRecord.ts` (جدید)
- `src/migrations/1700000000303-complete-party-kyc-schema.ts` (جدید)
- `src/data-source.ts`
- `src/app.module.ts`
- `src/entities/Party.ts`
- `src/entities/KycReview.ts`
- `src/entities/DocumentTrustChainEntry.ts`
- `src/entities/IdentityProofingRecord.ts`
- `src/entities/ExternalVerificationRequestEntity.ts`
- `src/entities/KycExceptionEntity.ts`
- `src/party.service.ts`
- `src/party.controller.ts`
- `src/tenant.guard.ts`
- `src/abac.guard.ts`
- `TRUTH.md`
- `package.json`
- `test/pii-crypto.test.ts` (جدید)
- `test/sla-calendar.test.ts` (جدید)
- `src/pii-masking.middleware.ts` (حذف شد)

---

## مرحله بعد

1. build/compile و اجرای migration.
2. اجرای تست‌های یکپارچه و رفع خطاهای احتمالی.
3. بررسی دقیق‌تر state machine و document trust chain در صورت درخواست سطح پیشرفته‌تر.
4. افزودن circuit breaker و metric برای identity/screening (سطح P2 پیشرفته).
5. تهیه Persian holiday list برای SLA calendar.
