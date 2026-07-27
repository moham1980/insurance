# گزارش ممیزی کد `claims-readmodel-service`

**تاریخ بررسی:** ۲۰۲۶/۰۷/۲۶
**دامنه:** تمام فایل‌های `src/` شامل query controller، projection service، Kafka consumer، entityها، guardها، migrationها، data source، health، `main.ts`، `package.json`، `Dockerfile` و `TRUTH.md`
**نقش هدف:** ساخت projectionهای claims/fraud/complaints/reinsurance و ارائه API خواندنی برای داشبورد و عملیات
**وضعیت واقعی:** **Projection و query در کد وجود دارد، اما consistency، tenant isolation، replay safety و operational readiness ناقص است**

## ۱. خلاصه اجرای واقعی

سرویس سه projection اصلی `rm_claims_cases`, `rm_fraud_cases` و `rm_complaints` را نگهداری می‌کند و رخدادهای claim، fraud، complaint و reinsurance را از Kafka می‌خواند. APIهای خواندنی با JWT، permission، ABAC و tenant guard محافظت شده‌اند.

اما `TRUTH.md` ادعای «idempotent processing» و «Production-ready» دارد، درحالی‌که idempotency marker قبل از projection save ثبت می‌شود، tenant در هیچ projection/entity وجود ندارد، ترتیب رخدادها با version/occurredAt کنترل نمی‌شود، replay/rebuild endpoint وجود ندارد، consumer پس از پنج retry متوقف می‌شود، و health فقط DB را بررسی می‌کند.

**تست اختصاصی:** فایل `*.spec.ts` یا `*.test.ts` در سرویس پیدا نشد.

---

## ۲. یافته‌های بحرانی P0

### RM-CODE-001 — tenant در projection و query API وجود ندارد

**شاهد:** entityهای `RmClaimCase`, `RmFraudCase` و `RmComplaintOps` هیچ `tenantId` ندارند. `ReadModelService.listClaims`, `getClaim`, `getSummary`, `listFraudCases` و `listComplaintsOps` در خطوط 395–447 فقط با claim/policy/status/type query می‌کنند. `TenantGuard` در خطوط 8 و 12 نبود tenant را مجاز می‌کند و مقدار `req.tenantId` را فقط روی request می‌گذارد؛ service آن را مصرف نمی‌کند.

**اثر:** read model یک انباره چنددامنه‌ای بدون scope است؛ user می‌تواند claim، fraud case، complaint و summary tenant دیگر را با شناسه یا query فیلتر بخواند. summary نیز آمار کل tenantها را تجمیع می‌کند.

**اصلاح:** tenant در تمام projectionها و event envelope ذخیره شود؛ API context شامل tenant verified را به service بدهد؛ همه queryها شرط tenant داشته باشند؛ summary نیز tenant-scoped باشد؛ eventهای بدون tenant رد یا به quarantine بروند؛ تست cross-tenant و aggregate leakage.

### RM-CODE-002 — idempotency قبل از projection mutation ثبت می‌شود

**شاهد:** `startConsumer` خطوط 376–380 ابتدا `ensureIdempotent` را اجرا می‌کند؛ `ensureIdempotent` خطوط 74–85 رکورد `ConsumedEvent` را save می‌کند؛ سپس `applyEvent` اجرا می‌شود. خطای projection در خطوط 381–389 فقط DLQ می‌شود.

**اثر:** اگر upsert بعد از ثبت marker fail شود، replay همان event skip می‌شود و read model permanently stale/incomplete می‌ماند. ادعای idempotent بودن به معنی reliable processing نیست.

**اصلاح:** transaction مشترک برای inbox marker و projection mutation؛ marker با status `processing/applied/failed`; marker فقط پس از commit effect؛ unique constraint و handling race؛ replay DLQ/rebuild.

### RM-CODE-003 — projection در برابر eventهای قدیمی محافظت نمی‌شود

**شاهد:** `upsertRmClaimCase` در خطوط 98–112 با هر event، status و fields را update می‌کند و فقط `lastEventId` را ذخیره می‌کند. `occurredAt` و eventVersion برای claim projection مقایسه نمی‌شود. fraud و complaint نیز row را با event جدید update می‌کنند، بدون شرط older/newer.

**اثر:** event دیررس `ClaimRegistered` می‌تواند وضعیت `paid` یا `closed` را به `registered` برگرداند؛ event out-of-order در Kafka/replay projection را rollback می‌کند.

**اصلاح:** ذخیره `lastOccurredAt`, `lastVersion` و source sequence؛ upsert شرطی فقط برای event جدیدتر؛ state transition monotonic؛ event schema با sequence/aggregate version؛ تست out-of-order و duplicate.

### RM-CODE-004 — نبود rebuild/reconciliation باعث دائمی‌شدن drift می‌شود

**شاهد:** در `readmodel.controller.ts` فقط endpointهای list/get/summary/fraud/complaints و health وجود دارد؛ `ReadModelService` هیچ replay، rebuild، checkpoint، lag endpoint یا compare با source ندارد.

**اثر:** پس از DLQ، downtime، migration یا marker-before-failure، read model بدون ابزار بازیابی صحیح باقی می‌ماند.

**اصلاح:** rebuild per aggregate/time range، replay امن از Kafka/Outbox، checkpoint و dry-run، source-vs-projection reconciliation، correction event و عملیات admin audit‌شده.

---

## ۳. یافته‌های P1 در امنیت و authorization

### RM-CODE-005 — ABAC فقط placeholder است

**شاهد:** `abac.guard.ts` خطوط 14–15 تمام GETها را آزاد می‌کند؛ برای non-GET نیز هر roleی کافی است (خطوط 24–26). هیچ resource owner، branch، assigned user، tenant یا policy attribute ارزیابی نمی‌شود.

**اثر:** permission فقط وجود route را محدود می‌کند؛ object-level scope برای claim/fraud/complaint enforce نشده است.

**اصلاح:** resource resolver، policy/action metadata، tenant/branch/assignment constraints و fail-closed برای نبود context؛ تست matrix نقش/منبع.

### RM-CODE-006 — JWT verification policy ناقص است

**شاهد:** `jwt-auth.guard.ts` خط 26 فقط `jwt.verify(token, jwtSecret)` را اجرا می‌کند؛ issuer، audience، allowed algorithm و key rotation بررسی نمی‌شود.

**اثر:** token با claims نامعتبر issuer/audience ممکن است پذیرفته شود و قرارداد verification با auth-service یکسان نیست.

**اصلاح:** shared verification policy با issuer/audience/algorithm/JWKS؛ fail-fast نبود config؛ تست wrong issuer/audience/algorithm/expired/rotation.

### RM-CODE-007 — summary برای نقش‌های شعبه‌ای بدون branch scope است

**شاهد:** role `branch_manager` در permissions به `rm:claims:summary` دسترسی دارد؛ `getSummary` هیچ branch/org/tenant filter نمی‌گیرد.

**اثر:** مدیر شعبه می‌تواند aggregate کل سیستم را ببیند، حتی اگر claim rows در آینده محدود شوند.

**اصلاح:** summary dimensions و query scope بر اساس tenant/org unit، data classification و role-specific aggregation.

### RM-CODE-008 — پاسخ complaint فقط یک فیلد PII را mask می‌کند

**شاهد:** controller خطوط 25–31 فقط `complainantMobile` را mask می‌کند. Projection entity نیز `policyNumber`, `assignedTo`, claim/policy IDs و آینده‌پذیری payload را نگه می‌دارد؛ serializer مرکزی/role-aware وجود ندارد.

**اثر:** کنترل privacy به نام یک فیلد وابسته است و با اضافه‌شدن PII جدید یا nested data می‌شکند.

**اصلاح:** response DTO allow-list، classification، masking per role/purpose، عدم ذخیره plaintext غیرضروری و تست recursive/nested.

---

## ۴. یافته‌های P1 در event processing

### RM-CODE-009 — event envelope validation وجود ندارد

**شاهد:** consumer پس از JSON.parse مستقیماً `envelope.eventId`، `eventType`، `occurredAt` و payload را مصرف می‌کند. `parseOccurredAt` در خطوط 205–208 timestamp نامعتبر را به `new Date()` تبدیل می‌کند.

**اثر:** پیام ناقص یا malformed به projection معتبر تبدیل می‌شود؛ timestamp جعلی/نامعتبر ordering را خراب می‌کند.

**اصلاح:** schema validation اجباری برای eventId UUID، producer/eventType/version/occurredAt/subject/payload؛ پیام invalid به DLQ/quarantine، نه default time.

### RM-CODE-010 — eventId خالی idempotency خطرناک ایجاد می‌کند

**شاهد:** `ensureIdempotent(envelope.eventId, ...)` در خط 377 بدون validate eventId فراخوانی می‌شود؛ eventهای بدون eventId همه می‌توانند روی یک کلید مشترک یا رفتار DB نامعتبر اثر بگذارند.

**اصلاح:** eventId معتبر اجباری؛ fallback به Kafka topic/partition/offset فقط برای quarantine trace، نه business idempotency.

### RM-CODE-011 — consumer بعد از پنج retry برای همیشه متوقف می‌شود

**شاهد:** `maxRetries = 5` و `scheduleRetry` خطوط 49–64 بعد از exhaustion پیام `giving up` می‌دهد.

**اثر:** قطع موقت Kafka یا migration DB می‌تواند consumer را بدون recovery خودکار خاموش کند و freshness projection را از بین ببرد.

**اصلاح:** retry دائمی با backoff/jitter، readiness degraded، metric lag، alert و restart policy.

### RM-CODE-012 — processing یک event نامعتبر را consumed می‌کند

**شاهد:** `applyEvent` برای event ناشناخته فقط warning می‌دهد و return می‌کند (خطوط 200–202)، اما قبل از آن consumed marker ذخیره شده است.

**اثر:** event جدید/اشتباه بدون DLQ یا قابلیت reprocess از بین می‌رود؛ compatibility با event versionهای آینده اثبات نشده است.

**اصلاح:** unknown event به quarantine/DLQ با reason و schema version؛ marker status ignored فقط با policy صریح و audit.

### RM-CODE-013 — دریافت از `fromBeginning: true` بدون سیاست replay و retention است

**شاهد:** برای تمام topicها در خطوط 356–358 `fromBeginning: true` تنظیم شده است.

**اثر:** startup یا consumer group جدید ممکن است کل تاریخ را دوباره پردازش کند؛ با marker ناقص و projection out-of-order، startup طولانی/فشار DB و نتایج متغیر ایجاد می‌شود.

**اصلاح:** replay mode جدا، consumer group/version policy، checkpoint، backpressure، batch transaction و load test.

---

## ۵. یافته‌های P1 در projection correctness

### RM-CODE-014 — state projection برای Claim فقط subset محدود fields را نگه می‌دارد

**شاهد:** `RmClaimCase` فقط claimNumber, policyId, status, lossDate, lossType, requiresHumanTriage، timestamps و RI fields دارد؛ amountهای assessed/approved/paid، policy validation، triage score، adjuster و fraud linkage projection نمی‌شوند.

**اثر:** dashboard و aggregate read model برای تصمیم‌های عملیاتی/مالی ناقص است و با claim source هم‌تراز نیست.

**اصلاح:** projection contract رسمی بر اساس use case؛ amount/currency/adjuster/fraud/policy validation با event version و privacy policy اضافه شود.

### RM-CODE-015 — eventهای ClaimSubmitted و AdjusterAssigned پشتیبانی نمی‌شوند

**شاهد:** switch `applyEvent` فقط ClaimRegistered/Assessed/Approved/Rejected/Paid/Closed را پوشش می‌دهد؛ eventهای `ClaimSubmitted`, `ClaimReferredToAdjuster`, `ClaimAdjusterAssigned` نادیده گرفته می‌شوند.

**اثر:** projection وضعیت submission/assignment را از دست می‌دهد و ادعای real-time sync کامل نیست.

**اصلاح:** event catalog کامل، handlerهای idempotent، transition/order rules و contract tests producer-consumer.

### RM-CODE-016 — Recovery read model با placeholderهای ساختگی ساخته می‌شود

**شاهد:** `upsertRmClaimReinsurance` اگر claim row نباشد `claimNumber: '—'` و policy UUID صفر می‌گذارد (خطوط 125–143).

**اثر:** event reinsurance قبل از claim event می‌تواند row ناقص بسازد و بعد claim event upsert باید آن را کامل کند؛ بدون merge/version تضمین‌شده، داده ساختگی به عملیات نمایش داده می‌شود.

**اصلاح:** pending aggregate state بدون fake business values، merge با event version، invariant برای policy/claim، reconciliation پس از دریافت claim event.

### RM-CODE-017 — مقدارهای مالی در entity و event بدون validation/currency invariant هستند

**شاهد:** recovery amount از payload با `String(...)` ذخیره می‌شود؛ currency فقط string است و positivity، scale، `received <= recoverable` و یکسانی currency بررسی نمی‌شود.

**اصلاح:** Money type، decimal validation، currency enum، source event signature و reconciliation مالی.

### RM-CODE-018 — complaint event هر update را بدون بررسی ترتیب overwrite می‌کند

**شاهد:** `upsertRmComplaint` خطوط 297–316 status، assignedTo، SLA و updatedAt را از payload فعلی می‌نویسد؛ event timestamp/version برای reject کردن update قدیمی استفاده نمی‌شود.

**اثر:** status resolved می‌تواند با event status_changed قدیمی به open برگردد و SLA timeline خراب شود.

**اصلاح:** aggregate version/occurredAt monotonic، immutable event history و projection state transition.

---

## ۶. یافته‌های migration و اجرا

### RM-CODE-019 — دو migration با timestamp یکسان `1700000000502` دارند

**شاهد:** فایل‌های `1700000000502-add-reinsurance-readmodel-columns.ts` و `1700000000502-add-complaint-mobile-verification-to-rm-complaints.ts` هر دو class/name مشابه timestamp دارند.

**اثر:** TypeORM migration ordering/name/ledger می‌تواند ambiguous شود و اجرای migration در محیط‌های مختلف متفاوت باشد.

**اصلاح:** migration name یکتا، ledger migration واقعی، clean DB و upgrade DB آزمون‌شده؛ migrationهای اجراشده را rename نکنید و migration اصلاحی جدید اضافه کنید.

### RM-CODE-020 — `data-source.ts` و `app.module.ts` entity/migration registry یکسان ندارند

**شاهد:** `app.module.ts` `DeadLetterEvent` را ثبت می‌کند؛ `data-source.ts` فقط `ConsumedEvent` و سه projection را ثبت می‌کند. migration فهرست‌شده نیز باید با registry runtime تطبیق داده شود.

**اثر:** CLI migration با runtime schema drift دارد؛ DLQ یا جدول‌های shared ممکن است ایجاد نشده باشند.

**اصلاح:** entity registry مشترک، migration snapshot، تست startup با DB خالی و `migrate:build` واقعی.

### RM-CODE-021 — port و schema contract نیاز به canonical validation دارد

**شاهد:** `main.ts` default port 3002، Dockerfile `EXPOSE 3019` و `app.module/data-source` default schema `claims_rm` دارند؛ gateway/compose باید این اختلاف را تطبیق دهند.

**اثر:** health/proxy ممکن است به port متفاوت وصل شوند؛ schema درست در DB/CLI تضمین نشده است.

**اصلاح:** یک configuration registry برای port/schema، startup fail-fast و container smoke test.

### RM-CODE-022 — health فقط DB را بررسی و خطای داخلی را افشا می‌کند

**شاهد:** `health.controller.ts` فقط `SELECT 1` دارد و خط 23 `err.message` را برمی‌گرداند؛ Kafka consumer lag/status، DLQ، projection freshness و migration version بررسی نمی‌شوند.

**اثر:** سرویس ممکن است با projection قدیمی یا consumer خاموش healthy اعلام شود؛ topology/error داخلی افشا می‌شود.

**اصلاح:** liveness/readiness، Kafka connectivity/consumer status، last event/lag/freshness، DLQ count و error response امن.

### RM-CODE-023 — OutboxWorker در read model مسیر نامرتبط و کنترل‌نشده دارد

**شاهد:** `main.ts` خطوط 10–28 OutboxWorker را برای read model راه‌اندازی می‌کند، درحالی‌که سرویس اساساً consumer projection است و در app module OutboxEvent نیز import شده اما در `data-source.ts` ثبت نشده است.

**اثر:** worker ممکن است روی entity/table ناموجود اجرا شود یا complexity operational بدون producer واقعی ایجاد کند.

**اصلاح:** تصمیم روشن: read model producer است یا نه؛ اگر نیست حذف worker/outbox؛ اگر هست registry/migration/ownership/health و event contract کامل شود.

---

## ۷. نقاط قوت واقعی

- queryها pagination و سقف ۲۰۰ دارند.
- endpointها permissionهای تفکیک‌شده برای claims/fraud/complaints دارند.
- projectionهای fraud، complaint و reinsurance علاوه بر claims پایه وجود دارند.
- DLQ service و consumed-event persistence در طراحی دیده شده‌اند.
- upsert برای aggregate keyهای اصلی از duplicate row جلوگیری می‌کند.
- JWT signature verification با secret اجباری است؛ default secret در guard دیده نشد.

## ۸. برنامه اصلاحی

| اولویت | اقدام | معیار اتمام |
|---|---|---|
| P0 | tenant در projection/event/query | summary و همه rows tenant-scoped و cross-tenant test رد شود |
| P0 | atomic inbox + projection | failure/replay event lost نشود |
| P0 | event ordering/version | event قدیمی state جدید را rollback نکند |
| P0 | rebuild/reconciliation | DLQ، downtime و drift قابل بازیابی و اثبات باشد |
| P1 | schema validation و eventId اجباری | malformed/unknown event quarantine شود |
| P1 | ABAC object-level و JWT policy | issuer/aud/tenant/resource scope enforce شود |
| P1 | consumer retry/health/lag | outage بدون restart دستی recover و alert شود |
| P1 | projection contract کامل | claim assignment/amount/fraud/RI fields صحیح و versioned باشند |
| P1 | migration/port/entity registry | clean/upgrade migration و container smoke موفق باشد |
| P2 | PII response/data policy | complaint PII role-aware و retention‌دار باشد |
| P2 | حذف یا تکمیل OutboxWorker | ownership و runtime contract روشن باشد |
| P2 | تست ریشه‌محور | ordering, replay, concurrency, security, freshness و migration؛ بدون skip/تغییر expectation برای پنهان‌کردن خطا |

## ۹. نتیجه نهایی

`claims-readmodel-service` یک projection/query پایه واقعی دارد، اما وضعیت `Production-ready` در `TRUTH.md` قابل تأیید نیست. نقص‌های اصلی عبارت‌اند از **نبود tenant، idempotency غیراتمی، نبود ordering/version، نداشتن rebuild/reconciliation، ABAC placeholder، unknown-event loss، retry محدود، projection ناقص و drift migration/runtime**. تا رفع این موارد، خروجی read model برای گزارش مدیریتی و تصمیم عملیاتی باید «قابل استفاده مشروط و نیازمند کنترل freshness/consistency» تلقی شود.
