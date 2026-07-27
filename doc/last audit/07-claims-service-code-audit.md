# گزارش ممیزی کد `claims-service`

**تاریخ بررسی:** ۲۰۲۶/۰۷/۲۶
**دامنه:** تمام فایل‌های `src/`، controller، service، entity، guard، consumer، middleware، migration، data source، `main.ts`، `health.controller.ts`، `package.json`، `tsconfig.json`، `Dockerfile` و `TRUTH.md`
**نقش هدف:** ثبت خسارت، FNOL، ارزیابی، تأیید، پرداخت، رد، بستن پرونده، کسر فرانشیز، اعتبارسنجی بیمه‌نامه، ارجاع ارزیاب، event consumer و integration با policy/party/orchestrator/auth
**وضعیت واقعی بر اساس کد:** **Operational ناقص با ریسک‌های P0 در tenant، مبلغ مالی، idempotency رویداد و قرارداد runtime**

## ۱. نمای واقعی سرویس

سرویس یک aggregate اصلی `Claim` و مسیرهای کامل lifecycle دارد. `ClaimsService` برای بیشتر mutationها transaction و OutboxPublisher استفاده می‌کند و `ClaimsEventsConsumer` رخدادهای fraud/payment را مصرف می‌کند. اکثر endpointها چهار guard (`JwtAuthGuard`, `PermissionsGuard`, `AbacGuard`, `TenantGuard`) دارند.

بااین‌حال چند کنترل اساسی فقط ظاهری هستند: tenant در مدل Claim وجود ندارد، ABAC بر اساس path/role heuristic است، مبلغ‌ها فقط `typeof number` کنترل می‌شوند، idempotency از controller به service منتقل نمی‌شود، نتیجه policy در نبود provider با defaultهای ساختگی ادامه می‌یابد، و consumer پیش از اجرای business effect رویداد را consumed ثبت می‌کند.

**تست اختصاصی سرویس:** فایل `*.spec.ts` یا `*.test.ts` در سرویس پیدا نشد. وجود build و migration، صحت business lifecycle، concurrency، پرداخت و consumer را اثبات نمی‌کند.

---

## ۲. یافته‌های بحرانی P0

### CLAIMS-CODE-001 — tenant در Claim و تمام queryهای دامنه وجود ندارد

**شاهد کد:** entity `Claim` در `src/entities/Claim.ts` هیچ `tenantId` ندارد. `ClaimsService.getClaim` خط 181، `listClaims` خطوط 191–205، و تمام mutationها فقط با `claimId`/`policyId` query می‌کنند. `TenantGuard` نیز در خطوط 10–18 نبود user/tenant را مجاز می‌کند و فقط در صورت وجود هم‌زمان claim و header mismatch را بررسی می‌کند.

**اثر:** کاربر مجاز یک tenant می‌تواند با `claimId` یا `policyId` پرونده tenant دیگر را بخواند، تغییر دهد، approve، reject، pay یا close کند. این برخلاف مدل single-tenant اختصاصی و boundary مورد انتظار است.

**اصلاح:** tenant به Claim، Outbox، event envelope و read model اضافه شود؛ context verified شامل `tenantId` به تمام service methodها وارد شود؛ همه queryها شرط tenant داشته باشند؛ header فقط برای تطبیق باشد؛ نبود tenant رد شود؛ RLS/partition یا deployment isolation تکمیل شود. تست cross-tenant برای هر route اجباری است.

### CLAIMS-CODE-002 — تأیید و پرداخت مبلغ بدون کنترل دامنه مالی انجام می‌شود

**شاهد کد:** controller در مسیرهای assess/approve/pay فقط `typeof body.amount === 'number'` را بررسی می‌کند. `ClaimsService.approveClaim` خطوط 309–311 مقدار `approvedAmount` را مستقیماً ذخیره می‌کند؛ `payClaim` خطوط 492–494 مقدار `paidAmount` را مستقیماً ذخیره می‌کند. هیچ کنترل صریحی برای مثبت‌بودن، finite بودن، precision/currency، `paidAmount <= approvedAmount` یا `approvedAmount <= assessedAmount` وجود ندارد.

**اثر:** مقدار منفی، `NaN`، Infinity، approve بیشتر از ارزیابی و پرداخت بیشتر از مبلغ approved می‌تواند وارد lifecycle شود. در حوزه بیمه این نقص می‌تواند پرداخت غیرمجاز یا ثبت ledger ناسازگار ایجاد کند.

**اصلاح:** Money value object با integer minor units یا decimal دقیق؛ currency اجباری؛ validation `finite >= 0`; limit بر اساس policy/coverage/reserve؛ approve ≤ assessed و pay ≤ approved با transaction/lock؛ عدم اعتماد به body برای limit؛ تست مرزی و race payment.

### CLAIMS-CODE-003 — idempotency ثبت خسارت در API فعال نیست

**شاهد کد:** `ClaimsService.createClaim` خطوط 99–129 پارامتر `idempotencyKey` و unique index entity را دارد، اما `ClaimsController.createClaim` خطوط 49–56 این فیلد را از body یا header دریافت و به service ارسال نمی‌کند.

**اثر:** retry شبکه یا double-click در endpoint اصلی دو Claim واقعی ایجاد می‌کند. پشتیبانی service-level به‌تنهایی کافی نیست چون API هرگز کلید را به آن نمی‌رساند.

**اصلاح:** `Idempotency-Key` اجباری برای POSTهای مالی/ایجاد خسارت؛ ذخیره request hash، response، status و tenant؛ unique `(tenant_id, idempotency_key)`؛ رفتار conflict برای key با payload متفاوت؛ تست concurrent duplicate.

### CLAIMS-CODE-004 — consumer قبل از business processing رویداد را consumed ثبت می‌کند

**شاهد کد:** `ClaimsEventsConsumer.handleMessage` در خطوط 120–129 ابتدا `ensureIdempotent` را اجرا می‌کند؛ این تابع خطوط 101–107 رکورد consumed را save می‌کند. سپس در خطوط 126–129 `handleFraudEvent` یا `handlePaymentEvent` اجرا می‌شود. اگر business handler بعد از save شکست بخورد، catch خطوط 131–139 فقط DLQ می‌کند و پیام Kafka به‌عنوان پردازش‌شده تلقی می‌شود.

**اثر:** با retry یا replay، event به‌دلیل رکورد consumed دیگر اجرا نمی‌شود؛ claim ممکن است هیچ‌وقت triage/rejected/paid نشود. Idempotency باید اتمیک با business mutation باشد، نه قبل از آن.

**اصلاح:** transaction شامل inbox/consumed marker و claim mutation؛ یا marker پس از موفقیت business effect؛ unique constraint برای race؛ وضعیت processing/failed/retry؛ DLQ replay باید marker را safely reset/continue کند؛ تست failure بین marker و save.

### CLAIMS-CODE-005 — event پرداخت بدون اعتبارسنجی claim و مبلغ، status را `paid` می‌کند

**شاهد کد:** `handlePaymentEvent` خطوط 186–191 برای `PaymentExecuted` مقدار `envelope.payload?.amount` را در `paidAmount` قرار می‌دهد و status را بی‌قیدوشرط `paid` می‌کند. tenant، currency، payment ID، approved amount، gateway signature و state فعلی بررسی نمی‌شوند.

**اثر:** event اشتباه/تکراری/جعلی یا amount بزرگ‌تر می‌تواند claim را paid اعلام کند. `eventId` و consumed marker فقط تکرار را مدیریت می‌کند، اعتبار business event را نه.

**اصلاح:** event schema validation، issuer/signature/audience، payment ID و gateway reconciliation، tenant match، amount/currency equality، state transition فقط approved، unique payment reference و audit evidence.

### CLAIMS-CODE-006 — migration و runtime schema/port ناسازگارند

**شاهد کد:** `app.module.ts` schema پیش‌فرض `public` و port پیش‌فرض `main.ts` خط 11 برابر 3001 است؛ `data-source.ts` schema پیش‌فرض `claims` دارد؛ `Dockerfile` خط 57 `EXPOSE 3002` می‌کند. migrationها نیز بدون schema-qualified table اجرا می‌شوند.

**اثر:** migration ممکن است در schema متفاوت از runtime اجرا شود و health/proxy/container به port متفاوت وصل شوند. اجرای build موفق، deploy قابل‌اعتماد را تضمین نمی‌کند.

**اصلاح:** config canonical مشترک برای schema/port؛ compose، Dockerfile، health probe و gateway هم‌راستا؛ migration روی DB خالی و upgrade واقعی اجرا شود؛ startup schema validation؛ حذف defaultهای متناقض.

---

## ۳. یافته‌های P1 در lifecycle و کنترل مالی

### CLAIMS-CODE-007 — state transition با concurrency lock/version محافظت نشده است

**شاهد:** mutationها در transaction اجرا می‌شوند اما `findOne` بدون `pessimistic_write` یا version column است؛ مثلاً approve خطوط 300–311 و pay خطوط 483–494 ابتدا claim را می‌خوانند، state را بررسی می‌کنند و سپس save می‌کنند.

**اثر:** دو درخواست همزمان می‌توانند هر دو state approved را ببینند یا approve/pay تکراری انجام دهند. state machine در سطح کد هست، اما atomic compare-and-swap نیست.

**اصلاح:** `@VersionColumn` یا `UPDATE ... WHERE status = expected`، row lock، transaction isolation، idempotency action key و تست همزمان approve/pay.

### CLAIMS-CODE-008 — approve موفق بدون اطمینان از آغاز saga گزارش می‌شود

**شاهد:** `approveClaim` ابتدا claim را approved می‌کند و سه event پرداخت را publish می‌کند. سپس در خطوط 371–411 saga را با fetch شروع می‌کند؛ نبود service token یا خطای fetch فقط log/warn می‌شود و متد در نهایت claim approved را برمی‌گرداند. response status HTTP نیز بررسی نمی‌شود.

**اثر:** سامانه می‌تواند claim را approved ثبت کند بدون اینکه payment orchestration ایجاد شده باشد. event `ClaimPaymentRequested` ممکن است وجود داشته باشد، اما اگر contract downstream ناقص باشد، وضعیت عملیاتی مبهم می‌شود.

**اصلاح:** payment request outbox canonical source باشد؛ saga start idempotent و قابل replay؛ response status/contract validation؛ state جداگانه `payment_requested/payment_pending`; عدم اعلام completion تا confirmation؛ alert برای stuck saga.

### CLAIMS-CODE-009 — policy validation اختیاری و fail-open/ambiguous است

**شاهد:** `validatePolicyForClaim` اگر `POLICY_SERVICE_URL` تنظیم نباشد یا call fail شود، policy null باقی می‌ماند؛ سپس `policyValidated = true` در خطوط 1114–1122 ذخیره می‌شود، هرچند `valid` false است. در `getFnolFormDefaults` نیز در نبود پاسخ policy، status را `active`، تاریخ‌ها را synthetic و coverage را fallback ثابت می‌کند (خطوط 1028–1052).

**اثر:** وضعیت «validated» می‌تواند بدون provider ثبت شود. FNOL ممکن است اطلاعات ساختگی active/coverage نمایش دهد و تصمیم عملیاتی بر پایه داده fabricated ساخته شود.

**اصلاح:** distinction بین `not_checked`, `provider_unavailable`, `invalid`, `valid`; defaultهای synthetic حذف؛ provider لازم برای claim creation/assessment/approval؛ cache نسخه‌دار با source/time؛ fail-closed برای پرداخت و تصمیم.

### CLAIMS-CODE-010 — approve/assess/reject/pay ورودی policy/coverage را در همان مسیر enforce نمی‌کنند

**شاهد:** `approveClaim` فقط state `assessed` را کنترل می‌کند و `approvedAmount` را می‌گیرد؛ قبل از آن `policyValidated`, coverage, reserve, fraud outcome یا KYC status را بررسی نمی‌کند. controller مسیر validate-policy جدا دارد و call آن اختیاری است.

**اثر:** caller دارای permission می‌تواند claim را بدون policy validation موفق، coverage check یا نتیجه fraud approve/pay کند.

**اصلاح:** command domain invariant در service، نه وابسته به ترتیب API؛ validation mandatory قبل از assessment/approval؛ fraud/KYC/payment gate؛ override رسمی با role/SoD/reason/audit.

### CLAIMS-CODE-011 — محاسبه فرانشیز semantics پرریسک دارد

**شاهد:** `calculateDeductible` خطوط 634–653 برای fixed و percentage از `Math.max` استفاده می‌کند و franchise را وقتی loss از threshold بیشتر است از مبلغ کم می‌کند. policy rule واقعی، currency/rounding، سقف و ترتیب deductions در کد enforce نشده است.

**اثر:** استفاده از max به‌جای جمع/اولویت قراردادی می‌تواند مبلغ net payable را غلط محاسبه کند؛ نتیجه مستقیماً در `assessedAmount` ذخیره می‌شود.

**اصلاح:** rule engine نسخه‌دار از policy-service، decimal arithmetic، rounding رسمی، ترتیب و cap مشخص، explainable calculation snapshot و approval برای override؛ تست جدول truth برای fixed/percentage/threshold.

### CLAIMS-CODE-012 — ClaimRegistered و ClaimSubmitted هم‌زمان برای یک create منتشر می‌شوند

**شاهد:** `createClaim` خطوط 133–175 دو event متفاوت برای یک عملیات تولید می‌کند؛ status هر دو `registered` است و distinction domain بین ثبت اولیه و submit روشن نیست.

**اثر:** downstream ممکن است دو بار case/notification/work item بسازد یا event semantics متناقض شود.

**اصلاح:** event taxonomy واحد با state transition روشن، event version/schema registry و consumer contract tests؛ اگر دو event لازم است، شرایط و ordering مشخص شود.

---

## ۴. یافته‌های P1 در authorization و ABAC

### CLAIMS-CODE-013 — ABAC واقعی نیست و GETها را بدون object scope آزاد می‌کند

**شاهد:** `abac.guard.ts` خطوط 9–17 در نبود user true می‌دهد و همه GETها را true می‌کند. برای mutationها فقط substringهای `approve/reject/pay/close` را در URL می‌سنجد و roleهای ثابت را قبول می‌کند.

**اثر:** object-level claim ownership، branch/org scope، claimant relation و tenant/resource attributes ارزیابی نمی‌شوند. تغییر URL یا endpoint جدید نیز می‌تواند از heuristic عبور کند.

**اصلاح:** fail-closed؛ action decorator و resource resolver؛ query scope براساس tenant/org/assigned adjuster؛ permission + policy واقعی؛ تست read/write برای هر role و branch.

### CLAIMS-CODE-014 — role mapping اجازه تفکیک وظایف کامل را نمی‌دهد

**شاهد:** `permissions.ts` به `claims_handler` هم `claims:assess`, `claims:approve`, `claims:reject`, `claims:close` می‌دهد؛ `insurer_admin` همه عملیات را دارد. هیچ SoD check برای creator/assessor/approver/payee در claims-service دیده نمی‌شود.

**اثر:** یک کاربر ممکن است همان خسارت را ارزیابی و approve کند یا مسیر حساس را تا close طی کند. داشتن نقش privileged به‌تنهایی جایگزین SoD نیست.

**اصلاح:** actor history روی claim، منع self-approve و conflict-of-interest، maker-checker، limit-based approval و central SoD policy؛ تست end-to-end.

### CLAIMS-CODE-015 — tenant header و actor فقط log می‌شوند، در service query استفاده نمی‌شوند

**شاهد:** controller tenant/actor را برای audit استخراج می‌کند، اما `getClaim`, `listClaims`, `assessClaim`, `rejectClaim`, `payClaim`, `closeClaim` context tenant/actor نمی‌گیرند. در approve فقط برای header integration ارسال می‌شوند.

**اثر:** audit ظاهراً tenant-aware است ولی authorization/data access واقعی tenant-aware نیست.

**اصلاح:** context اجباری در signature تمام command/queryها؛ policy تصمیم قبل از repository؛ عدم امکان فراخوانی بدون context معتبر.

---

## ۵. یافته‌های P1 در event و integration

### CLAIMS-CODE-016 — event consumer رویداد را با key/offset جعلی قابل idempotency می‌کند

**شاهد:** `handleMessage` خطوط 113–117 اگر Kafka key وجود نداشته باشد از `topic-partition-offset` استفاده می‌کند؛ envelope eventId ممکن است missing/invalid باشد. این fallback برای replay یا انتقال topic تضمین global identity ندارد.

**اثر:** یک event یکسان در partition/topic دیگر event متفاوت دیده می‌شود یا eventهای بدون ID به‌صورت ناپایدار deduplicate می‌شوند.

**اصلاح:** event envelope با `eventId` اجباری و UUID؛ reject پیام ناقص؛ producer contract validation؛ idempotency key از eventId معتبر، نه offset.

### CLAIMS-CODE-017 — fraud event می‌تواند claim را reject کند بدون بررسی state/tenant/evidence

**شاهد:** `handleFraudEvent` در خطوط 161–168 با `resolution === 'confirmed_fraud'` مستقیم status را rejected می‌کند؛ approved/paid/closed، tenant، fraud case identity و resolution authority بررسی نمی‌شوند.

**اثر:** event دیررس می‌تواند claim paid/closed را به rejected تبدیل کند و ledger/downstream را ناسازگار کند.

**اصلاح:** state transition policy برای async events، fraud case ID/signature/tenant، compensation event برای claim paid، human review gate و audit.

### CLAIMS-CODE-018 — HTTP integrations timeout، status contract و retry policy ندارند

**شاهد:** calls به policy، party، adjuster و orchestrator با `fetch` انجام می‌شوند و timeout/circuit breaker/idempotency مشخص ندارند. در `getFnolFormDefaults` خطای provider فقط warning است و fallback ادامه می‌یابد.

**اثر:** thread/resource exhaustion، داده stale، duplicate external action و رفتار متفاوت در outage.

**اصلاح:** client مشترک با deadline، retry فقط idempotent، circuit breaker، schema validation، correlation/tenant propagation و explicit degraded state.

### CLAIMS-CODE-019 — service token با permission ثابت ولی بدون tenant/audience/domain binding گرفته می‌شود

**شاهد:** `getServiceToken` خطوط 48–77 با issuer key و `serviceId` token می‌گیرد و فقط `orchestrations:saga_start` می‌فرستد؛ tenant و audience در request/token context وجود ندارد. وابستگی به security قرارداد `auth-service` است.

**اثر:** token service-to-service قابل استفاده خارج از tenant/هدف مورد انتظار می‌شود، مخصوصاً با مشکلات صدور service token ثبت‌شده در ممیزی auth.

**اصلاح:** mTLS یا credential مجزا، registry سرویس، audience مشخص orchestrator، tenant claim، TTL کوتاه، jti/revocation و contract test بین auth/claims/orchestrator.

---

## ۶. یافته‌های P1/P2 داده و PII

### CLAIMS-CODE-020 — PII masking با Fastify adapter ناسازگار است

**شاهد:** `app.module.ts` middleware را ثبت می‌کند؛ `pii-masking.middleware.ts` خطوط 34–41 از Express `res.json` استفاده می‌کند؛ `main.ts` با `FastifyAdapter` اجرا می‌شود.

**اثر:** contact phone/email، witness data و attached documents ممکن است بدون masking در response یا اصلاً middleware runtime error بدهند.

**اصلاح:** Fastify-compatible interceptor/serializer؛ DTOهای response با allow-list؛ تست HTTP برای create/get/list/FNOL و attached document.

### CLAIMS-CODE-021 — PII در JSONB و log/integration با سیاست retention نامشخص ذخیره می‌شود

**شاهد:** Claim فیلدهای `contactPhone`, `contactEmail`, `locationAddress`, `witnesses`, `attachedDocuments` را plaintext/jsonb نگه می‌دارد. FNOL defaults نیز `insuredPhone`, `insuredEmail`, `insuredAddress` را از سرویس‌ها دریافت و برمی‌گرداند.

**اثر:** دسترسی گسترده، retention نامحدود، export و backup با PII؛ encryption/field classification و retention در entity/migration دیده نمی‌شود.

**اصلاح:** field classification، encryption/tokenization، masking role-aware، retention/legal hold، حذف PII غیرضروری از eventها و log redaction.

### CLAIMS-CODE-022 — event payload اطلاعات PII و شناسه‌های شخصی را بدون قرارداد privacy منتشر می‌کند

**شاهد:** eventهای Claim payload شامل `claimantPartyId` و metadataهای مرتبط‌اند و eventهای FNOL/assignment داده‌های عملیاتی را پخش می‌کنند؛ schema privacy/consumer authorization در کد سرویس مشخص نیست.

**اصلاح:** data minimization، event classification، access-controlled topics، tokenized subject، retention و consumer contract.

---

## ۷. migration، اجرا و عملیات

### CLAIMS-CODE-023 — migration کامل از entity عقب‌تر است و schema پیش‌فرض متفاوت دارد

**شاهد:** migration پایه `1700000000101-create-claims-table.ts` فقط ستون‌های پایه را می‌سازد؛ ستون‌های deductible و FNOL در migrationهای بعدی اضافه شده‌اند، اما `idempotency_key`، `metadata` و برخی entity fields در migrationهای نشان‌داده‌شده اضافه نشده‌اند. `data-source.ts` نیز فقط `Claim` و `OutboxEvent` را ثبت می‌کند، درحالی‌که app module `ConsumedEvent` و `DeadLetterEvent` را هم دارد.

**اثر:** DB خالی یا CLI migration ممکن است برای runtime entity/consumer کامل نباشد؛ `synchronize` غیرproduction می‌تواند این drift را پنهان کند.

**اصلاح:** migration snapshot canonical، همه entityهای shared، constraints/index/FK و تست `migrate clean DB` و `upgrade existing DB`.

### CLAIMS-CODE-024 — consumer startup بعد از پنج retry برای همیشه متوقف می‌شود

**شاهد:** `ClaimsEventsConsumer.scheduleRetry` خطوط 45–60 پس از `maxRetries = 5` پیام می‌دهد و دیگر retry نمی‌کند. consumer در صورت نبود `KAFKA_BROKERS` نیز start fail می‌شود.

**اثر:** outage موقت Kafka می‌تواند consumer را permanently inactive کند تا restart دستی انجام شود؛ readiness نیز وضعیت consumer را گزارش نمی‌کند.

**اصلاح:** retry loop با backoff/jitter دائمی و circuit state، readiness degraded، metric lag/consumer status و operator action روشن.

### CLAIMS-CODE-025 — health فقط DB را بررسی می‌کند و خطای خام برمی‌گرداند

**شاهد:** `health.controller.ts` فقط `SELECT 1` انجام می‌دهد و در خط 23 `err.message` را response می‌کند؛ Kafka consumer، OutboxWorker، policy/orchestrator dependencies و migration status بررسی نمی‌شوند.

**اثر:** سرویس ممکن است health=ok باشد ولی event publishing/consumption یا payment orchestration از کار افتاده باشد؛ جزئیات DB نیز افشا می‌شود.

**اصلاح:** liveness/readiness جدا، DB/Kafka/outbox consumer health، dependency status امن، عدم افشای خطای داخلی و alert.

### CLAIMS-CODE-026 — پورت Docker و main متفاوت است

**شاهد:** `main.ts` default port 3001 است، `Dockerfile` `EXPOSE 3002` دارد.

**اثر:** probe، compose و gateway ممکن است به port اشتباه متصل شوند.

**اصلاح:** پورت canonical در env/compose/Dockerfile/health/gateway و smoke test container.

---

## ۸. نقاط قوت تأییدشده

- بیشتر mutationهای lifecycle در transaction انجام می‌شوند و برای ثبت خسارت و transitionهای اصلی OutboxPublisher استفاده شده است.
- claim number از sequence در صورت وجود تولید می‌شود و unique index دارد؛ هرچند fallback timestamp/random و migration sequence نیاز به اثبات دارد.
- state transition helper وجود دارد و مسیرهای مجاز اصلی تعریف شده‌اند.
- consumer برای fraud/payment، DLQ و consumed-event table دارد؛ مسئله atomicity marker باید اصلاح شود.
- JWT secret در guard اجباری است و default secret مشاهده نشد.
- permission catalog برای عملیات خسارت تعریف شده و endpointها عمدتاً guard شده‌اند.
- policy validation و FNOL integration در کد HTTP واقعی وجود دارد؛ اما fail-open/default fabrication آن‌ها را production-safe نمی‌کند.

---

## ۹. برنامه اصلاحی و معیار پذیرش

| اولویت | اقدام | معیار اتمام |
|---|---|---|
| P0 | tenant در Claim/query/event/consumer | cross-tenant read/write و event mismatch رد شود |
| P0 | کنترل دقیق مبلغ و currency | negative/NaN/Infinity، over-approval و over-payment رد شود |
| P0 | فعال‌سازی idempotency در controller | duplicate concurrent create فقط یک Claim بسازد |
| P0 | atomic inbox + business mutation | failure/replay event باعث lost update نشود |
| P0 | payment event verification | amount/currency/payment ID/state/tenant/signature validate شود |
| P0 | schema/port canonical | clean migration، upgrade و container smoke موفق باشد |
| P1 | lock/version و action idempotency | approve/pay همزمان رفتار قطعی داشته باشد |
| P1 | fail-closed policy validation | provider outage هرگز status active/validated مصنوعی نسازد |
| P1 | enforce policy/fraud/KYC gates | approve/pay بدون prerequisites رد شود |
| P1 | SoD و maker-checker | assessor/approver/payer conflict end-to-end رد شود |
| P1 | ABAC resource-level | branch/tenant/assignment scope برای read/write اعمال شود |
| P1 | event schema و async state policy | event دیررس نتواند lifecycle مالی را خراب کند |
| P1 | integration client استاندارد | timeout/retry/circuit/schema/idempotency داشته باشد |
| P1 | Fastify-compatible PII response control | responseهای PII با تست HTTP mask/allow-list شوند |
| P2 | health/readiness عمیق | Kafka/outbox/dependency failure قابل مشاهده باشد |
| P2 | consumer retry دائمی و metrics | outage موقت بدون restart دستی recover شود |
| P2 | تست ریشه‌محور | unit/integration/concurrency/security/runtime tests؛ failureها با اصلاح کد حل شوند، نه skip/تغییر expectation |

## ۱۰. نتیجه نهایی

`claims-service` از نظر breadth، lifecycle خسارت، FNOL، event و integration اسکلت قابل‌توجهی دارد؛ اما ادعای `Production-ready` در `TRUTH.md` با کد جاری تأیید نمی‌شود. مهم‌ترین موانع عبارت‌اند از **نبود tenant در مدل و query، کنترل ناکافی مبلغ، فعال‌نشدن idempotency در API، ثبت زودهنگام consumed event، اعتماد مستقیم به payment event، policy validation مبهم/ساختگی، ABAC heuristic، migration/port drift و نبود تست اختصاصی**.

تا بسته‌شدن موارد P0 و اجرای تست‌های همزمانی/امنیت/داده، این سرویس باید در وضعیت **کد عملیاتی موجود، اما آماده‌سازی production ناقص** ثبت شود.
