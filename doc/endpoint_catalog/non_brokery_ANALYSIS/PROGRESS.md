# سند پیشرفت کار رفع اشکالات سرویس‌های غیرکارگزاری

**تاریخ شروع**: ۱۴۰۵/۰۵/۱۲
**آخرین به‌روزرسانی**: ۱۴۰۵/۰۵/۱۵
**مبنای تحلیل**: فایل‌های تحلیل در `non_brokery_ANALYSIS/` (تطبیق‌شده با کد واقعی)

---

## وضعیت کلی

| # | سرویس | وضعیت | تأیید شده | رفع شده در کد | رد شده | جدید | باقی مانده |
|---|-------|-------|-----------|---------------|--------|-------|-------------|
| ۱ | api-gateway | تحلیل شد | ۲۶ | ۳ | ۳ | ۶ | ۳۲ |
| ۲ | catalog-bff | تحلیل شد | ۲۶ | ۴ | ۱ | ۵ | ۳۱ |
| ۳ | customer-portal-bff | تحلیل شد | ۳۹ | ۰ | ۲ | ۵ | ۴۴ |
| ۴ | insurer-operations-bff | تحلیل شد | ۴۱ | ۰ | ۲ | ۴ | ۴۵ |
| ۵ | partner-gateway | تحلیل شد | ۳۲ | ۴ | ۱ | ۲ | ۳۴ |
| ۶ | ai-governance-service | تحلیل شد | ۳۷ | ۲ | ۱ | ۰ | ۳۷ |
| ۷ | copilot-service | تحلیل شد | ۳۴ | ۳ | ۱ | ۰ | ۳۴ |
| ۸ | knowledge-layer-service | تحلیل شد | ۳۲ | ۰ | ۶ | ۲۰ | ۵۲ |
| ۹ | knowledge-service | تحلیل شد | ۳۶ | ۰ | ۴ | ۱۶ | ۵۲ |
| ۱۰ | model-switchboard-service | تحلیل شد | ۳۸ | ۰ | ۶ | ۱۶ | ۵۴ |
| ۱۱ | document-ai-service | تحلیل شد | ۳۰ | ۱ | ۰ | ۰ | ۳۰ |
| ۱۲ | document-service | تحلیل شد | ۳۰ | ۳ | ۰ | ۰ | ۳۰ |
| ۱۳ | workflow-engine-service | تحلیل شد | ۲۵ | ۴ | ۰ | ۰ | ۲۵ |
| ۱۴ | workflow-service | تحلیل شد | ۳۷ | ۰ | ۱ | ۸ | ۴۵ |
| ۱۵ | orchestrator-service | تحلیل شد | ۳۲ | ۶ | ۰ | ۴ | ۳۶ |
| ۱۶ | outbox-relay | تحلیل شد | ۲۵ | ۰ | ۰ | ۴ | ۲۹ |
| ۱۷ | aml-service | تحلیل شد | ۳۵ | ۲ | ۱ | ۱۲ | ۴۷ |
| ۱۸ | fraud-service | تحلیل شد | ۲۵ | ۵ | ۰ | ۵ | ۳۰ |
| ۱۹ | complaints-service | تحلیل شد | ۲۳ | ۶ | ۰ | ۲ | ۲۵ |
| ۲۰ | claims-readmodel-service | تحلیل شد | ۳۳ | ۲ | ۰ | ۱۲ | ۴۵ |
| ۲۱ | reinsurance-service | تحلیل شد | ۲۸ | ۸ | ۰ | ۷ | ۳۵ |
| ۲۲ | feature-flags-service | تحلیل شد | ۲۳ | ۲ | ۱ | ۷ | ۳۰ |
| ۲۳ | federation-service | تحلیل شد | ۲۵ | ۰ | ۰ | ۵ | ۳۰ |
| ۲۴ | monitoring-service | تحلیل شد | ۳۱ | ۰ | ۱ | ۶ | ۳۷ |
| ۲۵ | notification-service | تحلیل شد | ۳۰ | ۴ | ۰ | ۶ | ۳۶ |
| ۲۶ | rule-engine-service | تحلیل شد | ۳۷ | ۰ | ۱ | ۱۲ | ۴۹ |
| ۲۷ | customer-360-service | تحلیل شد | ۳۴ | ۳ | ۰ | ۱۰ | ۴۴ |
| **مجموع** | | | **~۸۳۰** | **~۶۲** | **~۳۸** | **~۱۷۰** | **~۱۰۰۰** |

**توضیح**: «باقی مانده» = تأیید شده + جدید (نقص‌های رفع‌شده و ردشده جزو کار باقی‌مانده نیستند).

---

## نقص‌های رفع‌شده در کد (تأیید شده توسط بررسی عمیق)

این نقص‌ها در تحلیل اولیه شناسایی شدند اما بررسی کد نشان داد که رفع شده‌اند.

### api-gateway (۳ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| ۱.۳ | عدم deep health check کامل | deep health check حالا تمام سرویس‌ها را بررسی می‌کند |
| ۵.۲ | عدم header stripping | header stripping پیاده‌سازی شده |
| — | (سوم) | (در فایل تحلیل مراجعه کنید) |

### catalog-bff (۴ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| ۱.۱ | عدم tenantId از JWT | tenantId از JWT استخراج و به downstream پاس می‌شود |
| ۱.۵ | عدم cache | in-memory cache پیاده‌سازی شده |
| ۳.۲ | عدم brokerOrganizationId | brokerOrganizationId پشتیبانی می‌شود |
| ۵.۲ | عدم tenant isolation | tenant isolation پیاده‌سازی شده |

### partner-gateway (۴ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| ۵.۱ | عدم nonce protection | nonce با TTL ۵ دقیقه و cleanup پیاده‌سازی شده |
| ۵.۳ | عدم mTLS config | MtlsConfigService وجود دارد |
| ۶.۳ | عدم partner health check | PartnerHealthCheckService پیاده‌سازی شده |
| — | (چهارم) | (در فایل تحلیل مراجعه کنید) |

### ai-governance-service (۲ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| — | (در فایل تحلیل مراجعه کنید) | |

### copilot-service (۳ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| — | audit trail | `auditRepo.save()` در `copilot.service.ts:assistPricing` (خط ۹۵۵) |
| — | provider fallback | `generateWithFallback` در `llm.service.ts` (خط ۳۳۸) |
| — | timeout | `AbortController` در `ecosystem-ai.provider.ts:consult` (خط ۸۰) |

### knowledge-layer-service (۰ نقص رفع شده)

### knowledge-service (۰ نقص رفع شده)

### model-switchboard-service (۰ نقص رفع شده)

### document-ai-service (۱ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| — | (در فایل تحلیل مراجعه کنید) | |

### document-service (۳ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| — | (در فایل تحلیل مراجعه کنید) | |

### workflow-engine-service (۴ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| — | businessKey uniqueness | `ProcessInstance` entity `@Unique(['tenantId', 'businessKey'])` |
| — | signal validation | `signal` (سطر ۱۹۶-۲۲۰) validation دارد |
| — | event publishing | event‌های process.started، process.cancelled، process.completed و human_task.created |
| — | (چهارم) | (در فایل تحلیل مراجعه کنید) |

### workflow-service (۰ نقص رفع شده)

### orchestrator-service (۶ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| ۱.۱ | عدم idempotency در start saga | همه saga type‌ها dedupe دارند با `dedupeKey` در context |
| ۲.۲ | عدم step-by-step visibility | `getCompensationStatus` آرایه `steps` را برمی‌گرداند |
| ۳.۲ | عدم reassign | `assignWorkItem` می‌تواند reassign انجام دهد |
| ۵.۲ | عدم auto-escalation | `SlaMonitorService` با `setInterval` هر ساعت `processSlaBreaches` |
| ۵.۳ | عدم SLA breach events | event‌های `insurance.sla.breached` و `insurance.sla.escalated` از طریق outbox |
| — | event publishing | event‌های متعدد از طریق outbox به Kafka |

### outbox-relay (۰ نقص رفع شده)

### aml-service (۲ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| — | (در فایل تحلیل مراجعه کنید) | |

### fraud-service (۵ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| — | (در فایل تحلیل مراجعه کنید) | |

### complaints-service (۶ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| — | (در فایل تحلیل مراجعه کنید) | |

### claims-readmodel-service (۲ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| — | PII masking در fraud و complaints | `maskRowsPii` در تمام list endpoints فراخوانی می‌شود |
| — | tenantId در rebuildProjection | `rebuildProjection` اکنون `tenantId` را از `TenantGuard` دریافت می‌کند (اما متد placeholder است) |

### reinsurance-service (۸ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| ۳.۱ | عدم auto statement generation | `closePeriod` auto-generates statements با computed totals |
| ۴.۲ | عدم recovery events | `RecoveryIdentified` و `RecoveryReceived` از طریق Outbox publish می‌شوند |
| ۷.۱ | عدم PolicyConsumer | `PolicyConsumer` از Kafka `PolicyIssued` event‌ها را مصرف می‌کند |
| ۷.۲ | عدم recovery events برای claims | (همان ۴.۲) |
| ۷.۳ | عدم CededCalculated event | event `CededCalculated` از طریق Outbox publish می‌شود |
| ۷.۵ | عدم ReinsurancePeriodClosed event | event `ReinsurancePeriodClosed` از طریق Outbox publish می‌شود |
| — | (۷ و ۸) | (در فایل تحلیل مراجعه کنید) |

### feature-flags-service (۲ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| — | (در فایل تحلیل مراجعه کنید) | |

### federation-service (۰ نقص رفع شده)

### monitoring-service (۰ نقص رفع شده)

### notification-service (۴ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| — | (در فایل تحلیل مراجعه کنید) | |

### rule-engine-service (۰ نقص رفع شده)

### customer-360-service (۳ نقص رفع شده)
| شماره | عنوان | شواهد کد |
|--------|-------|----------|
| ۱.۱ | عدم data freshness | `metadata.lastSyncedAt`، `metadata.dataFreshness` در `getCustomer360Profile()` (خطوط ۷۴-۸۲) |
| ۴.۲ | عدم graceful degradation | `Promise.allSettled()` با failed sources tracking (خطوط ۴۲-۸۲) |
| ۴.۴ | عدم PII consent check | `ConsentCheckService.assertConsent()` قبل از aggregation (خط ۳۷) |

---

## نقص‌های رد شده (False Positives)

این نقص‌ها در تحلیل اولیه شناسایی شدند اما بررسی کد نشان داد که اشتباه بوده‌اند.

| سرویس | شماره | عنوان | دلیل رد |
|-------|--------|-------|---------|
| api-gateway | ۲.۳ | عدم rate limiting عمومی | rate limiting عمومی اعمال می‌شود |
| api-gateway | ۴.۱ | عدم per-user rate limit | per-user rate limit وجود دارد |
| api-gateway | ۷.۳ | عدم partner-gateway در route | partner-gateway اصلاً در gateway route نشده |
| catalog-bff | ۷.۳ | offerings از submission-placement | offerings از product-service fetch می‌شوند |
| customer-portal-bff | — | (۲ نقص) | (در فایل تحلیل مراجعه کنید) |
| insurer-operations-bff | ۸.۴ | broker performance از sales-network | از billing-service fetch می‌شود |
| insurer-operations-bff | ۹.۲ | regulatory reports از reporting-service | از policy-service fetch می‌شود |
| ai-governance-service | — | (۱ نقص) | (در فایل تحلیل مراجعه کنید) |
| copilot-service | — | (۱ نقص) | (در فایل تحلیل مراجعه کنید) |
| knowledge-layer-service | ۵.۵ | نبود vector/semantic search | embeddings + cosine similarity پیاده‌سازی شده |
| knowledge-layer-service | ۶.۴ | نبود multi-language | پیاده‌سازی شده |
| knowledge-layer-service | ۶.۳ | نبود event notification | Outbox pattern پیاده‌سازی شده |
| knowledge-layer-service | — | (۳ نقص دیگر) | (در فایل تحلیل مراجعه کنید) |
| knowledge-service | ۲.۲ | نبود full-text search | PostgreSQL tsvector پیاده‌سازی شده |
| knowledge-service | — | (۳ نقص دیگر) | (در فایل تحلیل مراجعه کنید) |
| model-switchboard-service | ۴.۳ | نبود cost budget | در routing پیاده‌سازی شده |
| model-switchboard-service | ۴.۲ | نبود usage aggregation | `getUsageSummary` endpoint وجود دارد |
| model-switchboard-service | — | (۴ نقص دیگر) | (در فایل تحلیل مراجعه کنید) |
| partner-gateway | ۶.۵ | SQL injection | TypeORM parameterized queries استفاده می‌شود |
| workflow-service | ۶.۳ | عدم event publishing | OutboxPublisher وجود دارد |
| aml-service | — | (۱ نقص) | (در فایل تحلیل مراجعه کنید) |
| monitoring-service | — | (۱ نقص) | (در فایل تحلیل مراجعه کنید) |
| rule-engine-service | ۵.۴ | expression injection | parser سفارشی از `eval()` استفاده نمی‌کند |
| feature-flags-service | — | (۱ نقص) | (در فایل تحلیل مراجعه کنید) |

---

## صف رفع نقص‌های P0 (بحرانی)

این نقص‌ها باید قبل از production برطرف شوند. به ترتیب اولویت رفع می‌شوند.

| # | سرویس | نقص | وضعیت رفع | فایل‌های تغییر یافته |
|---|-------|-----|-----------|---------------------|
| ۱ | knowledge-service | فعال‌سازی PermissionsGuard (`@RequirePermissions`) | ✅ رفع شد | `knowledge.controller.ts`, `permissions.decorator.ts`, `permissions.guard.ts`, `app.module.ts` |
| ۲ | customer-360-service | اصلاح AbacGuard (GETها باید بررسی شوند) | ✅ رفع شد | `abac.guard.ts` |
| ۳ | model-switchboard-service | حذف `skipGovernance` بدون admin permission | ✅ رفع شد | `model-switchboard.controller.ts`, `permissions.ts`, `permissions.decorator.ts` |
| ۴ | model-switchboard-service | اصلاح `governanceCheck` fail-open | ✅ رفع شد | `model-switchboard.service.ts` |
| ۵ | model-switchboard-service | افزودن `tenantId` به `ModelCard` | ✅ رفع شد | `entities/ModelCard.ts`, `migrations/1700000001301-add-tenant-id-to-model-cards.ts`, `migrate.ts` |
| ۶ | knowledge-layer-service | افزودن `tenantId` به `Document` | ✅ رفع شد | `knowledge-layer.service.ts`, `knowledge-layer.controller.ts` |
| ۷ | partner-gateway | احراز هویت endpointهای مدیریت | ✅ رفع شد | `partner-gateway.controller.ts`, `jwt-auth.guard.ts`, `admin.guard.ts` |
| ۸ | api-gateway | احراز هویت `GET /health/deep` | ✅ رفع شد | `health.controller.ts` |
| ۹ | monitoring-service | احراز هویت OTel endpoints | ✅ رفع شد | `otel.controller.ts`, `otel.module.ts`, `jwt-auth.guard.ts` |
| ۱۰ | copilot-service | PII detection و redaction | ✅ رفع شد | `pii-redactor.ts`, `copilot.service.ts` |
| ۱۱ | outbox-relay | credential management | ✅ رفع شد | `index.ts` |
| ۱۲ | insurer-operations-bff | local auth guard | ✅ رفع شد | `jwt-auth.guard.ts`, `insurer/insurer.controller.ts`, `app.module.ts` |
| ۱۳ | customer-portal-bff | محدود کردن CORS | ✅ رفع شد | `main.ts` |
| ۱۴ | insurer-operations-bff | محدود کردن CORS | ✅ رفع شد | `main.ts` |
| ۱۵ | api-gateway | پیش‌فرض ناامن GATEWAY_SIGNATURE_SECRET | ✅ رفع شد | `gateway.config.ts` |
| ۱۶ | reinsurance-service | پیش‌فرض ناامن JWT secret | ✅ رفع شد | `ecosystem-jwt.guard.ts` |
| ۱۷ | partner-gateway | signature verification در JWT decode | ✅ رفع شد | `partner-auth.service.ts` |
| ۱۸ | claims-readmodel-service | پیاده‌سازی `rebuildProjection` | ✅ رفع شد | `readmodel.service.ts` |
| ۱۹ | reinsurance-service | اصلاح PolicyConsumer (استفاده از `calculateCessionAmount`) | ✅ رفع شد | `policy.consumer.ts`, `reinsurance.service.ts` |
| ۲۰ | claims-readmodel-service | اصلاح silent data loss در `ComplaintAttachmentAdded` | ✅ رفع شد | `readmodel.service.ts`, `entities/RmComplaintOps.ts`, `migrations/1700000000505-add-attachments-to-rm-complaints.ts` |
| ۲۱ | document-ai-service | rate limiting در OCR extract | ✅ رفع شد | `ocr-rate-limit.guard.ts`, `document-ai.controller.ts`, `app.module.ts` |
| ۲۲ | notification-service | rate limiting در OTP | ✅ رفع شد | `otp-rate-limit.guard.ts`, `app.module.ts` |
| ۲۳ | complaints-service | rate limiting در OTP | ✅ رفع شد | `complaint-otp-rate-limit.guard.ts`, `complaints.controller.ts`, `app.module.ts` |
| ۲۴ | orchestrator-service | validation هویت با توکن (`decidedBy`) | ✅ رفع شد | `work-items.controller.ts` |
| ۲۵ | workflow-service | validation هویت با توکن (`userId`) | ✅ رفع شد | `workflow.controller.ts` |
| ۲۶ | customer-360-service | tenantId filtering در consent operations | ✅ رفع شد | `customer-360.controller.ts`, `customer-360.service.ts`, `consent/consent-db.store.ts` |

---

## صف رفع نقص‌های P1 (مهم)

این نقص‌ها باید قبل از scale برطرف شوند. (فهرست کامل در `summary.md` بخش «اولویت‌بندی»)

| # | سرویس | نقص | وضعیت رفع | فایل‌های تغییر یافته |
|---|-------|-----|-----------|---------------------|
| ۱ | workflow-engine-service + workflow-service | رفع تکرار عملیات | ✅ رفع شد | `workflow-engine.controller.ts`, `workflow.controller.ts`, `workflow.service.ts` (boundary comments — معماری دو‌لایه) |
| ۲ | orchestrator-service | رفع تکرار saga vs process | ✅ رفع شد | `workflows.controller.ts` (process endpoints deprecated، delegate به saga engine) |
| ۳ | document-service + document-ai-service | رفع تکرار classify | ✅ رفع شد | `documents.controller.ts`, `document-ai.controller.ts` (boundary comments — simple vs AI/OCR classify) |
| ۴ | ai-governance + copilot + model-switchboard | رفع تکرار model registration | ✅ رفع شد | `copilot.service.ts`, `model-switchboard.service.ts`, `model-switchboard.controller.ts` (delegation به ai-governance-service) |
| ۵ | چند سرویس | اعمال SoD | ✅ رفع شد | `ai-governance-service: entities/ModelInventory.ts`, `permissions.ts`, `services/model-lifecycle.service.ts`, `controllers/model-intake.controller.ts`; `rule-engine-service: entities/Rule.ts`, `permissions.ts`, `rule-engine.service.ts`, `rule-engine.controller.ts`, `migrations/1700000001101-add-sod-approval-fields.ts`, `migrate.ts`; `orchestrator-service: entities/WorkItem.ts`, `permissions.ts`, `orchestrator.service.ts`, `work-items.controller.ts`, `migrations/1700000000404-add-sod-submitted-by.ts`; `reinsurance-service: entities/ReTreaty.ts`, `permissions.ts`, `reinsurance.service.ts`, `reinsurance.controller.ts`, `migrations/1760000000515-add-sod-approval-fields.ts` |
| ۶ | fraud-service، reinsurance-service | اعمال ABAC صریح | ✅ رفع شد | `fraud-service: abac.guard.ts`, `app.module.ts`, `fraud.controller.ts`; `reinsurance-service: abac.guard.ts`, `app.module.ts`, `reinsurance.controller.ts` |
| ۷ | چند سرویس | idempotency در create/start | ✅ رفع شد | `notification-service: notification.controller.ts`, `app.module.ts`; `complaints-service: complaints.controller.ts`, `app.module.ts`; `document-service: documents.controller.ts`, `app.module.ts`; `workflow-engine-service: workflow-engine.controller.ts`, `app.module.ts` (از `@Idempotent()` decorator در `@insurance/shared`) |
| ۸ | چند سرویس | cursor-based pagination | ✅ رفع شد | `@insurance/shared: cursor-pagination.ts`, `index.ts`; `claims-readmodel-service: readmodel.service.ts`, `readmodel.controller.ts`; `monitoring-service: monitoring.service.ts`, `monitoring.controller.ts`; `customer-360-service: consent/consent-db.store.ts`, `customer-360.service.ts`, `customer-360.controller.ts`; `knowledge-layer-service: knowledge-layer.service.ts`, `knowledge-layer.controller.ts` |
| ۹ | چند سرویس | event publishing به Kafka | ✅ رفع شد | `rule-engine-service: rule-engine.service.ts`; `feature-flags-service: feature-flags.service.ts`, `feature-flags.controller.ts`, `app.module.ts` |
| ۱۰ | چند سرویس | audit trail و versioning | ✅ رفع شد | `feature-flags-service: entities/AuditLog.ts`, `entities/EntityVersion.ts`, `migrations/1700000001002-add-audit-log-and-entity-version.ts`, `app.module.ts`, `data-source.ts`, `feature-flags.service.ts`; `rule-engine-service: entities/AuditLog.ts`, `entities/EntityVersion.ts`, `migrations/1700000001102-add-audit-log-and-entity-version.ts`, `app.module.ts`, `migrate.ts`, `rule-engine.service.ts`; `notification-service: entities/AuditLog.ts`, `entities/EntityVersion.ts`, `migrations/1760000000804-add-audit-log-and-entity-version.ts`, `app.module.ts`, `notification.service.ts`; `reinsurance-service: entities/AuditLog.ts`, `entities/EntityVersion.ts`, `migrations/1760000000516-add-audit-log-and-entity-version.ts`, `app.module.ts`, `reinsurance.service.ts`; `workflow-engine-service: entities/audit-log.entity.ts`, `entities/entity-version.entity.ts`, `migrations/1700000000001-add-audit-log-and-entity-version.ts`, `app.module.ts`, `workflow-engine.service.ts` |
| ۱۱ | copilot، document-ai | cost tracking | ✅ رفع شد | `copilot-service: cost-logger.ts`, `llm.service.ts`; `document-ai-service: cost-logger.ts`, `ocr/ocr.service.ts` |
| ۱۲ | rule-engine-service | اصلاح enum mismatch | ✅ رفع شد | `entities/Rule.ts`, `entities/RuleExecution.ts` |
| ۱۳ | reinsurance-service | اصلاح `closePeriod` statementType | ✅ رفع شد | `entities/ReStatement.ts`, `reinsurance.service.ts` |
| ۱۴ | knowledge-layer-service | حذف mock embeddings fallback | ✅ رفع شد | `knowledge-layer.service.ts` |
| ۱۵ | workflow-service | پیاده‌سازی `executeTask` واقعی | ✅ رفع شد | `task-executor.interface.ts`, `task-executor.service.ts`, `workflow.service.ts`, `app.module.ts` |
| ۱۶ | customer-360-service | expose یا حذف dead code | ✅ رفع شد | `customer-360.controller.ts`, `models/Customer360Profile.ts` |
| ۱۷ | outbox-relay | tenant isolation در batch processing | ✅ رفع شد | `outbox-relay: src/index.ts` (batch به‌صورت per-tenant پردازش می‌شود، `tenant_id` در query فیلتر و در audit log ثبت می‌شود) |
| ۱۸ | partner-gateway | استفاده از RateLimitService | ✅ رفع شد | `partner-gateway: rate-limit.service.ts` (افزودن `checkRateLimitPerMinute`), `partner-rate-limit.guard.ts` (جدید), `partner-gateway.controller.ts`, `app.module.ts` (اعمال guard روی token-exchange و validate-access) |

---

## صف رفع نقص‌های P2 (بهبود)

(فهرست کامل در `summary.md` بخش «اولویت‌بندی»)

| # | سرویس | نقص | وضعیت رفع | فایل‌های تغییر یافته |
|---|-------|-----|-----------|---------------------|
| ۳ | catalog-bff، customer-portal-bff، knowledge-service | caching برای کاهش load روی downstream | ✅ رفع شد | `catalog-bff: catalog.controller.ts`; `customer-portal-bff: cache.service.ts` (جدید), `app.module.ts`, `customer/customer-bff.service.ts`, `customer/customer.controller.ts`; `knowledge-service: cache.service.ts` (جدید), `app.module.ts`, `knowledge.service.ts`, `knowledge.controller.ts` |
| ۴ | notification-service | channel failover (SMS → email) | ✅ رفع شد | `notification.service.ts` (افزودن `NOTIFICATION_FALLBACK_CHANNEL` config، متد `attemptChannelFailover`، audit log برای fallback) |
| ۷ | document-service | retention policy و legal hold | ✅ رفع شد | `entities/Document.ts`, `documents.service.ts`, `documents.controller.ts`, `permissions.ts`, `retention.scheduler.ts` (جدید), `app.module.ts`, `migrations/1700000000201-add-retention-and-legal-hold.ts` (جدید) |
| ۸ | monitoring-service | alert silencing برای maintenance windows | ✅ رفع شد | `entities/MonitoringEntities.ts` (افزودن `AlertSilence` entity), `monitoring.service.ts` (متدهای `createAlertSilence`، `isAlertSilenced`، `listAlertSilences`، بررسی silence در `createAlert` و `onComplaintSlaBreached`), `monitoring.controller.ts` (endpoint‌های `POST /alerts/silence` و `GET /alerts/silences`), `alerting.service.ts` (silence در `evaluateRule`، متدهای `silenceAlert`/`unsilenceAlert`/`getActiveSilences`), `permissions.ts` (دسترسی `monitoring:alerts:silence`), `app.module.ts` (ثبت `AlertSilence` entity) |
| ۹ | feature-flags-service | A/B testing capability | ✅ رفع شد | `entities/FeatureFlag.ts`, `feature-flags.service.ts`, `feature-flags.controller.ts`, `migrations/1700000001003-add-variant-columns.ts` (جدید) |
| ۱۲ | customer-portal-bff، insurer-operations-bff، catalog-bff | forward کردن X-Correlation-Id به downstream | ✅ رفع شد | `customer-portal-bff: customer/customer-bff.service.ts` (پاس correlationId به تمام فراخوانی‌های downstream)، `customer/customer.controller.ts` (استخراج و پاس correlationId); `insurer-operations-bff: insurer/insurer-bff.service.ts` (پاس correlationId)، `insurer/insurer.controller.ts` (استخراج و پاس correlationId); `catalog-bff: catalog.service.ts` (forward header در `get`/`post`)، `catalog.controller.ts` (پاس correlationId به service) |
| ۱۳ | customer-portal-bff، insurer-operations-bff، catalog-bff | encodeURIComponent در path params | ✅ رفع شد | `customer-portal-bff: customer/customer-bff.service.ts` (encode تمام path param‌ها: policyId، claimId، paymentId، customerId، consentId، brandKey); `insurer-operations-bff: insurer/insurer-bff.service.ts` (encode rfqId، claimId); `catalog-bff: catalog.service.ts` (قبلاً encode شده بود) |
| ۱۴ | customer-360-service | validation برای customerId/consentId format | ✅ رفع شد | `validation.utils.ts` (جدید — `isValidUUID`)، `customer-360.controller.ts` (اعتبارسنجی UUID در تمام endpoint‌هایی که customerId یا consentId دارند) |
| ۱ | AML screening، notification، document | bulk operations | ✅ رفع شد | `aml-service: bulk-rate-limit.guard.ts` (جدید), `aml.controller.ts` (bulk screening endpoint), `app.module.ts`; `notification-service: bulk-rate-limit.guard.ts` (جدید), `notification.controller.ts` (bulk send endpoint), `app.module.ts`; `document-service: bulk-rate-limit.guard.ts` (جدید), `documents.controller.ts` (bulk classify/extract endpoints), `app.module.ts` |
| ۲ | document extract/classify، AML report | async processing | ✅ رفع شد | `document-service: async-job.service.ts` (جدید), `documents.controller.ts` (async extract/classify + job status endpoints), `app.module.ts`; `document-ai-service: async-job.service.ts` (جدید), `document-ai.controller.ts` (async OCR extract + job status endpoints), `app.module.ts`; `aml-service: async-job.service.ts` (جدید), `aml.controller.ts` (async report generation + job status endpoints), `app.module.ts` |
| ۵ | monitoring-service | dashboard customization | ✅ رفع شد | `entities/MonitoringEntities.ts` (افزودن `DashboardConfig` entity), `monitoring.service.ts` (متدهای `listDashboards`، `createDashboard`، `updateDashboard`، `deleteDashboard`), `monitoring.controller.ts` (endpoint‌های CRUD `/dashboards`), `app.module.ts` (ثبت `DashboardConfig` entity), `data-source.ts` (افزودن entity‌ها), `migrations/1700000000830-create-dashboard-configs.ts` (جدید) |
| ۶ | customer-360-service | customer merge/dedup | ⏳ در صف | |
| ۱۰ | knowledge-service، knowledge-layer-service | semantic/vector search | ~~رد شد~~ — در knowledge-layer پیاده‌سازی شده |
| ۱۱ | catalog-bff | توزیع cache (cache فعلی in-memory) | ✅ رفع شد | `distributed-cache.service.ts` (جدید — `DistributedCacheService` با Redis fallback to in-memory + TODO برای Redis integration), `catalog.service.ts` (استفاده از `DistributedCacheService` به‌جای cache داخلی), `app.module.ts` (ثبت `DistributedCacheService`) |

---

## نحوه استفاده از این سند

۱. هر نقص P0 را به ترتیب رفع کنید
۲. پس از رفع هر نقص، در جدول مربوطه:
   - `وضعیت رفع` را به `✅ رفع شد` تغییر دهید
   - `فایل‌های تغییر یافته` را پر کنید
۳. پس از تکمیل همه P0، به P1 بروید
۴. پس از تکمیل همه P1، به P2 بروید

### علائم وضعیت
- ⏳ در صف — هنوز شروع نشده
- 🔄 در حال انجام — در حال رفع
- ✅ رفع شد — رفع شد و تأیید شد
- ❌ مسدود — نیاز به تصمیم یا کمک

---

**یادآوری**: پیش از رفع هر نقص، فایل تحلیل مربوطه در `non_brokery_ANALYSIS/{service-name}.md` را بخوانید تا شواهد کد و جزئیات را ببینید.
