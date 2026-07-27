# گزارش ممیزی کد `party-kyc-service`

**تاریخ بررسی:** ۲۰۲۶/۰۷/۲۶
**دامنه:** تمام ۲۴ فایل `src/` شامل controller، service، guard، middleware، entity، migration، data source، health، `package.json`، `Dockerfile` و `TRUTH.md`
**نقش هدف:** Party/Customer، KYC، consent، identity proofing، screening خارجی، document trust chain، exception queue و SLA
**وضعیت واقعی بر اساس کد:** **Operational ناقص؛ برای production و Enterprise-ready قابل تأیید نیست**

## ۱. ساختار بررسی‌شده

- `party.controller.ts` با ۳۰+ مسیر برای Party، KYC، consent، trust chain، identity proofing، external verification، exception و SLA
- `party.service.ts` با persistence در TypeORM، KYC scoring، رمزنگاری PII، Outbox، HTTP integration و exception handling
- entityهای `Party`, `KycReview`, `DocumentTrustChainEntry`, `IdentityProofingRecord`, `ExternalVerificationRequestEntity`, `KycExceptionEntity`
- guardهای JWT، permission، ABAC و tenant و middleware ماسک PII
- migrationهای `1700000000300-init`, `0301-create-party-kyc-tables`, `0302-add-global-user-id`
- `main.ts`, `app.module.ts`, `data-source.ts`, health، package و Dockerfile

**تست اختصاصی سرویس:** فایل `*.spec.ts` یا `*.test.ts` در سرویس پیدا نشد. `TRUTH.md` قابلیت‌ها را REAL اعلام می‌کند، اما برای identity و screening صراحتاً endpoint واقعی را پیش‌نیاز می‌داند؛ بنابراین REAL در این گزارش به معنای وجود مسیر کد است، نه اثبات اتصال عملیاتی.

---

## ۲. یافته‌های بحرانی P0

### PARTY-CODE-001 — کلید پیش‌فرض و رمزنگاری نامناسب PII

**شاهد:** `party.service.ts` خطوط 104–112 و 114–128 مقدار `FIELD_ENCRYPTION_KEY || 'default-encryption-key-32b'` را استفاده می‌کند و AES-256-CBC بدون authentication tag به کار می‌برد.

**اثر:** اگر env تنظیم نشده باشد، کلید قابل حدس برای national ID و mobile استفاده می‌شود. CBC به‌تنهایی tamper detection ندارد و ciphertext دستکاری‌شده ممکن است با رفتار نامطمئن decrypt شود.

**اصلاح:** startup fail-fast در نبود کلید معتبر؛ AES-256-GCM/AEAD با nonce و tag؛ key versioning و rotation؛ KMS/Vault؛ migration امن برای داده‌های قبلی؛ عدم log/response plaintext مگر با purpose و مجوز.

### PARTY-CODE-002 — uniqueness و جست‌وجوی national ID به‌دلیل IV تصادفی کار نمی‌کند

**شاهد:** `createParty` در خطوط 154–159 مقدار `nationalId` را با `encryptPii` ذخیره می‌کند؛ این تابع هر بار IV تصادفی تولید می‌کند. `listParties` خطوط 237–242 نیز national ID ورودی را دوباره encrypt می‌کند و ciphertext جدید را با ciphertext قبلی مقایسه می‌کند.

**اثر:** duplicate national ID معمولاً با unique index تشخیص داده نمی‌شود و filter بر اساس national ID نتیجه درست نمی‌دهد. در `performIdentityProofing` خط 503 نیز query با plaintext `params.nationalId` روی ستون encrypted انجام می‌شود و dedup عملاً شکست می‌خورد.

**اصلاح:** نگهداری ciphertext برای نمایش و یک blind index/HMAC deterministic برای lookup/uniqueness؛ index روی blind index، نه ciphertext تصادفی؛ همه queryهای dedup/list از همان index استفاده کنند؛ تست duplicate و جست‌وجوی تکراری.

### PARTY-CODE-003 — tenant در entityها و queryها وجود ندارد

**شاهد:** `Party`, `KycReview`, `IdentityProofingRecord`, `ExternalVerificationRequestEntity` و `KycExceptionEntity` هیچ `tenantId` ندارند. `party.service.ts` تمام queryها را با `partyId`, `nationalId`, `requestId` یا review fields اجرا می‌کند و هیچ شرط tenant ندارد. `TenantGuard` فقط header را در صورت وجود با claim مقایسه می‌کند و نبود user/tenant را رد نمی‌کند.

**اثر:** داده مشتری/KYC از شرکت‌های مختلف در یک جدول/شناسه قابل مشاهده یا تغییر است؛ هدف نصب اختصاصی و مرزبندی داده در سطح سامانه و سرویس enforcement نشده است.

**اصلاح:** tenant به‌عنوان ستون غیرقابل تهی و کلید ترکیبی/شرط اجباری در تمام entityها و queryها؛ استخراج از verified JWT، نه header؛ RLS یا schema/database isolation؛ تست cross-tenant برای تمام endpointها.

### PARTY-CODE-004 — middleware ماسک PII با Fastify adapter ناسازگار است

**شاهد:** `app.module.ts` خطوط 37–40 `PiiMaskingMiddleware` را روی همه routeها اعمال می‌کند؛ middleware در `pii-masking.middleware.ts` خطوط 35–43 از `Response` اکسپرس و `res.json.bind(res)` استفاده می‌کند، درحالی‌که `main.ts` با `FastifyAdapter` برنامه را می‌سازد.

**اثر:** در Fastify، `reply.json` الگوی پاسخ استاندارد نیست؛ middleware ممکن است در runtime خطا دهد یا اصلاً پاسخ‌ها را mask نکند. حتی اگر wrapper فعال شود، controller `create` و `get` nationalId را plaintext برمی‌گرداند.

**اصلاح:** از interceptor/serializer سازگار با Fastify یا masking در response DTO استفاده شود؛ تست واقعی هر route و بررسی خروجی HTTP؛ default-deny برای فیلدهای حساس و عدم بازگرداندن nationalId کامل.

### PARTY-CODE-005 — داده screening و تصمیم KYC از client پذیرفته می‌شود

**شاهد:** `runAmlScreening` در controller body `screeningResults` را می‌گیرد و مستقیم به `party.service.ts` می‌دهد؛ سرویس `calcRisk` را روی همان داده اجرا می‌کند. `verifyDocuments` نیز decision را از body می‌پذیرد.

**اثر:** caller مجاز می‌تواند نتیجه sanctions/PEP/adverse media یا کیفیت سند را جعل کند؛ امتیاز ریسک و مرحله KYC بدون evidence منبع خارجی قابل تغییر است.

**اصلاح:** screening فقط از provider معتبر یا job نتیجه‌دار پذیرفته شود؛ provider response، request ID، timestamp، signature و source ثبت شود؛ کاربر فقط trigger/review انجام دهد؛ override انسانی با SoD و audit باشد.

### PARTY-CODE-006 — تشخیص duplicate identity فعلی عملاً غلط است

**شاهد:** `performIdentityProofing` خطوط 502–505 `partyRepo.find({ where: { nationalId: params.nationalId } })` را اجرا می‌کند، درحالی‌که nationalId در `createParty` encrypted ذخیره شده است.

**اثر:** duplicate identity با national ID پیدا نمی‌شود و نتیجه proofing می‌تواند `passed` بماند.

**اصلاح:** blind index مشترک، تطبیق normalized national ID، dedup workflow با manual review و عدم بازگرداندن IDهای تطبیق‌داده‌شده به caller غیرمجاز.

---

## ۳. نقص‌های P1 در lifecycle KYC

### PARTY-CODE-007 — state machine واقعی برای KYC وجود ندارد

**شاهد:** `submitDocuments` بدون بررسی stage قبلی، status را `submitted` و stage را `aml_screening` می‌کند. `verifyDocuments`، `runAmlScreening`، `reviewKyc` و `escalateReview` نیز transition مجاز را validate نمی‌کنند.

**اثر:** هر مسیر می‌تواند از وضعیت نامرتبط اجرا شود؛ مثلاً review قبل از تکمیل مدارک، screening چندباره، approve بعد از rejected یا تغییر نتیجه پرونده بسته.

**اصلاح:** transition table رسمی برای stage/status؛ optimistic locking/version؛ idempotency؛ reject transition نامعتبر؛ ثبت state history و actor.

### PARTY-CODE-008 — reviewKyc خارج از transaction و event publish non-atomic است

**شاهد:** `reviewKyc` خطوط 254–281 ابتدا `kycRepo.save` می‌کند، سپس `outboxPublisher.publish(...).catch(...)` را اجرا می‌کند. Publisher در constructor به `dataSource` اصلی متصل است، نه transaction manager.

**اثر:** تغییر وضعیت ممکن است commit شود ولی event منتشر/در outbox ثبت نشود؛ downstreamها از KycApproved/KycRejected مطلع نمی‌شوند. catch خطا را فقط log می‌کند.

**اصلاح:** save و outbox insert در یک transaction؛ خطای publish به outbox نباید بلعیده شود؛ worker retry/DLQ و event idempotency؛ event برای تمام transitionهای حساس.

### PARTY-CODE-009 — بسیاری از mutationها event و audit کامل ندارند

**شاهد:** `submitDocuments`, `verifyDocuments`, `runAmlScreening`, `escalateReview`, consent، trust chain، exception و SLA صرفاً repository save/return دارند؛ event و actor audit برای همه مسیرها وجود ندارد.

**اثر:** timeline KYC، consent revocation، source نتیجه و تغییرات حساس قابل بازسازی نیست.

**اصلاح:** event catalog برای Party/KYC/Consent/DocumentProofing/Exception؛ audit append-only با actor/tenant/correlation/source؛ outbox transactional.

### PARTY-CODE-010 — consent ناقص و بدون lineage

**شاهد:** `grantAmlConsent` و `revokeAmlConsent` فقط فیلدهای Party را update می‌کنند. `grantedBy`, `revokedBy`, `reason`, متن/نسخه رضایت و event در entity `Party` ذخیره نمی‌شود؛ controller revoke نیز `body.reason` را می‌گیرد اما service آن را persist نمی‌کند.

**اثر:** اثبات اینکه چه کسی، برای چه هدفی، با چه متن و تا چه زمانی رضایت داده یا لغو کرده ممکن نیست.

**اصلاح:** Consent entity/version، purpose/legal basis، actor، channel، timestamp، evidence، revoke reason، history و policy enforcement در مصرف AML.

### PARTY-CODE-011 — SLA فقط محاسبه تقویمی ساده است

**شاهد:** `createParty` due date را با `Date.setDate(+7)` می‌سازد و `checkSlaCompliance` اختلاف روز تقویمی را می‌سنجد؛ تعطیلات، timezone، توقف SLA، مرحله‌ها و escalation خودکار وجود ندارد.

**اثر:** گزارش compliance در محیط ایران و عملیات واقعی دقیق نیست؛ overdue فقط query است و action خودکار ندارد.

**اصلاح:** business calendar، timezone، pause/resume، SLA per stage/risk، alert/escalation، owner و metric.

---

## ۴. نقص‌های P1 در identity proofing و screening خارجی

- `getIdentityVerificationUrl` در خطوط 131–135 در صورت نبود endpoint به `MODEL_SWITCHBOARD_URL` fallback می‌کند؛ این fallback از نظر domain ownership و قرارداد `/verify` تضمین نشده است.
- callهای identity و screening timeout مشخص، retry طبقه‌بندی‌شده، circuit breaker و idempotency key ندارند؛ request خارجی می‌تواند طولانی شود یا تکرار provider ایجاد کند.
- خطای provider در identity فقط warning می‌شود و سپس رکورد با score صفر/failed ذخیره می‌شود؛ distinction بین provider unavailable و identity failed از بین می‌رود.
- `faceMatchThreshold` عدد hardcoded 85 است، ولی تصمیم `passed` صرفاً بر اساس `faceMatch`, liveness و authenticity است و threshold در تصمیم استفاده نمی‌شود.
- `confidenceScore` با فرمول ساده و بدون model version، provider evidence یا calibration محاسبه می‌شود؛ model governance/quality/drift وجود ندارد.
- تصاویر `faceImage` و `documentImage` از body به provider ارسال می‌شوند، اما size/type/virus/privacy/retention کنترل‌شده در کد دیده نمی‌شود.
- external verification درخواست را ابتدا save می‌کند، سپس call synchronous می‌زند؛ اگر provider کند/قطع باشد request failed می‌شود و job async/retry ندارد.
- پاسخ و `requestPayload` خام در JSONB ذخیره می‌شوند؛ masking، classification، retention و encryption برای داده حساس مشخص نیست.
- provider response signature/source lineage و correlation با screening case ذخیره نمی‌شود.

---

## ۵. نقص‌های P1 در document trust chain

- `addToDocumentTrustChain` hash را از caller می‌گیرد؛ فایل/محتوا در این سرویس دریافت یا hash مجدد نمی‌شود.
- برای تعیین `previousHash` ابتدا chain را می‌خواند و سپس save می‌کند؛ دو درخواست همزمان می‌توانند یک `chainPosition` و previous hash یکسان بسازند.
- عملیات در transaction و با unique constraint روی `(partyId, chainPosition)` یا document id نیست.
- verify فقط `trustLevel` را validate نمی‌کند و اجازه می‌دهد هر مقدار string از body وارد شود؛ دوباره‌verify، actor scope و reason کنترل نشده است.
- chain tamper-evident نیست؛ hash کل رکورد/metadata، signature، audit immutable و verification دوره‌ای وجود ندارد.
- `getDocumentTrustChain` بدون محدودیت و بررسی resource-level ownership کل chain را برمی‌گرداند.

**معیار اصلاح:** hash از سند canonical، transaction/lock، unique constraint، enum validation، version/history، legal hold و test concurrent append.

---

## ۶. نقص‌های authorization و data access

### PARTY-CODE-012 — ABAC عملاً role/path heuristic است

**شاهد:** `abac.guard.ts` اگر user نباشد true برمی‌گرداند؛ برای GET همیشه true است؛ برای mutationهای غیر از چند substring نیز true است. resource owner، party tenant، partyId و purpose را از DB ارزیابی نمی‌کند.

**اثر:** وجود ABAC در ماژول به معنی کنترل attribute-based واقعی نیست؛ کاربر دارای permission ممکن است به Party/KYC خارج از scope سازمانی دسترسی داشته باشد.

**اصلاح:** fail-closed برای نبود user، resource resolver، tenant/branch ownership query، action metadata، policy engine و تست read/write cross-org.

### PARTY-CODE-013 — queryها با actor/tenant محدود نشده‌اند

**شاهد:** `getParty`, `listParties`, `latestKyc`, `getIdentityProofingResult`, `getExternalVerificationRequest`, exception list و trust chain فقط ID یا filter کسب‌وکاری دارند؛ tenant/organization scope از request به service منتقل نمی‌شود.

**اثر:** هر نقش دارای permission می‌تواند با شناسه حدس‌زده‌شده رکورد دیگری را بخواند یا تغییر دهد.

**اصلاح:** همه service methodها context شامل tenant/actor/purpose بگیرند؛ query شرط tenant و scope داشته باشد؛ object-level authorization قبل از read/write.

### PARTY-CODE-014 — شناسه‌های resource و actor ورودی بدون بررسی مالکیت پذیرفته می‌شوند

**شاهد:** `assignKycException` فقط `exceptionId` و `assignedTo` را می‌گیرد؛ `verifyDocumentInTrustChain` فقط party/document id را query می‌کند؛ ارتباط assignedTo با role/tenant بررسی نمی‌شود.

**اثر:** reassignment یا تغییر trust توسط کاربر خارج از تیم/tenant ممکن است.

**اصلاح:** existence + tenant + state + actor scope + target user validation و ثبت تصمیم.

---

## ۷. نقص‌های داده و migration

### PARTY-CODE-015 — migration با entityهای فعلی کامل نیست

**شاهد:** migration `1700000000301-create-party-kyc-tables.ts` فقط جدول‌های پایه parties و kyc_reviews با چند ستون اولیه می‌سازد. Entityهای فعلی KycReview ده‌ها ستون workflow، risk، screening، document و SLA دارند و entityهای trust chain، identity proofing، external verification و exception نیز در app module ثبت شده‌اند؛ migration مربوط به همه این جدول‌ها در فهرست ۲۴ فایل دیده نشد.

**اثر:** اجرای `migrate` روی DB خالی نمی‌تواند schema موردنیاز runtime را بسازد؛ build موفق یا `DB_SYNC` غیرproduction این نقص را پنهان می‌کند.

**اصلاح:** migration canonical برای تمام entityها، constraints/FK/index، اجرای واقعی روی DB خالی و upgrade DB موجود، سپس غیرفعال‌بودن synchronize در production.

### PARTY-CODE-016 — `data-source.ts` فقط دو entity را برای migration می‌شناسد

**شاهد:** `src/data-source.ts` خطوط 3–4 و 14 فقط `Party` و `KycReview` را در entities دارد؛ app module شش entity دامنه‌ای و Outbox را ثبت می‌کند.

**اثر:** migration generation/run از CLI با runtime schema متفاوت است و جدول‌های جدید ممکن است migrate نشوند.

**اصلاح:** data source و app module از registry مشترک entity استفاده کنند؛ Outbox و همه جدول‌ها در migration test بررسی شوند.

### PARTY-CODE-017 — unique national ID با encryption تصادفی ناسازگار است

**شاهد:** entity روی `nationalId` unique index دارد، اما هر encryption مقدار متفاوت می‌دهد؛ در نتیجه constraint business uniqueness را نمایندگی نمی‌کند.

**اثر:** duplicate و dedup ناقص و کنترل KYC غیرقابل اعتماد.

**اصلاح:** ستون blind index unique، normalize قبل از hash، migration داده و تست collision/duplicate.

### PARTY-CODE-018 — نبود foreign key و relationهای صریح

**شاهد:** entityهای KYC/Trust/Identity/External/Exception فقط UUID/text ستون دارند و در کد رابطه/foreign key صریح بین party و review/document دیده نمی‌شود.

**اثر:** orphan record، حذف Party بدون سیاست cascade/legal hold و گزارش‌های ناسازگار.

**اصلاح:** FK با policy مشخص، جلوگیری از حذف حساس، data repair و consistency checks.

---

## ۸. نقاط قوت واقعی کد

- مسیرهای دامنه‌ای گسترده برای Party، KYC، consent، trust chain، proofing، screening، exception و SLA وجود دارد.
- create Party و initial KYC در transaction انجام می‌شود و event `PartyCreated` به Outbox نوشته می‌شود؛ هرچند خطای publish catch می‌شود.
- JWT verification با secret اجباری انجام می‌شود؛ default JWT secret در guard جاری دیده نشد.
- permissionهای مجزا برای عملیات KYC تعریف شده‌اند و اکثر endpointها چهار guard دارند.
- identity proofing و screening HTTP integration واقعی در کد وجود دارد؛ `TRUTH.md` نیز نیاز credential/endpoint را صریح می‌داند.
- برای response masking، recursion و پوشش چند فیلد PII طراحی شده است؛ adapter mismatch و plaintext response باید اصلاح شود.
- pagination سقف ۲۰۰ در برخی مسیرها اعمال شده است؛ اما در list KYC reviews سقف controller ناقص است.

---

## ۹. برنامه اصلاحی و معیار پذیرش

| اولویت | اقدام | معیار اتمام |
|---|---|---|
| P0 | حذف encryption key پیش‌فرض و انتقال به AEAD/KMS | startup بدون key fail؛ decrypt/encrypt rotation تست شود |
| P0 | blind index و اصلاح duplicate/list/proofing | ایجاد و جست‌وجوی national ID تکراری درست کار کند |
| P0 | tenant در همه entity/queryها | تست cross-tenant برای read/write تمام routeها رد شود |
| P0 | اصلاح PII masking در Fastify | پاسخ HTTP واقعی nationalId/mobile را بدون مجوز mask کند |
| P0 | migration کامل همه entityها | DB خالی و upgrade DB با `migrate` موفق شود |
| P1 | state machine و optimistic locking KYC | transition نامعتبر/duplicate/replay رد شود |
| P1 | screening نتیجه‌محور از provider، نه body caller | source, request ID, signature و model/provider version ثبت شود |
| P1 | transaction/outbox برای تمام mutationهای حساس | state و event اتمیک و retry/DLQ داشته باشند |
| P1 | ABAC object-level و fail-closed | resource خارج scope قابل مشاهده/تغییر نباشد |
| P1 | consent lineage و audit | grant/revoke با purpose/version/actor/reason بازسازی شود |
| P1 | proofing/screening timeout/retry/circuit/idempotency | provider outage و retry بدون duplicate مدیریت شود |
| P1 | trust chain اتمیک و tamper-evident | append همزمان، hash، verify و legal audit تست شود |
| P2 | SLA business calendar و escalation | overdue با تقویم/مرحله/ریسک و owner عملیاتی شود |
| P2 | تست اختصاصی سرویس | unit/integration/security/runtime evidence در CI منتشر شود |

## ۱۰. نتیجه نهایی

`party-kyc-service` از نظر breadth قابلیت‌ها کامل به‌نظر می‌رسد، اما بررسی مستقیم کد نشان داد چند نقص بنیادی دارد: **رمزنگاری با کلید پیش‌فرض، شکست uniqueness/dedup به‌دلیل IV تصادفی، نبود tenant در داده و query، ناسازگاری middleware با Fastify، migration ناکافی و پذیرش نتایج screening از caller**. بنابراین وضعیت ثبت‌شده در `TRUTH.md` برای «REAL/Production-ready» باید به «کد موجود اما عملیاتی‌سازی ناقص» اصلاح شود تا این موارد با migration، تست امنیتی و runtime evidence برطرف شوند.
