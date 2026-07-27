# گزارش ممیزی کد `policy-service`

**تاریخ بررسی:** ۲۰۲۶/۰۷/۲۶
**دامنه:** تمام فایل‌های `src/` شامل controller، service، entity، consumer، guard، middleware، migration، data source، health، archive job، package، Dockerfile و `TRUTH.md`
**نقش هدف:** quote→جمع‌آوری مدارک→underwriting→صدور→کد یکتای سنهاب→فعال، endorsement، cancellation، renewal، inquiry و payment integration
**وضعیت واقعی:** **Lifecycle و quality gate در کد وجود دارد، اما enforcement tenant، payment fail-closed، renewal correctness و consumer atomicity ناقص و پرریسک است**

## ۱. خلاصه وضعیت واقعی

`PolicyService` workflow چندمرحله‌ای و OutboxPublisher دارد؛ برای سنهاب inquiry، quality gate، work item و payment confirmation مسیرهایی ساخته شده‌اند. بااین‌حال بیشتر routeها فقط `JwtAuthGuard` و `PermissionsGuard` دارند و `TenantGuard`/`AbacGuard` عملاً روی controller استفاده نشده‌اند. tenant فقط برای log یا call بیرونی استخراج می‌شود و در query policy وارد نمی‌شود.

در `TRUTH.md` وضعیت Sanhab و lifecycle به‌صورت production-ready ارائه شده، اما کد هنوز fallbackهای خطرناک دارد: issue هنگام قطع payments به `paid` body اعتماد می‌کند، renewal کد یکتای policy قبلی را کپی می‌کند، payment consumer در failure event را consumed ثبت می‌کند، و چند عملیات بدون validation کامل تاریخ/مبلغ/coverage اجرا می‌شوند.

**تست اختصاصی سرویس:** فایل `*.spec.ts` یا `*.test.ts` در سرویس پیدا نشد.

---

## ۲. یافته‌های بحرانی P0

### POLICY-CODE-001 — tenant در Policy و queryهای دامنه وجود ندارد و guardهای tenant/ABAC اعمال نشده‌اند

**شاهد:** entity `Policy` در `src/entities/Policy.ts` هیچ `tenantId` ندارد. controller مسیرهای issue، unique-code، endorse، cancel، renew، get و list عمدتاً در خطوط بررسی‌شده فقط `@UseGuards(JwtAuthGuard, PermissionsGuard)` دارند؛ `TenantGuard` و `AbacGuard` روی آن‌ها استفاده نشده‌اند. `PolicyService.getPolicy` و `listPolicies` نیز در خطوط 1005–1017 فقط با policyId/partyId/uniqueCode query می‌کنند.

**اثر:** کاربر دارای permission می‌تواند policy tenant دیگر را با UUID بخواند، endorse، cancel، renew یا تغییر کد کند. header/claim tenant در اکثر queryها هیچ اثر دسترسی ندارد.

**اصلاح:** tenant به Policy، PolicyChange، Inquiry، Renewal و event اضافه شود؛ تمام command/queryها context verified شامل tenant/actor بگیرند؛ TenantGuard/ABAC واقعی در route و service اعمال شوند؛ RLS یا schema isolation؛ uniqueها tenant-scoped؛ cross-tenant test برای همه مسیرها.

### POLICY-CODE-002 — صدور در outage پرداخت fail-open می‌شود

**شاهد:** `PolicyService.issue` خطوط 623–645 در صورت خطای payments-service مقدار `paymentVerified = params.paid` می‌کند؛ اگر URL تنظیم نشده باشد نیز همین fallback اجرا می‌شود. controller خط 632 body را صرفاً به‌صورت boolean می‌گیرد.

**اثر:** caller دارای permission می‌تواند `paid: true` ارسال کند و در نبود/قطع payments policy را صادر کند. این نقض مستقیم invariant «صدور فقط بعد از پرداخت واقعی» است.

**اصلاح:** payments-service برای production dependency اجباری و fail-closed؛ فقط payment confirmation با payment ID، amount، currency، policyId، tenant و signature معتبر؛ حذف fallback body flag؛ idempotent reconciliation و تست outage/forged paid.

### POLICY-CODE-003 — renewal کد یکتای policy قبلی را کپی می‌کند

**شاهد:** `renew` خطوط 955–977 policy جدید را با `uniqueCode: policy.uniqueCode` می‌سازد؛ entity `Policy` روی `uniqueCode` unique index دارد.

**اثر:** renewal policy دارای کد یکتای تکراری می‌شود و save می‌تواند با unique violation fail کند؛ اگر constraint در محیطی نباشد، دو policy به یک شناسه regulator متصل می‌شوند.

**اصلاح:** کد یکتای جدید فقط پس از registration موفق سنهاب؛ policy renewed تا quality gate/کد جدید active نشود؛ FK/unique و state machine renewal اصلاح شود؛ تست renewal با policy دارای uniqueCode.

### POLICY-CODE-004 — payment consumer بعد از failure رویداد را consumed ثبت می‌کند

**شاهد:** `payment.consumer.ts` پس از catch خطوط 125–147 هم dead-letter می‌نویسد و هم `consumedEventRepo.save` انجام می‌دهد. در اجرای بعدی خط 86–92 existing پیدا می‌شود و event skip می‌شود.

**اثر:** اگر issue به‌علت transient payment/Sanhab/DB failure شکست بخورد، retry عادی دیگر انجام نمی‌شود؛ policy ممکن است پرداخت‌شده ولی صادرنشده باقی بماند.

**اصلاح:** consumed marker فقط در transaction همراه business effect پس از موفقیت؛ وضعیت processing/failed/retry؛ DLQ replay امن؛ unique constraint برای race؛ تست failure و replay.

### POLICY-CODE-005 — eventهای lifecycle فقط در صورت وجود correlationId منتشر می‌شوند

**شاهد:** در quote، submitDocs، riskAssess، underwriting decision و دیگر mutationها شرط `if (params.correlationId)` وجود دارد و publish درون آن است؛ caller می‌تواند correlationId ندهد.

**اثر:** state در DB تغییر می‌کند اما event lifecycle ثبت نمی‌شود و downstreamها از quote/docs/risk/issue/renewal/cancellation مطلع نمی‌شوند.

**اصلاح:** correlationId در middleware/command اجباری و server-generated شود؛ publish event بخشی از transaction و غیرقابل skip باشد؛ event contract test.

---

## ۳. یافته‌های P1 در lifecycle و business invariants

### POLICY-CODE-006 — state transition با lock/version محافظت نشده است

**شاهد:** عملیات issue، setUniqueCode، endorse، cancel و renew در transaction هستند اما `findOne` بدون optimistic version یا pessimistic row lock انجام می‌شود؛ entity `Policy` نیز `@VersionColumn` ندارد.

**اثر:** دو درخواست همزمان می‌توانند هر دو state معتبر قبلی را ببینند و duplicate issuance/endorsement/cancellation/renewal ایجاد کنند.

**اصلاح:** version/row lock و conditional update؛ idempotency key برای commands؛ unique constraint برای active renewal/issue؛ تست concurrent transitions.

### POLICY-CODE-007 — renew بدون payment/underwriting/quality gate policy جدید را active می‌سازد

**شاهد:** `renew` خطوط 950–963 policy قبلی را renewed و policy جدید را مستقیماً `status: 'active'` می‌کند. payment، underwriting، Sanhab inquiry/uniqueCode و approval renewal قبل از ساخت active policy بررسی نمی‌شوند.

**اثر:** policy جدید می‌تواند active ولی فاقد پرداخت، ارزیابی ریسک یا ثبت regulator باشد.

**اصلاح:** renewal باید draft/pending→underwriting/payment→Sanhab→issued/active باشد؛ `approveRenewal` فقط approval record بسازد و completion command با gates اجرا شود.

### POLICY-CODE-008 — endorsement بعضی payloadها را silently نادیده می‌گیرد

**شاهد:** در `endorse` برای `beneficiary_change`, `address_change` و `vehicle_change` شرط `policy.applicationData` وجود دارد. اگر null باشد هیچ updateی انجام نمی‌شود ولی PolicyChange و event ثبت می‌شوند. همچنین premium change خط 771 از `params.payload.newPremiumAmount || policy.premiumAmount` استفاده می‌کند و صفر را نادیده می‌گیرد.

**اثر:** API موفقیت اعلام می‌کند اما endorsement واقعی اعمال نشده؛ snapshot/audit با state واقعی فرق می‌کند.

**اصلاح:** payload schema per endorsement type؛ نبود applicationData به‌صورت object initialize شود یا validation error؛ استفاده از nullish semantics؛ diff بعد از تغییر و تست هر type.

### POLICY-CODE-009 — endorsement تغییرات حساس را بدون underwriting/financial recalculation اعمال می‌کند

**شاهد:** `endorse` مستقیم coverages/premium/beneficiary/address/vehicle را تغییر و PolicyEndorsed منتشر می‌کند؛ call به product pricing، underwriting، payment adjustment یا Sanhab amendment وجود ندارد.

**اثر:** پوشش و premium بیمه‌نامه active می‌تواند بدون محاسبه، approval، دریافت مابه‌التفاوت یا ثبت regulatory تغییر کند.

**اصلاح:** endorsement workflow per type، rating/underwriting re-evaluation، payment delta، quality gate و regulatory amendment؛ maker-checker برای premium/coverage.

### POLICY-CODE-010 — تاریخ‌ها و مبلغ‌ها validation دامنه‌ای کافی ندارند

**شاهد:** quote و convertQuoteToPolicy `new Date(params.startDate/endDate)` و `premiumAmount` را ذخیره می‌کنند؛ controllerها در مسیرهای متعدد فقط وجود field را بررسی می‌کنند. start قبل از end، تاریخ گذشته، premium منفی/NaN، installment consistency و currency کنترل نشده است.

**اثر:** policy با دوره نامعتبر یا premium غلط وارد workflow می‌شود و بعداً claims/payment/renewal را خراب می‌کند.

**اصلاح:** DTO strict، Date validity/timezone، `start < end`، premium Money، currency، installment sum، coverage limits و product-version reference.

### POLICY-CODE-011 — renewal limit و date policy enforce نشده است

**شاهد:** entity `maxRenewals` دارد، اما `renew` قبل از ایجاد policy جدید `renewalCount >= maxRenewals` را بررسی نمی‌کند؛ `newEndDate` نیز فقط parse می‌شود و start/end policy/continuity کنترل نمی‌شود.

**اصلاح:** max renewals، no-overlap، grace period، new premium/payment، product version و effective date با transaction/constraint enforce شود.

### POLICY-CODE-012 — uniqueCode validation و uniqueness regulator ناقص است

**شاهد:** controller فقط string بودن uniqueCode را بررسی می‌کند؛ format/checksum/length/issuer binding و policy ownership کنترل نمی‌شود. entity unique index دارد ولی tenant/regulator namespace ندارد.

**اصلاح:** format validator، lookup/registration confirmation، unique scoped، immutable after set و audit correction workflow.

---

## ۴. یافته‌های P1 در Sanhab و integrations

### POLICY-CODE-013 — regulatory URL fallback به localhost در production

**شاهد:** `getRegulatoryUrl` خطوط 229–233 در نبود env مقدار `http://localhost:18024` برمی‌گرداند.

**اثر:** پیکربندی ناقص ممکن است به سرویس اشتباه/محلی وصل شود یا خطای واقعی Sanhab را پنهان کند؛ fail-fast و credential readiness وجود ندارد.

**اصلاح:** env اجباری production، startup validation، TLS/certificate/credential check، timeout/circuit/retry و عدم fallback به localhost.

### POLICY-CODE-014 — Sanhab inquiry به quality gate ذخیره‌شده وابسته است، اما freshness و identity binding کامل نیست

**شاهد:** `ensureSanhabQualityGate` آخرین inquiry را با `policyId` می‌گیرد و فقط `resultCode === 'OK'` را قبول می‌کند؛ expiry/freshness، request parameters hash، provider response signature و policy version binding در gate دیده نمی‌شود. override نیز با جدیدتر بودن `PolicyChange` نسبت به inquiry قبول می‌شود.

**اثر:** نتیجه قدیمی، query متفاوت یا پاسخ غیرقابل اثبات می‌تواند برای صدور استفاده شود؛ override reason/actor به تنهایی معادل کنترل regulator نیست.

**اصلاح:** inquiry idempotency، query hash، provider correlation/signature، TTL، policy/product version binding و explicit override approval/SoD.

### POLICY-CODE-015 — Sanhab work item failure state را به workflow الزاماً متصل نمی‌کند

**شاهد:** `createSanhabFollowupWorkItem` و بخش follow-up خطاها را log/return null می‌کنند؛ quality gate همچنان فقط error می‌دهد، اما durable retry/outbox برای work item وجود ندارد. در صورت absence authorization نیز work item ساخته نمی‌شود.

**اثر:** پرونده‌های failed/pending Sanhab ممکن است بدون work item عملیاتی باقی بمانند.

**اصلاح:** outbox/task durable، idempotency key policy+reason، retry/DLQ، ownership/SLA و metric stuck quality gates.

### POLICY-CODE-016 — underwriting call داخل transaction و بدون timeout انجام می‌شود

**شاهد:** `riskAssess` پس از save policy در transaction، از خطوط 493 به underwriting `fetch` می‌زند و خطا را فقط log می‌کند؛ timeout، circuit breaker و status contract کامل نیست.

**اثر:** transaction DB طولانی، lock contention و policy در `uw_pending` بدون request durable یا retry می‌ماند.

**اصلاح:** command/outbox برای underwriting request، async state، timeout/circuit، idempotency، callback/event و reconciliation.

### POLICY-CODE-017 — payment status response بدون schema/signature اعتبارسنجی می‌شود

**شاهد:** issue خطوط 630–636 response JSON را می‌خواند و هرکدام از `status === paid`, `confirmed` یا `paid === true` را کافی می‌داند؛ payment ID/amount/currency/tenant/signature بررسی نمی‌شود.

**اصلاح:** contract version، payment reference، amount/currency match، signed confirmation و reconciliation مستقل.

---

## ۵. یافته‌های P1 در authorization و audit

### POLICY-CODE-018 — permissionها object-level scope را تضمین نمی‌کنند

**شاهد:** `PolicyController` برای اکثر عملیات فقط JWT+Permissions دارد و tenant/ABAC guard روی routeها اعمال نشده است. `policy.service.ts` نیز policy را فقط با ID می‌گیرد.

**اثر:** permission `policy:view`, `policy:endorse`, `policy:cancel` به‌صورت global عمل می‌کند.

**اصلاح:** resource authorization در service، tenant/producer org unit، party relation و assigned scope؛ denial audit.

### POLICY-CODE-019 — quality gate override SoD و scope ناقص دارد

**شاهد:** endpoint override فقط permission `policy:quality_gate_override` و reason حداقل سه کاراکتری را می‌گیرد؛ service method actor/tenant context کامل ندارد و در فراخوانی controller tenant ارسال نمی‌شود. منع override توسط creator/issuer یا approval دوم دیده نمی‌شود.

**اثر:** همان actor می‌تواند quality gate regulator را bypass کند و audit آن برای tenant/approval کافی نیست.

**اصلاح:** dual control، role/limit، no-self-override، tenant-scoped policy، immutable change، evidence و alert.

### POLICY-CODE-020 — PolicyChange audit payload بدون tenant/hash/before-after کامل است

**شاهد:** `PolicyChange` فقط policyId/type/actor/payload دارد؛ payload در endorsement previous values محدود است و برای همه تغییرات before/after canonical، tenant، correlation و reason اجباری نیست.

**اثر:** بازسازی تصمیم‌ها و regulatory audit ناقص می‌شود.

**اصلاح:** append-only change log با actor/tenant/correlation/request hash/before-after/version/reason؛ جلوگیری از update/delete و retention policy.

---

## ۶. یافته‌های P1/P2 در consumer، migration و runtime

### POLICY-CODE-021 — PaymentConsumer با eventId fallback ضعیف و schema validation ناکافی کار می‌کند

**شاهد:** خطوط 65–84 JSON را بدون envelope schema validate می‌کنند و eventId را از `event.eventId || event.id || topic-key-partition-offset` می‌سازند.

**اثر:** event بدون ID یا malformed ممکن است با identity ناپایدار پردازش یا consumed شود؛ replay در partition متفاوت رفتار دیگری دارد.

**اصلاح:** eventId UUID و envelope اجباری؛ invalid به DLQ؛ idempotency key پایدار؛ event tenant/policy/payment validation.

### POLICY-CODE-022 — PaymentConsumer retry دائمی و readiness ندارد

**شاهد:** `onModuleInit` فقط connect/subscribe می‌کند؛ reconnect/retry loop، health state، lag و readiness برای Kafka وجود ندارد. خطاهای processing به DLQ و consumed marker می‌روند.

**اصلاح:** consumer lifecycle manager، retry/backoff، readiness degraded، DLQ replay و metrics.

### POLICY-CODE-023 — migration/entity/data-source drift محتمل است

**شاهد:** `app.module.ts` هفت entity شامل PolicyRenewal/ConsumedEvent/DeadLetterEvent/OutboxEvent ثبت می‌کند؛ `data-source.ts` و migrationها باید با همین registry تطبیق داده شوند. وجود `policy_number_seq` در `nextPolicyNumber` به sequence migration وابسته است و در نبود آن fallback تصادفی اجرا می‌شود.

**اثر:** DB خالی یا CLI migration ممکن است جدول/sequence موردنیاز را نداشته باشد؛ policy number تضمین‌شده و قابل audit نیست.

**اصلاح:** migration canonical برای همه entityها، sequence/constraint/FK، data-source registry مشترک، clean/upgrade test و حذف fallback تصادفی در production.

### POLICY-CODE-024 — PII middleware با Fastify adapter ناسازگار است

**شاهد:** app module middleware `PiiMaskingMiddleware` را ثبت می‌کند و سرویس با `FastifyAdapter` اجرا می‌شود؛ الگوی middleware در این خانواده سرویس‌ها بر `res.json` اکسپرس تکیه دارد. Policy شامل `applicationData`, `riskAssessment`, party data و payloadهای حساس است.

**اثر:** ممکن است masking پاسخ‌ها اجرا نشود یا با adapter خطا دهد؛ get/list policy داده حساس را مستقیم برمی‌گرداند.

**اصلاح:** interceptor/serializer سازگار با Fastify، DTO allow-list، field classification/encryption و تست HTTP واقعی.

### POLICY-CODE-025 — health فقط DB را بررسی و خطای داخلی را افشا می‌کند

**شاهد:** health controller فقط `SELECT 1` را بررسی می‌کند و `err.message` را برمی‌گرداند؛ payments, regulatory, underwriting, Kafka consumer, outbox و archive job بررسی نمی‌شوند.

**اثر:** policy service می‌تواند healthy ولی قادر به issue/Sanhab/payment نباشد؛ اطلاعات DB افشا می‌شود.

**اصلاح:** liveness/readiness عمیق، dependency checks امن، consumer/outbox/archive metrics و error redaction.

---

## ۷. نقاط قوت واقعی

- lifecycle مراحل inquiry، docs، underwriting، risk assessed، issue، active، cancellation و renewal در کد وجود دارد.
- state helper و کیفیت gate سنهاب برای issue/unique code طراحی شده است.
- policy changes، renewal entity و inquiry entity برای traceability وجود دارند.
- create/quote و transitionهای اصلی در transaction و با OutboxPublisher پیاده شده‌اند.
- policy number sequence در صورت وجود و unique indexهای policy/unique code/idempotency تعریف شده‌اند.
- payment consumer، DLQ و consumed event طراحی شده‌اند، هرچند atomicity/retry باید اصلاح شود.

## ۸. برنامه اصلاحی و معیار پذیرش

| اولویت | اقدام | معیار اتمام |
|---|---|---|
| P0 | tenant در مدل/query/consumer/event | cross-tenant read/write و event test رد شود |
| P0 | حذف fallback `paid` | payments outage/forged body هرگز issue نکند |
| P0 | renewal unique code و lifecycle | renewal policy کد regulator جدید و gate کامل داشته باشد |
| P0 | atomic payment consumer | failed issue قابل retry/replay باشد و marker زودهنگام نباشد |
| P1 | اعمال Tenant/ABAC و object authorization | policy scope بر اساس tenant/org/party enforce شود |
| P1 | immutable lifecycle/version/concurrency | concurrent issue/renew/endorse deterministic باشد |
| P1 | endorsement validation و re-rating | تغییرات coverage/premium با approval/payment/regulatory انجام شود |
| P1 | Sanhab integration fail-fast و evidence | credential/TLS/query hash/TTL/signature/work item durable شود |
| P1 | money/date/currency validation | تاریخ و premium/instalment invalid رد شود |
| P1 | migration/sequence/entity registry | clean/upgrade DB و policy number بدون fallback تصادفی موفق باشد |
| P2 | health/readiness و consumer recovery | Kafka/outbox/dependency outage دیده و recover شود |
| P2 | audit/PII policy | change history کامل و responseهای sensitive کنترل شود |
| P2 | تست ریشه‌محور | lifecycle، payment، Sanhab، renewal، concurrency، security و migration؛ بدون skip/تغییر expectation برای پنهان‌کردن مشکل |

## ۹. نتیجه نهایی

`policy-service` از نظر breadth یکی از کامل‌ترین سرویس‌های فعلی است، اما production readiness آن تأیید نمی‌شود. موانع اصلی عبارت‌اند از **نبود tenant enforcement، صدور fail-open هنگام نبود payments، renewal با کد یکتای تکراری و بدون gate، consumer با marker failure، endorsement ناقص، validation مالی/تاریخی ضعیف، Sanhab evidence ناکافی و نبود تست اختصاصی**. این سرویس تا رفع P0ها نباید مرجع قطعی صدور بیمه‌نامه تلقی شود.
