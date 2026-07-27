# Deploy Runbook (Bun + NestJS Microservices)

## Goals

- Build services deterministically.
- Apply database migrations explicitly.
- Run services with `DB_SYNC=false` in production.

## Auth Service (IAM)

### Required environment variables

- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SCHEMA` (recommended: `auth`)
- `DB_SYNC` (production: `false`)

### Build

From repo root:

- `bun run build`

Or from service folder:

- `bun run build`

### Migrate

Run migrations before starting the service:

- `bun run migrate:build`

Or (if already built):

- `bun run migrate`

### Start

- `bun run start`

## Recommended production policy

- `DB_SYNC=false`
- Migrations run as a separate step in CI/CD before rolling out new service versions.
- Use one Postgres database per insurer installation, separated by schema per service.

## Notes

- `auth-service` uses scoped IAM based on `orgUnitId`.
- Permissions are enforced via `PermissionsGuard`, and scope is enforced for read/write endpoints.

## Retention / Backup / DR (مطابق سند 1404)

### 1) Retention policy (حداقل‌ها)

- نگهداری **Audit Log** برای عملیات حساس (صدور، پرداخت، تغییرات) و مسیرهای کلیدی فرایندی به‌صورت **حداقل 5 سال**.
- اصل **حداقل‌سازی داده** و مشخص‌کردن داده‌های قابل mask/redact (PII) برای خروجی‌ها/لاگ‌ها.
- دسترسی به داده‌های نگهداری‌شده باید RBAC و ممیزی‌پذیر باشد.

> نکته اجرایی: در این ریپو Audit Trail به‌صورت جدول‌های audit در schemaهای مختلف (مثل `fraud_score_audit`, `kpi_ingestion_audit`, `copilot_audit`, ...) ذخیره می‌شود؛ سیاست نگهداری باید هم DB backup را پوشش بدهد و هم حذف/آرشیو داده‌های قدیمی را به‌صورت کنترل‌شده تعریف کند.

### 2) Backup (Postgres) — فرآیند اجرایی

#### 2.1 پیش‌نیازها

- ابزارهای Postgres client باید موجود باشند:
  - `pg_dump`
  - `pg_restore`
  - `psql`
- مسیر پیشنهادی برای فایل‌های backup:
  - روی storage امن (object storage / NAS / encrypted volume)
  - جدا از نودهای اجرای سرویس‌ها

#### 2.2 Backup on-demand

اسکریپت آماده در ریپو:
- `scripts/pg-backup.sh`

نمونه اجرا:
- `PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres PGDATABASE=insurance BACKUP_DIR=./backups RETENTION_DAYS=90 ./scripts/pg-backup.sh`

خروجی:
- فایل با فرمت `custom` (پسوند `.dump`) با timestamp UTC.

#### 2.3 Backup زمان‌بندی‌شده (Scheduler)

در production باید این اسکریپت توسط scheduler سازمان (Cron/K8s CronJob/CI Runner) اجرا شود.

الزام اجرایی:
- حداقل یک backup روزانه
- نگهداری backupها مطابق سیاست داخلی (برای audit trail حداقل 5 سال، معمولاً با الگوی:
  - daily (N روز)
  - weekly (N هفته)
  - monthly (N ماه)
  - yearly (>=5 سال)
)

> توجه: `RETENTION_DAYS` داخل اسکریپت صرفاً برای prune ساده‌ی لوکال است؛ سیاست 5 ساله باید روی storage اصلی و lifecycle policy اعمال شود.

### 3) Restore + تست بازیابی (Restore Test)

#### 3.1 Restore

اسکریپت آماده در ریپو:
- `scripts/pg-restore.sh`

نمونه اجرا:
- `PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres PGDATABASE=insurance DUMP_FILE=./backups/insurance_YYYYMMDDTHHMMSSZ.dump ./scripts/pg-restore.sh`

#### 3.2 Verify پس از Restore

اسکریپت smoke-test:
- `scripts/pg-restore-verify.sh`

نمونه اجرا:
- `PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres PGDATABASE=insurance ./scripts/pg-restore-verify.sh`

الزام:
- تست restore باید به‌صورت دوره‌ای (حداقل ماهانه) روی محیط جداگانه انجام شود و نتیجه ثبت شود.

### 4) DR (Disaster Recovery)

#### 4.1 تعریف اهداف

مطابق رویکرد enterprise، برای هر نصب باید اهداف زیر تعریف و تصویب شود:
- **RPO** (حداکثر از دست رفتن داده مجاز)
- **RTO** (حداکثر زمان قابل قبول برای بازگشت سرویس)

Template پیشنهادی (برای پرکردن توسط تیم عملیات):
- RPO هدف: ____
- RTO هدف: ____

#### 4.2 سناریوی بازیابی (حداقل)

- تشخیص حادثه و اعلام رخداد (Incident) با حداقل فیلدها (زمان/سیستم‌های متاثر/correlationId نمونه/علت ریشه‌ای/اقدام اصلاحی).
- Provision زیرساخت DB جدید (یا failover به replica در صورت وجود).
- Restore آخرین backup معتبر.
- اجرای verify (اسکریپت بالا).
- بالا آوردن سرویس‌ها (بعد از اطمینان از آماده بودن DB و Kafka).

