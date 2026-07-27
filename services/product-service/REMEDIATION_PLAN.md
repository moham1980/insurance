# برنامه رفع ایرادات product-service

## تاریخ: ۲۰۲۶/۰۷/۲۶
## منبع: doc/last audit/04-product-service-code-audit.md
## هدف: رفع ریشه‌ای P0 و بهبود P1/P2 با حداقل تغییر مؤثر

## ۱. خلاصه وضعیت

این سرویس دارای اسکلت catalog و pricing است اما فاقد tenant isolation، lifecycle کامل version، موتور quote یکپارچه، اعتبارسنجی قواعد قیمت، محاسبه مالی امن و audit کامل است.

## ۲. تغییرات P0 (بحرانی)

### P0-1 tenant isolation
- اضافه کردن `tenantId` به Entityهای `Product`، `Coverage`، `Deductible`، `PricingRule`، `ProductVersion`
- اجبار به دریافت `tenantId` در تمام methodهای `ProductService`
- فیلتر تمام queryهای get/list بر اساس `tenantId`
- تغییر unique indexها به `(tenant_id, code)`
- reject دسترسی cross-tenant در controller با بهره‌گیری از `TenantGuard` بهبودیافته
- migrationهای مربوط به `tenant_id` و indexها

### P0-2 migration و registry کامل
- ساخت migration `1760000000620-create-product-versions.ts`
- اضافه کردن `ProductVersion` و `OutboxEvent` به `data-source.ts`
- اطمینان از هماهنگی migration و runtime entities

### P0-3 موتور quote یکپارچه و امن
- حذف دو موتور موازی `computeQuote` و `evaluatePricingRules`
- ساخت `QuoteEngine` واحد با پشتیبانی از:
  - product status = active
  - version منتشرشده
  - effectiveDate اجباری/پیش‌فرض
  - rule validFrom/validTo
  - region scoping (fail-closed)
  - currency اجباری
  - bounds و rounding
  - one base rule policy
  - calculation snapshot و applied rule IDs
- تغییر `computeQuote` به delegate به `QuoteEngine`
- حذف یا منسوخ کردن `evaluatePricingRules`

### P0-4 Decimal/money و اعتبارسنجی rule
- پیاده‌سازی `Money` بر پایه string minor-unit (مثلاً RIAL/IRR)
- استفاده از `Money` در quote و rule evaluation
- رد ruleهای نامعتبر: NaN/Infinity/negative غیرمجاز/operator ناشناس/type ناشناس
- schema validation در `createPricingRule`/`updatePricingRule`

## ۳. تغییرات P1

### P1-1 publish lifecycle
- اضافه کردن `publishVersion` با actor/reason/approval/effectiveDate
- snapshot immutable برای هر نسخه
- انتشار event `ProductVersionPublished`
- ممنوعیت update مستقیم نسخه active

### P1-2 child versioning و events
- اجرای create/update/archive coverage/deductible/pricing rule در transaction
- نوشتن outbox event برای هر تغییر
- بررسی وضعیت parent (آرشیو نشده) و tenant

### P1-3 state machine و parent-child authorization
- جدول transition وضعیت product/coverage/deductible/pricing rule
- بررسی وابستگی و وضعیت parent هنگام create/update

### P1-4 ABAC/JWT
- استفاده از `EcosystemJwtGuard` مشترک (JWKS + HS256 fallback) به جای jwt-auth.guard محلی
- اصلاح `AbacGuard` به fail-closed و بررسی resource scope

### P1-5 export امن و audit
- scope کردن export به tenant
- audit برای update/archive/quote/export
- redaction اطلاعات حساس در export

## ۴. تغییرات P2 و runtime

- `main.ts`: `await outboxWorker.start()`
- `health.controller.ts`: بررسی Kafka و Outbox
- `Dockerfile`: حذف `NODE_TLS_REJECT_UNAUTHORIZED=0`
- نوشتن تست‌های unit/integration برای tenant، quote، lifecycle

## ۵. معیار پذیرش

1. build موفق `tsc` بدون error
2. migration اجرا می‌شود و ProductVersion/Outbox ایجاد می‌شوند
3. quote با fixture یکسان در endpointهای مختلف نتیجه یکسان می‌دهد
4. cross-tenant access رد می‌شود
5. NaN/negative/Infinity در quote و rule رد می‌شوند
6. `TRUTH.md` با واقعیت کد هم‌خوان می‌شود
