# برنامه رفع ایرادات reinsurance-service

**تاریخ:** ۲۰۲۶-۰۷-۲۷  
**مبنای گزارش:** `18-reinsurance-service-code-audit.md`  
**هدف:** رفع همه نقاط ضعف P0/P1/P2 شناسایی‌شده در `services/reinsurance-service` با حفظ چند-مستأجری (multi-tenant)، امنیت و صحت مالی.

---

## فهرست تغییرات

### P0 — بحرانی

1. **tenantId در تمام موجودیت‌ها و کوئری‌ها**
   - افزودن فیلد `tenantId` به موجودیت‌های: `ReTreaty`, `ReCession`, `ReStatement`, `ReReconciliation`, `ReClaimRecovery`, `ReTicket`, `ReTicketMessage`, `ReTicketAttachment`
   - افزودن ستون `tenant_id` به migration های مربوطه و index برای آن
   - اصلاح متدهای سرویس `create*`, `get*`, `list*`, `update*`, `exportSnapshot` برای فیلتر بر اساس `tenantId`
   - اصلاح کنترلر برای ارسال `tenantId` از `req.user.tenantId` به سرویس
   - اصلاح `PolicyConsumer` برای استفاده از `tenantId` رویداد و فیلتر Treatyهای همان مستاجر

2. **هم‌راستایی شِمای Entity و Migration**
   - افزودن ستون‌های گم‌شده `ReTreaty`: `retention_rate`, `cession_rate`, `config`
   - افزودن ستون‌های گم‌شده `ReCession`: `cession_type`, `retention_rate`, `cession_rate`, `ceded_premium`, `ceded_sum_insured`, `effective_from`, `effective_to`, `currency`
   - اصلاح `createCession` برای پر کردن همه فیلدها
   - اصلاح `calculateCessionAmount` برای خواندن از `terms` به جای `config` (بازگشت به `config` فقط اگر `terms` موجود نباشد)

3. **بازنویسی `closePeriod`**
   - تجمیع همه cessionهای تاییدشده یک treaty در یک بازه قبل از ایجاد statement
   - ایجاد فقط یک statement به ازای هر `treatyId` + `periodEnd`
   - محاسبه صحیح `totalCessions`, `totalCededAmount`, `totalPremium`
   - به‌روزرسانی وضعیت cessionها به `settled` در داخل تراکنش

4. **رفع مشکلات احراز هویت و authorization**
   - حذف `AbacGuard` از کنترلر
   - جایگزینی `JwtAuthGuard` با `EcosystemJwtGuard` از `@insurance/common`
   - تنظیم `TenantGuard` برای پرتاب `ForbiddenException` در صورت نبود `tenantId` یا عدم تطابق `x-tenant-id`
   - افزودن `Reflector` و `EcosystemJwtGuard` به `providers` در `app.module.ts`

5. **اصلاح `PolicyConsumer` برای فیلتر محصول و مستاجر**
   - جایگزینی polling با `KafkaConsumer` از `@insurance/shared`
   - بررسی `tenantId` و `productCode`/`lineOfBusiness` در رویداد و treaty
   - استفاده از `consumeOnce` برای جلوگیری از پردازش تکراری

### P1 — بالا

6. **بهبود health check**
   - افزودن بررسی Kafka و Outbox به `HealthController`

7. **افزودن نسخه‌بندی invoice**
   - تغییر `registerExternalInvoice` برای ثبت history در `details` در صورت وجود قبلی به جای overwrite بی‌صدا

8. **اصلاح `autoMatchInvoice`**
   - کاهش `bufferDays` از ۳۰ روز به مقدار قابل پیکربندی با پیش‌فرض ۳ روز

9. **افزودن تست‌های واحد و یکپارچگی**
   - تست چند-مستأجری برای `listTreaties` و `listCessions`
   - تست محاسبه صحیح `closePeriod`
   - تست `PolicyConsumer` با فیلتر محصول

### P2 — متوسط

10. **به‌روزرسانی `TRUTH.md`**
    - انعکاس وضعیت واقعی پس از رفع ایرادات

---

## ترتیب اجرا

1. **مigrations** — تغییرات schema (tenant_id و ستون‌های گم‌شده)
2. **Entities** — افزودن `tenantId` و ستون‌های جدید
3. **Guards** — اصلاح احراز هویت و authorization
4. **Service** — اصلاح منطق تجاری با tenant
5. **Controller** — ارسال `tenantId` به سرویس
6. **PolicyConsumer** — تبدیل به KafkaConsumer با فیلتر
7. **Health** و **TRUTH.md** و **Tests**

---

## اسناد خروجی مورد انتظار

- گزارش پیشرفت مستقل در: `doc/last audit/reinsurance-remediation-progress.md`
- برنامه فعلی: `doc/last audit/reinsurance-remediation-plan.md`
