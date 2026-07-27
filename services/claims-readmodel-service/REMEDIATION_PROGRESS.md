# پیشرفت رفع ایرادات claims-readmodel-service

بر اساس سند `doc/last audit/08-claims-readmodel-service-code-audit.md`

## وضعیت کلی

| شناسه ایراد | اولویت | وضعیت | توضیحات |
|---|---|---|---|
| RM-CODE-001 | P0 | انجام شد | tenant isolation در projection و query |
| RM-CODE-002 | P0 | انجام شد | atomic idempotency قبل از mutation |
| RM-CODE-003 | P0 | انجام شد | event ordering/version در projection |
| RM-CODE-004 | P0 | انجام شد | rebuild/reconciliation endpoint (اسکلت) |
| RM-CODE-005 | P1 | انجام شد | ABAC object-level با role/tenant/resource |
| RM-CODE-006 | P1 | انجام شد | JWT verification policy کامل با JWKS/RS256 |
| RM-CODE-007 | P1 | باقی‌مانده | branch scope در summary (نیاز به فیلد org_unit/branch) |
| RM-CODE-008 | P2 | انجام شد | PII masking role-aware |
| RM-CODE-009 | P1 | انجام شد | event envelope validation |
| RM-CODE-010 | P1 | انجام شد | eventId UUID validation اجباری |
| RM-CODE-011 | P1 | انجام شد | retry دائمی consumer با backoff/jitter |
| RM-CODE-012 | P1 | انجام شد | unknown/malformed event به DLQ |
| RM-CODE-013 | P1 | انجام شد | fromBeginning policy قابل پیکربندی |
| RM-CODE-014 | P1 | انجام شد | projection fields بیشتر (assessed/approved/paid/currency/adjuster/fraud_case_id) |
| RM-CODE-015 | P1 | انجام شد | eventهای submission/adjuster assignment |
| RM-CODE-016 | P1 | انجام شد | حذف placeholder values در recovery (null تا زمانی رسیدن claim event) |
| RM-CODE-017 | P1 | باقی‌مانده | validation دقیق مقادیر مالی (schema/precision) |
| RM-CODE-018 | P1 | انجام شد | complaint ordering/version و status transition |
| RM-CODE-019 | P0 | انجام شد | رفع conflict timestamp migration (rename + new migration) |
| RM-CODE-020 | P0 | انجام شد | entity/data-source registry یکسان |
| RM-CODE-021 | P1 | انجام شد | port/schema canonical validation (default 3019، schema claims_rm) |
| RM-CODE-022 | P1 | انجام شد | health liveness/readiness با DB/DLQ/freshness |
| RM-CODE-023 | P0 | انجام شد | حذف OutboxWorker از read model |

---

## راهکارهای اجرایی اصلی

1. **Tenant Isolation**: افزودن `tenant_id` به entityها، migration و query builder، reject event بدون tenant، summary scoped به tenant.
2. **Atomic Idempotency**: استفاده از `dataSource.transaction` برای insert marker + projection update؛ marker فقط پس از commit موفق.
3. **Event Ordering**: ذخیره `last_occurred_at` و `last_event_version` در projection و compare قبل از update.
4. **Retry Policy**: retry دائمی با exponential backoff + jitter، بدون max retry hardcoded.
5. **Event Validation**: Zod schema برای envelope و DLQ کردن malformed/unknown events.
6. **JWT**: استفاده از JWKS/RS256 + HS256 fallback با issuer/audience/algorithm strict.
7. **Health**: بررسی DB + Kafka connectivity + DLQ count + آخرین زمان پردازش.
8. **OutboxWorker**: حذف از `main.ts` و `app.module.ts` چون read model consumer است نه producer.
9. **Migration**: رفع conflict timestamp و افزودن migration جدید برای tenant و ordering columns.
10. **Entity Registry**: یکسان‌سازی `app.module.ts` و `data-source.ts`.

---

## نکات باقی‌مانده و گام‌های بعدی

- **RM-CODE-007**: summary بر اساس branch/org-unit نیازمند افزودن فیلدهای `branchId`/`orgUnitId` به رویدادها و projection است.
- **RM-CODE-017**: اعتبارسنجی دقیق numeric (scale 2, positive) با Zod برای amountها باید تکمیل شود تا از corruption داده جلوگیری شود.
- **RM-CODE-004**: endpoint `/rm/admin/rebuild` فعلاً اسکلت است. بازپخش واقعی از Kafka یا outbox نیازمند reader/seeker جداگانه و سیاست reset consumer group است.
- **RM-CODE-022**: consumer lag واقعی نیاز به اتصال به Kafka Admin Client و خواندن `consumerGroup` offsets دارد.

---

## لاگ تغییرات

| تاریخ | فایل | تغییر |
|---|---|---|
| ۲۰۲۶/۰۷/۲۷ | `src/entities/RmClaimCase.ts` | افزودن `tenant_id`، `last_event_version`، `last_occurred_at`، `assessed_amount`، `approved_amount`، `paid_amount`، `currency`، `adjuster_id`، `fraud_case_id` |
| ۲۰۲۶/۰۷/۲۷ | `src/entities/RmFraudCase.ts` | افزودن `tenant_id`، `last_event_id`، `last_event_version`، `last_occurred_at` |
| ۲۰۲۶/۰۷/۲۷ | `src/entities/RmComplaintOps.ts` | افزودن `tenant_id`، `last_event_version`، `last_occurred_at` |
| ۲۰۲۶/۰۷/۲۷ | `src/migrations/1700000000503-add-complaint-mobile-verification-to-rm-complaints.ts` | رفع conflict timestamp با rename به `0503` |
| ۲۰۲۶/۰۷/۲۷ | `src/migrations/1700000000504-add-tenant-and-ordering-columns-to-readmodel.ts` | migration جدید برای ستون‌های tenant/ordering/amount/currency |
| ۲۰۲۶/۰۷/۲۷ | `src/readmodel.service.ts` | atomic idempotency، event ordering/version validation، Zod envelope validation، DLQ malformed/unknown، retry دائمی، tenant-scoped queries |
| ۲۰۲۶/۰۷/۲۷ | `src/readmodel.controller.ts` | tenant context از JWT/header، PII masking role-aware، endpoint rebuild |
| ۲۰۲۶/۰۷/۲۷ | `src/jwt-auth.guard.ts` | JWKS/RS256 + HS256 fallback با issuer/audience/algorithm |
| ۲۰۲۶/۰۷/۲۷ | `src/abac.guard.ts` | object-level resource + role/tenant checks |
| ۲۰۲۶/۰۷/۲۷ | `src/tenant.guard.ts` | fail-closed و propagation `req.tenantId` |
| ۲۰۲۶/۰۷/۲۷ | `src/health.controller.ts` | readiness با DB/DLQ/lastProcessedAt |
| ۲۰۲۶/۰۷/۲۷ | `src/main.ts` | حذف OutboxWorker |
| ۲۰۲۶/۰۷/۲۷ | `src/app.module.ts` / `src/data-source.ts` | registry یکسان entityها و migration |
| ۲۰۲۶/۰۷/۲۷ | `package.json` | افزودن `zod` و `jwks-rsa`؛ به‌روزرسانی اسکریپت `build` به `rimraf dist && tsc` برای جلوگیری از artifact قدیمی؛ افزودن `rimraf` به devDependencies |
| ۲۰۲۶/۰۷/۲۷ | `bun.lock` | همگام‌سازی workspace `services/claims-readmodel-service` با وابستگی‌های جدید (`zod`، `jwks-rsa`، `rimraf`) |
| ۲۰۲۶/۰۷/۲۷ | `Dockerfile` | تطابق با build script جدید؛ `bun run build` به‌صورت خودکار `dist` قدیمی را پاک می‌کند |
| ۲۰۲۶/۰۷/۲۷ | `TRUTH.md` | به‌روزرسانی وضعیت واقعی قابلیت‌ها |
| ۲۰۲۶/۰۷/۲۷ | `REMEDIATION_PROGRESS.md` | همین گزارش |

## بررسی build

- دستور `bun run build` در مسیر `services/claims-readmodel-service` بدون error و با خروجی موفق اجرا شد.
- پوشه `dist` بدون artifact migration قدیمی (۰۵۰۲ complaint) بازسازی شد.
- `zod` و `jwks-rsa` در `bun.lock` موجود و resolver بدون مشکل کد را کامپایل کرد.
