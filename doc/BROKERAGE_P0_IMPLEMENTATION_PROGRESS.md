# گزارش پیشرفت پیاده‌سازی BROKERAGE P0

این سند فعالیت‌ها و پیشرفت اجرای `BROKERAGE_P0_BACKLOG.md` را ثبت می‌کند.

## وضعیت کلی

- **تاریخ شروع**: 2026-07-28
- **بکلاگ مرجع**: `doc/BROKERAGE_P0_BACKLOG.md`
- **هدف**: پیاده‌سازی کامل و دقیق تمام موارد P0

## جدول پیشرفت

| کد بکلاگ | عنوان | وضعیت | تاریخ تکمیل | یادداشت |
|----------|-------|-------|-------------|---------|
| P0-1.1   | موجودیت Organization | در حال اجرا | - | - |
| P0-1.2   | موجودیت Tenant | در حال اجرا | - | - |
| P0-1.3   | API و CRUD Organization/Tenant | در حال اجرا | - | - |
| P0-2.1   | موجودیت Party و نقش | در حال اجرا | - | - |
| P0-2.2   | PII Store/KMS integration | در حال اجرا | - | - |
| P0-2.3   | API Party و Role | در حال اجرا | - | - |
| P0-3.1   | موجودیت BrokerLicense | در حال اجرا | - | - |
| P0-3.2   | API مدیریت مجوز | در حال اجرا | - | - |
| P0-4.1   | موجودیت DistributionAgreement | در حال اجرا | - | - |
| P0-4.2   | API قرارداد | در حال اجرا | - | - |
| P0-5.1   | مدیریت BrandConfig | در حال اجرا | - | - |
| P0-5.2   | Tenant Resolution در API Gateway | در حال اجرا | - | - |
| P0-6.1   | نقش‌ها و مجوزهای کارگزاری | در حال اجرا | - | - |
| P0-6.2   | Policy Engine برای ABAC | در حال اجرا | - | - |
| P0-7.1   | PostgreSQL RLS | در حال اجرا | - | - |
| P0-7.2   | Tenant Context Propagation | در حال اجرا | - | - |
| P0-8.1   | موجودیت Audit Log | در حال اجرا | - | - |
| P0-9.1   | ایجاد Repository Contract | در حال اجرا | - | - |
| P0-10.1  | Backfill داده‌ها | در حال اجرا | - | - |
| P0-10.2  | Dry-run و Reconciliation | در حال اجرا | - | - |
| P0-11    | System-of-Record Matrix | در حال اجرا | - | - |
| P0-12    | IdempotencyRecord | در حال اجرا | - | - |
| P0-13    | JWT Claim Injection / JWKS Integration | در حال اجرا | - | - |
| P0-14    | Observability Foundation | در حال اجرا | - | - |
| P0-15    | Global Architecture Gates | در حال اجرا | - | - |

## گزارش تغییرات

### 2026-07-28
- ایجاد سند گزارش پیشرفت
- شروع ارزیابی وضعیت کد

## تصمیمات فنی (ADRs)

- در حال ثبت...

## نکات اجرایی

- از `decimal` برای پول استفاده می‌شود
- همه migrations idempotent یا versioned Flyway
- همه APIها `X-Correlation-Id` را propagate می‌کنند
