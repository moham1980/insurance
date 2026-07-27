# برنامه اصلاحی سرویس party-kyc-service

**منبع:** گزارش ممیزی `doc/last audit/03-party-kyc-service.md`  
**تاریخ شروع:** ۱۴۰۴/۰۵/۰۴ (۲۰۲۶/۰۷/۲۶)  
**هدف:** رفع نواقص P0 و P1 به‌صورت اصولی و ثبت گزارش پیشرفت

---

## P0 — اصلاحات بحرانی

### P0-1. رمزنگاری PII و کلید پیش‌فرض (PARTY-CODE-001)

**مشکل:** `FIELD_ENCRYPTION_KEY || 'default-encryption-key-32b'` و AES-256-CBC بدون authentication tag.

**اقدام:**
1. حذف fallback کلید پیش‌فرض؛ throw در startup اگر `FIELD_ENCRYPTION_KEY` تنظیم نشده یا طول کمتر از ۳۲ بایت باشد.
2. مهاجرت به AES-256-GCM: ciphertext = `version:iv:authTag:encrypted`.
3. key versioning در payload برای rotation آینده.
4. عدم log/return plaintext در response به‌صورت پیش‌فرض.

**فایل‌ها:** `src/party.service.ts`, `src/entities/Party.ts`

### P0-2. Blind Index برای national ID (PARTY-CODE-002, 006, 017)

**مشکل:** IV تصادفی باعث می‌شود هر encrypt مقدار متفاوت داشته باشد؛ duplicate detection و جست‌وجو خراب است.

**اقدام:**
1. افزودن ستون `national_id_blind_index` به `Party` (و `mobile_blind_index` اختیاری).
2. ساخت HMAC-SHA256 با کلید جداگانه `FIELD_BLIND_INDEX_KEY` (derive از `FIELD_ENCRYPTION_KEY` در صورت عدم وجود).
3. نرمال‌سازی national ID قبل از HMAC (فارسی/انگلیسی، صفرهای ابتدایی).
4. جایگزینی queryهای `nationalId` با `nationalIdBlindIndex`.
5. اعمال unique constraint روی `(tenant_id, national_id_blind_index)`.

**فایل‌ها:** `src/entities/Party.ts`, `src/party.service.ts`, `src/migrations/*.ts`

### P0-3. Tenant Isolation (PARTY-CODE-003, 013, 014)

**مشکل:** هیچ entity یا query شرط tenant ندارد؛ cross-tenant data leakage.

**اقدام:**
1. افزودن `tenantId` به تمام entityها.
2. استخراج `tenantId` از JWT payload (نه header) و رد درخواست بدون tenant.
3. اضافه‌کردن `tenantId` به تمام methodهای `PartyService` به‌صورت context.
4. اعمال `AND tenant_id = :tenantId` در queryهای get/list/review.
5. رفع `TenantGuard` و `AbacGuard` برای fail-closed.

**فایل‌ها:** `src/entities/*.ts`, `src/party.service.ts`, `src/party.controller.ts`, `src/tenant.guard.ts`, `src/abac.guard.ts`

### P0-4. PII Masking سازگار با Fastify (PARTY-CODE-004)

**مشکل:** `PiiMaskingMiddleware` از `Response` اکسپرس استفاده می‌کند درحالی‌که main FastifyAdapter است.

**اقدام:**
1. تبدیل middleware به `PiiMaskingInterceptor` (NestJS interceptor) یا serializer سازگار با Fastify.
2. حذف `res.json` override؛ استفاده از `map` روی پاسخ در interceptor.
3. عدم بازگرداندن nationalId/mobile کامل در response به‌صورت پیش‌فرض؛ استفاده از mask helper.
4. ثبت interceptor در `app.module.ts` به‌جای middleware.

**فایل‌ها:** `src/pii-masking.middleware.ts` (rename/refactor), `src/app.module.ts`, `src/party.controller.ts`

### P0-5. Migration کامل برای همه entityها (PARTY-CODE-015, 016)

**مشکل:** migrationهای موجود فقط دو جدول اولیه می‌سازند؛ `data-source.ts` فقط دو entity می‌شناسد.

**اقدام:**
1. ایجاد migration `1700000000303-complete-party-kyc-schema.ts` با تمام جداول، ستون‌ها، FKها، ایندکس‌ها.
2. بروزرسانی `data-source.ts` با registry مشترک entity ( Outbox + تمام domain entities).
3. غیرفعال‌کردن synchronize در production (`DB_SYNC` فقط در dev مجاز).

**فایل‌ها:** `src/migrations/1700000000303-complete-party-kyc-schema.ts`, `src/data-source.ts`

### P0-6. Screening نتیجه‌محور از provider (PARTY-CODE-005, 006)

**مشکل:** `/kyc/aml-screening` نتیجه screening را از body می‌پذیرد و بدون source ذخیره می‌کند.

**اقدام:**
1. پذیرش صرفاً `serviceType` و `payload`؛ فراخوانی provider واقعی `EXTERNAL_SCREENING_URL`.
2. ذخیره `providerRequestId`, `providerResponseSignature`, `providerName`, `screenedAt`.
3. reject نتایج بدون source proof.
4. در صورت عدم تنظیم URL، ثبت درخواست به‌عنوان `pending` و ارسال به outbox برای پردازش async.

**فایل‌ها:** `src/party.service.ts`, `src/party.controller.ts`, `src/entities/KycReview.ts`, `src/entities/ExternalVerificationRequestEntity.ts`

---

## P1 — اصلاحات lifecycle KYC و authorization

### P1-1. State Machine (PARTY-CODE-007)

- تعریف transition table رسمی stage/status.
- اعتبارسنجی transition قبل از هر mutation.
- optimistic locking با version.
- ثبت state history و actor.

### P1-2. Transactional Outbox (PARTY-CODE-008, 009)

- پیاده‌سازی helper برای insert به outbox داخل transaction.
- publish event برای تمام mutationهای حساس (KycApproved/Rejected, PartyCreated, ConsentGranted/Revoked, ExceptionRaised/Resolved).
- عدم بلعیدن خطای outbox.

### P1-3. ABAC Object-Level (PARTY-CODE-012, 013, 014)

- fail-closed در نبود user.
- resource resolver قبل از read/write.
- بررسی `tenantId` و `partyId` در scope کاربر.
- restrict actionهای حساس بر اساس role/branch/tenant.

### P1-4. Consent Lineage (PARTY-CODE-010)

- ایجاد `ConsentRecord` entity.
- ذخیره purpose/legal basis/version/channel/actor/reason/evidence.
- تاریخچه grant/revoke قابل بازسازی.

### P1-5. Identity/Screening Resilience (PARTY-CODE-011, بخش identity/screening)

- timeout، retry با backoff، circuit breaker، idempotency key.
- تشخیص provider unavailable از identity failed.
- کنترل size/type/virus/privacy برای تصاویر.

### P1-6. Document Trust Chain Atomic/Tamper-Evident (PARTY-CODE-011 بخش trust chain)

- hash از canonical content (نه از caller).
- transaction + unique constraint `(tenant_id, party_id, chain_position)`.
- verification با enum validation و actor/reason.
- tamper-evident با hash کل رکورد + signature.

---

## P2 — تکمیل و تست

### P2-1. SLA Business Calendar

- تقویم کاری ایران، timezone، تعطیلات.
- pause/resume SLA.
- alert/escalation خودکار.

### P2-2. تست‌های اختصاصی سرویس

- unit test برای crypto, blind index, state machine.
- integration test برای cross-tenant isolation.
- E2E test برای flow کامل KYC.

---

## معیار پذیرش

- [ ] Startup بدون `FIELD_ENCRYPTION_KEY` و `FIELD_BLIND_INDEX_KEY` fail می‌شود.
- [ ] Duplicate national ID با tenant متفاوت مجاز، با tenant یکسان رد می‌شود.
- [ ] جست‌وجو بر nationalId با blind index درست کار می‌کند.
- [ ] پاسخ `/party/:id` بدون nationalId/mobile plaintext کامل برمی‌گردد.
- [ ] درخواست cross-tenant به هر endpoint رد می‌شود.
- [ ] Migration روی DB خالی و upgrade DB موجود موفق است.
- [ ] State machine transition نامعتبر را رد می‌کند.
- [ ] Eventهای KYC در outbox داخل transaction ثبت می‌شوند.
