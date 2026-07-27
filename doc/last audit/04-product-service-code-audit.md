# گزارش ممیزی کد `product-service`

**تاریخ بررسی:** ۲۰۲۶/۰۷/۲۶
**دامنه:** تمام فایل‌های `src/` شامل controller، service، entity، guard، migration، data source، health، `main.ts`، package، Dockerfile و `TRUTH.md`
**نقش هدف:** تعریف محصولات بیمه، پوشش‌ها، فرانشیزها، قواعد قیمت‌گذاری، versioning و quote
**وضعیت واقعی:** **CRUD و محاسبه quote پایه وجود دارد؛ versioning، tenant isolation، governance قیمت و operational event contract ناقص است**

## ۱. خلاصه وضعیت واقعی

این سرویس entityهای `Product`, `Coverage`, `Deductible`, `PricingRule` و `ProductVersion` را دارد و APIهای ایجاد/مشاهده/ویرایش/archive، export، quote و ارزیابی rule ارائه می‌کند. ایجاد Product با transaction و Outbox انجام می‌شود؛ اما بخش عمده CRUDهای child و تغییرات pricing بدون transaction/outbox است.

`TRUTH.md` قابلیت `publishVersion` و `updateRateTable` را REAL اعلام می‌کند، ولی در کد controller/service متد `publishVersion` یا rate-table مستقل وجود ندارد. آنچه وجود دارد version عددی روی Product و snapshot هنگام update است.

**تست اختصاصی:** فایل `*.spec.ts` یا `*.test.ts` در سرویس وجود ندارد.

---

## ۲. یافته‌های بحرانی P0

### PRODUCT-CODE-001 — tenant در مدل و queryهای محصول وجود ندارد

**شاهد:** هیچ entityای `tenantId` ندارد. `getProduct`, `listProducts`, `getCoverage`, `listCoverages`, `getDeductible`, `listDeductibles`, `getPricingRule`, `listPricingRules` و `exportSnapshot` مستقیماً با شناسه/فیلتر business query می‌کنند. `TenantGuard` در خطوط 8 و 12 نبود tenant را مجاز می‌کند و فقط `req.tenantId` را set می‌کند؛ service این مقدار را دریافت نمی‌کند.

**اثر:** کاربر مجاز می‌تواند product، rule، coverage و snapshot شرکت دیگر را مشاهده یا با شناسه تغییر دهد؛ `export` کل catalog را برمی‌گرداند.

**اصلاح:** tenant به همه entityها و ProductVersion اضافه شود؛ context معتبر در تمام service methodها اجباری باشد؛ queryها شرط tenant داشته باشند؛ uniqueها `(tenant_id, code)` شوند؛ export tenant-scoped؛ system principal جدا و محدود؛ تست cross-tenant.

### PRODUCT-CODE-002 — quote ممکن است براساس قواعد نامعتبر/قدیمی و بدون وضعیت محصول محاسبه شود

**شاهد:** `computeQuote` خطوط 682–689 فقط وجود product و `status='active'` بودن pricing rule را می‌سنجد؛ status خود Product، version، validFrom/validTo، rule priority/type/region و currency را enforce نمی‌کند. `evaluatePricingRules` نیز active rules را می‌گیرد و ruleهای applicable را بر اساس منطق ناقص اجرا می‌کند.

**اثر:** محصول archived یا rule خارج بازه زمانی می‌تواند quote تولید کند؛ تغییرات rule بدون version/approval روی quote اثر می‌گذارد.

**اصلاح:** quote فقط از product/version منتشرشده؛ effective date و status محصول/rule اجباری؛ rule snapshot immutable؛ currency و jurisdiction؛ rule approval و effective-dated activation؛ تست تاریخ/نسخه/archived.

### PRODUCT-CODE-003 — قواعد قیمت‌گذاری قابل تزریق و از نظر domain validation ضعیف‌اند

**شاهد:** controller body را `any` می‌گیرد و `rule`, `conditions`, `regions` را مستقیم ذخیره می‌کند. `createPricingRule` فقط وجود product/code/name را چک می‌کند و مقدار rule را به‌صورت arbitrary JSON می‌پذیرد. parse/evaluate در `product.service.ts` fallback خاموش به basePremium صفر و adjustment خالی دارد.

**اثر:** rule malformed یا rule ناشناخته به‌جای reject به quote صفر/ناقص تبدیل می‌شود؛ امکان نرخ‌گذاری اشتباه بدون خطای آشکار وجود دارد.

**اصلاح:** JSON schema versioned و strict؛ reject unknown operator/type/NaN/Infinity/negative غیرمجاز؛ validation در write و read؛ fail-closed برای rule invalid؛ compile/cache با hash و approval.

### PRODUCT-CODE-004 — مقدارهای مالی با `number`/float محاسبه می‌شوند

**شاهد:** `toNumber` با `parseFloat`/`number` کار می‌کند؛ `computeQuote` و `evaluatePricingRules` با `+` و `*` روی `number` محاسبه می‌کنند. currency، precision، rounding، tax، minimum/maximum premium و overflow policy وجود ندارد.

**اثر:** خطای اعشاری و اختلاف مبلغ quote در صدور/پرداخت؛ امکان نرخ منفی، multiplier نامعتبر یا نتیجه Infinity/NaN.

**اصلاح:** Decimal/money type با minor unit، currency اجباری، rounding رسمی بیمه، bounds و invariant؛ quote شامل calculation snapshot و rule IDs/version/hash؛ تست property-based و جدول اعداد مرزی.

---

## ۳. یافته‌های P1 در versioning و lifecycle

### PRODUCT-CODE-005 — ProductVersion migration ندارد و lifecycle version ناقص است

**شاهد:** entity `ProductVersion` در `app.module.ts` ثبت شده، اما migration `1760000000610-create-product-tables.ts` فقط products/coverages/deductibles/pricing_rules را ایجاد می‌کند و `product_versions` را نمی‌سازد. `data-source.ts` نیز ProductVersion و OutboxEvent را در entities ثبت نکرده است.

**اثر:** CLI migration با runtime drift دارد؛ مسیر list/get version ممکن است روی DB خالی با خطای relation/table fail شود.

**اصلاح:** migration کامل ProductVersion، FK/index/unique، data-source registry مشترک و test clean DB/upgrade DB.

### PRODUCT-CODE-006 — create/update version با معنای مستندات هم‌خوان نیست

**شاهد:** `createProduct` Product را با `version` پیش‌فرض entity ایجاد می‌کند اما ProductVersion snapshot نمی‌سازد. `updateProduct` نسخه را افزایش و snapshot می‌سازد، اما `changeReason` و `changedBy` را مقداردهی نمی‌کند. controller نیز changeReason/actor update را به service ارسال نمی‌کند.

**اثر:** نسخه صفر/اول ثبت نمی‌شود، دلیل تغییر و actor ناقص است و history قابل audit/reproduce نیست. `TRUTH.md` ادعای `publishVersion` دارد ولی چنین endpointی وجود ندارد.

**اصلاح:** draft→review→approved→published lifecycle؛ snapshot immutable برای هر نسخه؛ publish command با actor/reason/approval/effective date؛ update مستقیم نسخه active ممنوع؛ event `ProductVersionPublished`.

### PRODUCT-CODE-007 — تغییرات child و pricing versioned/audited نیستند

**شاهد:** `createCoverage`, `updateCoverage`, `archiveCoverage`, `createDeductible`, `updateDeductible`, `archiveDeductible`, `createPricingRule`, `updatePricingRule`, `archivePricingRule` بدون ProductVersion snapshot و بدون Outbox publish اجرا می‌شوند.

**اثر:** quoteهای قبلی قابل بازسازی نیستند و downstreamها از تغییرات catalog آگاه نمی‌شوند.

**اصلاح:** child definitions بخشی از version snapshot؛ immutable پس از publish؛ event برای create/update/archive/publish؛ audit actor/tenant/reason/diff.

### PRODUCT-CODE-008 — archive و status transition بدون invariant است

**شاهد:** `archiveProduct` فقط status را archived می‌کند؛ `updateProduct` هر status body را می‌پذیرد. coverage/deductible/rule نیز update status را مستقیم ذخیره می‌کنند. بررسی active بودن product، وجود active version، وابستگی policyهای موجود یا ممنوعیت احیای archived دیده نمی‌شود.

**اثر:** catalog می‌تواند وضعیت‌های نامعتبر بگیرد؛ محصول active بدون coverage/rule یا محصول archived دوباره active شود.

**اصلاح:** state machine و transition table؛ approval و dependency checks؛ immutable published versions؛ archive با reason و impact analysis.

### PRODUCT-CODE-009 — product و child ownership رابطه‌ای دارد ولی authorization رابطه‌ای ندارد

**شاهد:** `createCoverage` فقط `productId` را بررسی می‌کند که وجود داشته باشد (خطوط 316–319)؛ هیچ بررسی tenant/actor scope یا archived status محصول ندارد. همین الگو برای deductible/pricing rule نیز وجود دارد.

**اثر:** user می‌تواند child را به product خارج از scope خود وصل کند یا روی product archived rule فعال بسازد.

**اصلاح:** resource authorization با tenant/product status/role؛ query و transaction واحد برای parent-child؛ object-level policy.

---

## ۴. یافته‌های P1 در pricing engine

### PRODUCT-CODE-010 — دو موتور quote با semantics متفاوت وجود دارد

**شاهد:** `computeQuote` از `parseRuleV1` استفاده می‌کند و همه active rules را جمع می‌کند؛ `evaluatePricingRules` بر اساس `ruleType`, priority و conditions شاخه‌های متفاوت دارد. یکی `appliedRuleIds` را ID می‌دهد و دیگری `appliedRules` را code؛ خروجی و ترتیب یکسان نیست.

**اثر:** دو endpoint برای یک product می‌توانند premium متفاوت بدهند؛ policy/quote consumers نمی‌دانند کدام نتیجه authoritative است.

**اصلاح:** یک domain engine و یک contract canonical؛ endpoint legacy حذف یا به engine مشترک delegate شود؛ golden test برای تمام rule types.

### PRODUCT-CODE-011 — region condition در نبود region fail-open است

**شاهد:** `isRuleApplicable` خطوط 794–796 فقط وقتی `rule.regions` و `region` هر دو truthy باشند match را بررسی می‌کند. اگر rule regions داشته باشد اما caller region ندهد، rule قابل اعمال می‌ماند.

**اثر:** rule منطقه‌ای می‌تواند برای منطقه نامعلوم/غیرمجاز اعمال شود.

**اصلاح:** اگر rule region-scoped است و region معتبر وجود ندارد، reject/عدم اعمال؛ normalize region؛ تست missing/unknown region.

### PRODUCT-CODE-012 — multiplier و percent بدون محدودیت و semantics روشن اعمال می‌شوند

**شاهد:** `evaluateConditionalRule`, `evaluateTieredRule`, `evaluateRegionalRule` type را از JSON می‌گیرند و `finalPremium` خطوط 774–782 آن را اعمال می‌کند. multiplier می‌تواند صفر/منفی/بزرگ باشد؛ percent نیز بدون cap/rounding اعمال می‌شود.

**اثر:** premium صفر، منفی یا چندبرابر غیرواقعی؛ سوءپیکربندی rule اثر مالی مستقیم دارد.

**اصلاح:** type-specific bounds، percent range، multiplier policy، cap/floor، currency و approval؛ reject rule ناسالم هنگام save.

### PRODUCT-CODE-013 — base rules می‌توانند چندبار به premium اضافه شوند

**شاهد:** `evaluatePricingRules` برای هر rule با type `base` خط 755 `basePremium = ...` را overwrite می‌کند، ولی `computeQuote` خطوط 694–698 basePremium تمام ruleهای active را جمع می‌کند.

**اثر:** quote دو endpoint برای چند base rule متفاوت است و priority semantics در یکی رعایت نمی‌شود.

**اصلاح:** حداکثر یک base rule فعال در هر version یا aggregation policy صریح؛ unique partial index/validation؛ golden tests.

### PRODUCT-CODE-014 — effectiveDate فقط در endpoint advanced pricing است

**شاهد:** `computeQuote` هیچ effectiveDate دریافت نمی‌کند و active rules را بدون validFrom/validTo filter می‌کند؛ `evaluatePricingRules` effectiveDate اختیاری دارد.

**اثر:** quote عادی می‌تواند rule آینده یا منقضی‌شده را اعمال کند.

**اصلاح:** effective date اجباری/پیش‌فرض معتبر در هر دو endpoint و query/filter یکسان.

---

## ۵. یافته‌های P1 امنیت و data access

### PRODUCT-CODE-015 — ABAC placeholder است و همه GETها را مجاز می‌کند

**شاهد:** `abac.guard.ts` خطوط 14–15 همه GETها را true می‌کند و برای mutation هر کاربر دارای هر role را مجاز می‌داند (خط 26).

**اثر:** permission decorator تنها کنترل مؤثر باقی می‌ماند و branch/tenant/resource scope وجود ندارد.

**اصلاح:** resource resolver و policy واقعی برای catalog، export و pricing; fail-closed برای نبود user/context.

### PRODUCT-CODE-016 — export کل catalog را بدون tenant/نسخه/فیلتر برمی‌گرداند

**شاهد:** `exportSnapshot` خطوط 648–661 چهار repository را بدون tenant filter و بدون محدودیت version/query هم‌زمان می‌خواند. controller آن را مستقیم response می‌کند.

**اثر:** افشای کامل catalog و قواعد قیمت؛ مصرف حافظه/زمان بالا برای catalog بزرگ.

**اصلاح:** export async job با permission ویژه، tenant scope، filtering/version, signed download، audit، rate/size limit و redaction.

### PRODUCT-CODE-017 — JWT verification policy ناقص است

**شاهد:** guard خط 26 فقط `jwt.verify(token, jwtSecret)` دارد؛ issuer/audience/algorithm/key rotation بررسی نمی‌شود.

**اثر:** پذیرش token با مقصد/issuer نادرست و ناهماهنگی با auth policy مرکزی.

**اصلاح:** shared JWT/JWKS verification policy و تست forged/wrong issuer/audience/algorithm/rotation.

### PRODUCT-CODE-018 — audit فقط برای بخشی از createهاست

**شاهد:** controller برای create product/coverage/deductible/pricing log دارد، اما update/archive، export، quote و evaluate به‌صورت کامل actor/tenant/diff/version/result audit نمی‌شوند. `audit.logger.ts` صرفاً pino است و append-only audit sink دیده نمی‌شود.

**اثر:** تغییر نرخ و catalog قابل بازسازی و پاسخ‌گویی regulatory نیست.

**اصلاح:** audit event immutable با actor/tenant/reason/before-after/rule hash/correlation؛ export/quote access نیز audit شوند.

---

## ۶. migration و runtime

- `data-source.ts` فقط چهار entity را ثبت می‌کند و `ProductVersion` و `OutboxEvent` را حذف کرده است؛ CLI migration/runtime از هم drift دارند.
- migration ایجاد product tables، ProductVersion را ندارد و migration enhance pricing فقط ستون‌های PricingRule را اضافه می‌کند؛ migration کامل versioning دیده نمی‌شود.
- `main.ts` OutboxWorker را به‌صورت async setup می‌کند اما `outboxWorker.start()` را await نمی‌کند و readiness Kafka/outbox ثبت نمی‌شود.
- `app.module.ts` schema پیش‌فرض `public` و `data-source.ts` نیز `public` است؛ اگر deployment schema اختصاصی هدف است، configuration enforcement وجود ندارد.
- `health.controller.ts` فقط DB را ping می‌کند، خطای خام DB را در response برمی‌گرداند و Kafka/outbox/freshness را بررسی نمی‌کند.
- Dockerfile از `NODE_TLS_REJECT_UNAUTHORIZED=0` هنگام install استفاده می‌کند؛ این فقط build-time است اما کنترل supply-chain ناامن است و باید حذف/محدود شود.
- هیچ تست اختصاصی برای quote arithmetic، rule ordering، publication، tenant، export و migration وجود ندارد.

---

## ۷. نقاط قوت واقعی

- بیشتر APIها JWT و permission guard دارند.
- Product creation داخل transaction با outbox event انجام می‌شود.
- child entities FK به product دارند و unique `(product_id, code)` در migration وجود دارد.
- pagination با سقف ۲۰۰ و offset محدودشده است.
- rule evaluator انواع base/conditional/tiered/regional/discount/surcharge را به‌صورت کد واقعی دارد، اما validation و semantics آن ناقص است.
- ProductVersion entity و unique `(product_id, version)` طراحی شده، هرچند migration و lifecycle آن کامل نیست.

## ۸. برنامه اصلاحی و معیار پذیرش

| اولویت | اقدام | معیار اتمام |
|---|---|---|
| P0 | tenant در همه entity/query/export/event | cross-tenant access و export test رد شود |
| P0 | migration/version registry کامل | DB خالی و upgrade بدون خطای ProductVersion/Outbox |
| P0 | یک pricing engine canonical | دو endpoint برای fixtureهای یکسان نتیجه یکسان بدهند |
| P0 | money/currency/rounding/bounds | NaN/negative/overflow و مبالغ غیرمجاز رد شوند |
| P1 | immutable publish lifecycle | active version فقط با approval و effective date منتشر شود |
| P1 | child changes versioned/evented | quote تاریخی با rule snapshot بازسازی شود |
| P1 | state/parent-child invariants | archive/activation و cross-product assignment کنترل شود |
| P1 | ABAC object-level و JWT policy | resource scope و issuer/audience/algorithm enforce شود |
| P1 | export امن و audit کامل | tenant-scoped، async، rate-limited و قابل ردیابی باشد |
| P1 | event/outbox/readiness | publish failure و Kafka outage قابل مشاهده و retry شود |
| P2 | حذف TLS verify disable در build | dependency install با TLS معتبر و lock verification انجام شود |
| P2 | تست ریشه‌محور | quote, lifecycle, concurrency, migration, security و contract tests؛ بدون skip یا تغییر expectation برای پنهان‌کردن باگ |

## ۹. نتیجه نهایی

`product-service` یک catalog و pricing skeleton عملیاتی دارد، اما وضعیت `Production-ready` و ادعای versioning کامل در `TRUTH.md` با کد جاری تأیید نمی‌شود. موانع اصلی عبارت‌اند از **نبود tenant، نبود migration/version lifecycle کامل، دو موتور قیمت‌گذاری ناسازگار، محاسبه مالی با float، rule validation ضعیف، archive/activation بدون invariant، export بدون scope و audit ناقص**.
