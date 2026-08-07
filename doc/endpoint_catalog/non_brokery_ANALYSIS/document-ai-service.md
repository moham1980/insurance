# Document AI Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: document-ai-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/document-ai-service/src/`

---

## ۱. مدیریت Job و چرخه حیات پردازش

### ۱.۱ عدم وجود اندپوینت ایجاد Job صریح
- **اندپوینت**: `GET /document-ai/jobs`، `GET /document-ai/jobs/:jobId`، `PATCH /document-ai/jobs/:jobId/retry`
- **اشکال**: کاتالوگ فقط اندپوینت‌های list، get و retry برای jobs دارد اما هیچ `POST /document-ai/jobs` برای ایجاد job جدید وجود ندارد. مشخص نیست job‌ها چگونه ایجاد می‌شوند — آیا به‌صورت internal توسط عملیات OCR/classify ایجاد می‌شوند یا باید توسط کلاینت ایجاد شوند؟ این ابهام باعث می‌شود مصرف‌کنندگان نتوانند job را به‌صورت صریح schedule کنند و tracking پردازش async نامشخص بماند.
- **کد**: `document-ai.consumer.ts:DocumentAiConsumer.startConsumer` — Job‌ها به‌صورت internal توسط Kafka consumer ایجاد می‌شوند. Consumer به topic‌های `insurance.document.uploaded`، `insurance.document.linked`، `insurance.claim.documents_attached` subscribe می‌کند (سطر ۵۳). برای هر event، یک job با `dedupeKey` یکتا (`{topic}:{eventId}:{documentId}`) در جدول `document_ai_jobs` ایجاد می‌کند (سطر ۱۰۸-۱۳۵). بنابراین کلاینت‌ها نمی‌توانند job ایجاد کنند — فقط با publish کردن event در Kafka.
- **وضعیت**: ✅ تأیید شد — Job‌ها فقط از طریق Kafka events ایجاد می‌شوند و هیچ REST endpoint برای ایجاد صریح job وجود ندارد. کلاینت‌هایی که نمی‌توانند event Kafka publish کنند، راهی برای schedule پردازش ندارند.

### ۱.۲ عدم cancel/abort برای job در حال اجرا
- **اندپوینت**: `PATCH /document-ai/jobs/:jobId/retry`
- **اشکال**: تنها عملیات روی job در حال اجرا، retry برای job‌های failed است. هیچ اندپوینتی برای cancel یا abort یک job در وضعیت `processing` وجود ندارد. اگر یک OCR با provider خارجی (GEMINI/DEEPSEEK) زمان‌بر شود یا کاربر اشتباهاً job را ایجاد کرده باشد، امکان توقف آن وجود ندارد و منابع پردازشی هدر می‌رود.
- **کد**: `document-ai.controller.ts:retryJob` (سطر ۶۰-۷۲) — تنها endpoint برای مدیریت job، retry است که status را به `'retry'` تغییر می‌دهد. `document-ai.service.ts:retryJob` (سطر ۴۹-۶۳) فقط `status`، `nextRunAt`، `lockedAt`، `lockedBy` و `lastErrorMessage` را reset می‌کند. هیچ endpoint‌ای برای cancel وجود ندارد. Job worker (`document-ai.job-worker.ts:tick` سطر ۷۹-۱۶۰) فقط job‌های با status `pending` یا `retry` را claim می‌کند — اگر job در `processing` باشد، worker دیگری آن را پس از انقضای lock (`DOCUMENT_AI_LOCK_TTL_MS` پیش‌فرض ۶۰۰۰۰۰ms = ۱۰ دقیقه) می‌تواند reclaim کند.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم فیلتر job بر اساس operation و بازه زمانی
- **اندپوینت**: `GET /document-ai/jobs`
- **اشکال**: query params فقط `status`، `documentId`، `tenantId`، `limit` و `offset` را پشتیبانی می‌کند. فیلتر بر اساس `operation` (نوع پردازش: OCR، classify، redact، extract) و بازه زمانی (`fromDate`/`toDate`) وجود ندارد. در عملیات عملیاتی، اپراتورها نیاز به فیلتر کردن job‌ها بر اساس نوع عملیات و زمان دارند تا بتوانند bottleneck‌ها را شناسایی کنند.
- **کد**: `document-ai.controller.ts:listJobs` (سطر ۲۴-۴۴) — پارامترهای query: `status`، `documentId`، `tenantId`، `limit`، `offset`. `document-ai.service.ts:listJobs` (سطر ۲۶-۴۳) — فقط فیلترهای `status`، `documentId`، `tenantId` در QueryBuilder اضافه می‌شوند. هیچ فیلتر `operation` یا بازه زمانی وجود ندارد. توجه: entity `DocumentAiJob` فیلد `operation` ندارد — همه job‌ها یک نوع پردازش (extract کامل) انجام می‌دهند.
- **وضعیت**: ✅ تأیید شد — علاوه بر عدم فیلتر، entity DocumentAiJob اصلاً فیلد `operation` ندارد و همه job‌ها یک نوع پردازش انجام می‌دهند.

### ۱.۴ عدم pagination مبتنی بر cursor
- **اندپوینت**: `GET /document-ai/jobs`، `GET /document-ai/audit`، `GET /document-ai/usage/daily`
- **اشکال**: تمام اندپوینت‌های list از offset-based pagination استفاده می‌کنند. برای جداول با حجم بالا (jobs و audit logs سریعاً رشد می‌کنند)، offset-based pagination کارایی پایینی دارد و در صورت insert همزمان، نتایج تکراری یا skip می‌شوند. cursor-based pagination برای این جداول ضروری است.
- **کد**: تمام endpoint‌های list در controller از `limit` و `offset` استفاده می‌کنند با cap `Math.min(parseInt(limit, 10) || 50, 200)` (سطر ۳۷، ۸۷، ۱۰۸، ۱۲۹، ۲۱۴، ۲۶۵). در service، `createQueryBuilder` با `.limit(params.limit).offset(params.offset)` (سطر ۳۹، ۷۸، ۹۵، ۱۱۷، ۱۵۴، ۱۷۸). هیچ cursor-based pagination وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۲. امنیت و کنترل دسترسی

### ۲.۱ عدم rate limiting روی OCR extract
- **اندپوینت**: `POST /api/v1/ocr/extract`
- **اشکال**: OCR extract مستقیماً فایل base64 را دریافت و پردازش می‌کند. هیچ rate limiting ای روی این اندپوینت وجود ندارد. چون OCR می‌تواند با provider خارجی (GEMINI/DEEPSEEK) باشد، فراخوانی بدون محدودیت می‌تواند به هزینه بالا و سوءاستفاده منجر شود. همچنین ارسال فایل بزرگ base64 می‌تواند حمله DoS ایجاد کند.
- **کد**: `document-ai.controller.ts:extractOcr` (سطر ۳۲۹-۳۵۵) — هیچ `ThrottlerGuard` یا rate limiting middleware وجود ندارد. endpoint با `JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard` محافظت می‌شود اما هیچ محدودیت فراخوانی ندارد. در `app.module.ts` نیز هیچ ThrottlerModule import نشده است.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم validation اندازه فایل base64 در OCR
- **اندپوینت**: `POST /api/v1/ocr/extract`
- **اشکال**: request body شامل `fileBase64` است اما هیچ محدودیتی روی اندازه آن تعریف نشده. برخلاف `POST /documents/upload` که `MAX_FILE_SIZE` 10MB دارد، OCR extract هیچ محدودیتی ندارد و می‌تواند باعث memory exhaustion شود.
- **کد**: `document-ai.controller.ts:extractOcr` (سطر ۳۳۸-۳۴۹) — تنها validation این است که `body?.fileBase64` وجود داشته باشد (سطر ۳۳۸). سپس `Buffer.from(body.fileBase64, 'base64')` ایجاد می‌شود (سطر ۳۴۳) بدون هیچ بررسی اندازه. هیچ `maxBodyLength` یا `bodyParser` limit در `main.ts` بررسی نشده است.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم tenant isolation در job query
- **اندپوینت**: `GET /document-ai/jobs`
- **اشکال**: `tenantId` به عنوان query param اختیاری است. اگر TenantGuard به‌درستی اعمال نشود، یک tenant می‌تواند job‌های tenant دیگر را با حذف tenantId ببیند. tenantId باید از token استخراج شود نه از query param قابل دستکاری.
- **کد**: `document-ai.controller.ts:listJobs` (سطر ۳۲) — `@Query('tenantId') tenantId?: string` از query param گرفته می‌شود. سپس مستقیماً به `documentAiService.listJobs({ ..., tenantId, ... })` پاس داده می‌شود (سطر ۴۲). TenantGuard (`packages/shared/src/tenant-guard.ts:TenantGuard.canActivate` سطر ۳۱-۷۳) `request.tenantId` را از `user.tenantId` یا `user.tenant_id` تنظیم می‌کند و مطابقت `x-tenant-id` header با token را بررسی می‌کند، اما controller از `req.tenantId` استفاده نمی‌کند — از query param استفاده می‌کند. بنابراین یک کاربر می‌تواند `?tenantId=other-tenant` ارسال کند و job‌های tenant دیگر را ببیند.
- **وضعیت**: ✅ تأیید شد — controller باید از `req.tenantId` (که TenantGuard تنظیم می‌کند) استفاده کند نه از query param.

### ۲.۴ عدم تفکیک permission بین redact و extract
- **اندپوینت**: `POST /document-ai/documents/:documentId/redact` (perm: `document_ai:ocr:redact`)، `POST /api/v1/ocr/extract` (perm: `document_ai:ocr:extract`)
- **اشکال**: redact که داده‌های حساس PII را دستکاری می‌کند، permission جدا دارد اما confirm که نتایج extraction را تایید می‌کند (`document_ai:ocr:confirm`) نیز جدا است. با این حال، هیچ SoD (Separation of Duties) ای بین کسی که extract می‌کند و کسی که confirm می‌کند وجود ندارد — یک کاربر با `document_ai:ocr:confirm` می‌تواند هم extract و هم confirm کند که فرآیند review را بی‌معنی می‌کند.
- **کد**: `permissions.ts:ROLE_TO_PERMISSIONS` (سطر ۱۸-۶۲) — بررسی دقیق نشان می‌دهد: `insurer_admin` و `head_office_ops` هر دو `document_ai:ocr:extract` و `document_ai:ocr:confirm` را دارند (سطر ۱۹-۴۹). اما `claims_handler` فقط `document_ai:ocr:confirm` دارد و `document_ai:ocr:extract` ندارد (سطر ۵۰). `auditor` نیز فقط `confirm` دارد (سطر ۵۱-۶۰). بنابراین SoD برای `claims_handler` و `auditor` برقرار است، اما برای admin roles برقرار نیست. هیچ enforcement مکانیکی وجود ندارد که جلوی extract و confirm توسط همان کاربر admin را بگیرد.
- **وضعیت**: ✅ تأیید شد — SoD برای admin roles (`insurer_admin`, `head_office_ops`) برقرار نیست. برای `claims_handler` و `auditor` به‌طور طبیعی برقرار است چون extract permission ندارند.

---

## ۳. یکپارچه‌سازی با document-service

### ۳.۱ عدم ارتباط document-ai با document-service برای ذخیره نتایج
- **اندپوینت**: `POST /document-ai/documents/:documentId/classify`، `POST /document-ai/documents/:documentId/redact`، `POST /document-ai/documents/:documentId/confirm`
- **اشکال**: document-ai-service با `documentId` کار می‌کند اما مشخص نیست این documentId در document-service است یا در document-ai-service. هیچ اندپوینتی برای fetch document metadata از document-service وجود ندارد. اگر document در document-service ذخیره شده، document-ai-service باید آن را fetch کند اما مکانیزم این یکپارچه‌سازی در کاتالوگ مشخص نیست.
- **کد**: `entities/DocumentEntity.ts` (سطر ۱-۵۴) — document-ai-service entity خودش را روی جدول `documents` نگاشت می‌کند. این همان جدولی است که document-service هم استفاده می‌کند. `document-ai.service.ts:redactDocument` (سطر ۱۸۷-۲۱۸) و `classifyDocument` (سطر ۲۲۰-۲۵۱) مستقیماً از `documentRepo.findOne({ where: { documentId } })` برای fetch document استفاده می‌کنند — یعنی document-ai-service مستقیماً از DB مشترک می‌خواند، نه از طریق API call به document-service. این طراحی tight coupling ایجاد می‌کند و در صورت microservice split مشکل‌ساز خواهد بود.
- **وضعیت**: ✅ تأیید شد — document-ai-service مستقیماً از جدول مشترک `documents` در DB می‌خواند، نه از طریق API. این یکپارچه‌سازی به‌جای API-based، database-sharing است.

### ۳.۲ تکرار عملیات classify بین دو سرویس
- **اندپوینت**: `POST /document-ai/documents/:documentId/classify` (document-ai-service) و `POST /documents/:documentId/classify` (document-service)
- **اشکال**: هر دو سرویس classify دارند. document-service با permission `documents:view` و document-ai-service با permission `document_ai:ocr:classify`. مشخص نیست کدام یک canonical است و آیا نتایج آن‌ها sync می‌شود. این تکرار می‌تواند به نتایج متناقض منجر شود.
- **کد**: `document-ai.controller.ts:classifyDocument` (سطر ۲۹۲-۳۰۸) با perm `document_ai:ocr:classify`. `document-ai.service.ts:classifyDocument` (سطر ۲۲۰-۲۵۱) — از `OcrRedactionService.classifyDocument(text, doc.fileName)` استفاده می‌کند و نتیجه را در `doc.documentType` و `doc.classificationConfidence` ذخیره می‌کند. هر دو سرویس روی همان جدول `documents` می‌نویسند که می‌تواند به race condition و نتایج متناقض منجر شود.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ عدم callback/webhook به سرویس فراخواننده
- **اندپوینت**: `POST /document-ai/documents/:documentId/redact`، `POST /document-ai/documents/:documentId/confirm`
- **اشکال**: عملیات AI (redact، classify، confirm) async هستند اما هیچ مکانیزم callback یا webhook برای اطلاع‌رسانی به سرویس فراخواننده (مثلاً claims-service یا underwriting-service) وجود ندارد. سرویس فراخواننده باید polling کند یا به event‌های Kafka تکیه کند که در کاتالوگ مشخص نیست.
- **کد**: `document-ai.processor.ts:processDocument` (سطر ۴۵۷-۶۸۹) — processor پس از پردازش، event‌ها را از طریق `OutboxPublisher` به Kafka منتشر می‌کند: `insurance.document.extracted` (سطر ۶۶۷) و `insurance.document.extraction.needs_review` (سطر ۶۴۱). اما endpoint‌های `redact`، `classify` و `confirm` در controller (سطر ۲۷۴-۳۲۶) هیچ event‌ای publish نمی‌کنند — این‌ها sync هستند و فقط در DB می‌نویسند. بنابراین برای redact/classify/confirm هیچ مکانیزم notification وجود ندارد.
- **وضعیت**: ✅ تأیید شد — processor برای extract اصلی event منتشر می‌کند، اما endpoint‌های redact/classify/confirm هیچ event‌ای منتشر نمی‌کنند.

---

## ۴. ارزیابی و کیفیت مدل (Eval)

### ۴.۱ عدم delete برای eval cases
- **اندپوینت**: `POST /document-ai/eval/cases`، `PATCH /document-ai/eval/cases/:caseId`
- **اشکال**: eval case می‌تواند create و update شود اما اندپوینتی برای delete وجود ندارد. eval case‌های قدیمی یا invalid در سیستم باقی می‌مانند و نتایج eval را آلوده می‌کنند. حداقل یک soft-delete یا archive نیاز است.
- **کد**: `document-ai.controller.ts` — endpoint‌های eval cases: `listEvalCases` (GET، سطر ۱۱۷)، `createEvalCase` (POST، سطر ۱۳۸)، `updateEvalCase` (PATCH، سطر ۱۷۷). هیچ `DELETE /document-ai/eval/cases/:caseId` وجود ندارد. `document-ai.service.ts` نیز متد `deleteEvalCase` ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم فیلتر eval runs بر اساس case و tag
- **اندپوینت**: `GET /document-ai/eval/runs`
- **اشکال**: query params فقط `status`، `limit` و `offset` را پشتیبانی می‌کند. فیلتر بر اساس `caseIds` یا `tags` که در `POST /document-ai/eval/runs` استفاده شده‌اند، وجود ندارد. نمی‌توان eval run‌ها را بر اساس مجموعه case‌های خاص فیلتر کرد.
- **کد**: `document-ai.controller.ts:listEvalRuns` (سطر ۲۰۳-۲۲۱) — query params: `status`، `limit`، `offset`. `document-ai.service.ts:listEvalRuns` (سطر ۱۵۱-۱۵۷) — فقط فیلتر `status` در QueryBuilder. `createEvalRun` (سطر ۱۵۹-۱۶۹) کل `body` را به‌عنوان `params` ذخیره می‌کند که می‌تواند شامل `caseIds` و `tags` باشد، اما این فیلترها در list قابل استفاده نیستند.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم مقایسه نتایج eval بین runs
- **اندپوینت**: `GET /document-ai/eval/runs/:runId/results`
- **اشکال**: نتایج یک run قابل مشاهده است اما هیچ اندپوینتی برای مقایسه نتایج بین دو run (مثلاً قبل و بعد از تغییر مدل OCR) وجود ندارد. برای ارزیابی بهبود مدل، مقایسه diff بین runs ضروری است.
- **کد**: `document-ai.controller.ts:listEvalResults` (سطر ۲۵۴-۲۷۲) — فقط results یک run را برمی‌گرداند. هیچ endpoint مقایسه‌ای وجود ندارد. `document-ai.service.ts:listEvalResults` (سطر ۱۷۵-۱۸۱) — فقط بر اساس `runId` فیلتر می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۴.۴ عدم confidence threshold قابل پیکربندی
- **اندپوینت**: `POST /document-ai/documents/:documentId/classify`، `POST /api/v1/ocr/extract`
- **اشکال**: classify و extract مقدار `confidence` برمی‌گردانند اما هیچ threshold قابل پیکربندی وجود ندارد که تعیین کند چه زمانی نتایج باید manual review شوند. یک threshold سراسری یا per-tenant باید وجود داشته باشد تا نتایج با confidence پایین به‌طور خودکار به صف review برود.
- **کد**: `document-ai.processor.ts:getConfidenceThreshold` (سطر ۱۱۶-۱۲۲) — threshold از env var `DOCUMENT_AI_CONFIDENCE_THRESHOLD` خوانده می‌شود (پیش‌فرض `0.8`). در `processDocument` (سطر ۵۶۷-۵۷۰) و `extractForEval` (سطر ۴۳۸-۴۴۲) اگر `confidence < threshold`، decision به `needs_review` تغییر می‌کند. بنابراین threshold سراسری قابل پیکربندی وجود دارد، اما per-tenant قابل پیکربندی نیست.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: threshold سراسری قابل پیکربندی از طریق env var `DOCUMENT_AI_CONFIDENCE_THRESHOLD` در `document-ai.processor.ts:getConfidenceThreshold` (سطر ۱۱۶-۱۲۲) پیاده‌سازی شده است. اما همچنان عدم پشتیبانی per-tenant threshold باقی است.

---

## ۵. استفاده و هزینه (Usage)

### ۵.۱ عدم گزارش هزینه به تفکیک provider
- **اندپوینت**: `GET /document-ai/usage/daily`
- **اشکال**: usage daily شامل `operations`، `tokens` و `cost` است اما تفکیک بر اساس provider (TESSERACT، GEMINI، DEEPSEEK) وجود ندارد. برای مدیریت هزینه، باید مشخص باشد هر provider چقدر هزینه داشته تا بتوان بهینه‌سازی provider انجام داد.
- **کد**: `entities/DocumentAiUsageDaily.ts` (سطر ۱-۳۸) — فیلدها: `tenantId`، `usageDate`، `jobsStarted`، `jobsCompleted`، `jobsFailed`، `aiRequests`، `approxInputChars`، `approxOutputChars`. هیچ فیلد `provider` یا `cost` وجود ندارد. `document-ai.processor.ts:upsertUsage` (سطر ۴۶-۹۲) فقط این فیلدها را increment می‌کند. provider در `extractedFields.aiProvider` ذخیره می‌شود اما در usage daily تجمیع نمی‌شود.
- **وضعیت**: ✅ تأیید شد — نه provider تفکیک می‌شود و نه cost ذخیره می‌شود.

### ۵.۲ عدم alerting روی هزینه و quota
- **اندپوینت**: `GET /document-ai/usage/daily`
- **اشکال**: هیچ مکانیزم alerting ای روی usage وجود ندارد. اگر یک tenant به quota خود نزدیک شود یا هزینه روزانه از حد مجاز عبور کند، هیچ notification‌ای ارسال نمی‌شود. این می‌تواند به هزینه غیرمنتظره منجر شود.
- **کد**: `document-ai.processor.ts:assertWithinBudget` (سطر ۹۴-۱۱۴) — بررسی quota در زمان پردازش انجام می‌شود: `DOCUMENT_AI_TENANT_DAILY_JOB_LIMIT` (پیش‌فرض ۲۰۰) و `DOCUMENT_AI_TENANT_DAILY_REQUEST_LIMIT` (پیش‌فرض ۵۰۰). اگر تجاوز کند، error throw می‌کند (`TENANT_DAILY_JOB_LIMIT_EXCEEDED` یا `TENANT_DAILY_REQUEST_LIMIT_EXCEEDED`) که job را به retry یا dead_letter می‌برد. اما هیچ notification یا alerting برای نزدیک شدن به quota وجود ندارد — فقط hard stop.
- **وضعیت**: ✅ تأیید شد — quota enforcement وجود دارد (hard limit) اما alerting پیش از رسیدن به limit وجود ندارد.

### ۵.۳ عدم فیلتر usage بر اساس بازه زمانی
- **اندپوینت**: `GET /document-ai/usage/daily`
- **اشکال**: فقط `usageDate` (یک روز خاص) به عنوان query param وجود دارد. فیلتر `fromDate`/`toDate` برای گزارش دوره‌ای وجود ندارد. برای گزارش ماهانه یا هفتگی، باید روز به روز fetch شود.
- **کد**: `document-ai.controller.ts:usageDaily` (سطر ۹۶-۱۱۵) — query params: `tenantId`، `usageDate`، `limit`، `offset`. `document-ai.service.ts:listUsageDaily` (سطر ۸۴-۹۹) — فقط فیلتر `tenantId` و `usageDate` (تطابق دقیق). هیچ `fromDate`/`toDate` یا range query وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۶. Audit و قابلیت ردیابی

### ۶.۱ عدم فیلتر audit بر اساس actor و بازه زمانی
- **اندپوینت**: `GET /document-ai/audit`
- **اشکال**: query params فقط `documentId`، `decision`، `tenantId`، `limit` و `offset` را پشتیبانی می‌کند. فیلتر بر اساس `actorUserId` (چه کسی تصمیم گرفته) و بازه زمانی (`fromDate`/`toDate`) وجود ندارد. برای تحقیقات امنیتی، باید بتوان audit trail یک کاربر خاص را در بازه زمانی مشخص دید.
- **کد**: `document-ai.controller.ts:listAudit` (سطر ۷۴-۹۴) — query params: `documentId`، `decision`، `tenantId`، `limit`، `offset`. `document-ai.service.ts:listAudit` (سطر ۶۵-۸۲) — فقط فیلترهای `documentId`، `decision`، `tenantId`. entity `DocumentAiAudit` فیلد `actorUserId` دارد اما در query قابل فیلتر نیست.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم export audit logs
- **اندپوینت**: `GET /document-ai/audit`
- **اشکال**: audit logs فقط به‌صورت JSON list قابل دسترسی هستند. هیچ اندپوینتی برای export به CSV یا PDF برای compliance و گزارش‌های نظارتی وجود ندارد.
- **کد**: `document-ai.controller.ts:listAudit` (سطر ۷۴-۹۴) — فقط JSON response برمی‌گرداند. هیچ endpoint export وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۷. OCR و دقت پردازش

### ۷.۱ عدم انتخاب زبان برای classify و redact
- **اندپوینت**: `POST /document-ai/documents/:documentId/classify`، `POST /document-ai/documents/:documentId/redact`
- **اشکال**: OCR extract پارامتر `language` (default: fas+eng) دارد اما classify و redact این پارامتر را ندارند. اگر document به زبان دیگری باشد، classify و redact با زبان پیش‌فرض انجام می‌شوند که می‌تواند به دقت پایین منجر شود.
- **کد**: `document-ai.controller.ts:extractOcr` (سطر ۳۴۶) — `const language = body.language || 'fas+eng'`. اما `classifyDocument` (سطر ۲۹۲-۳۰۸) و `redactDocument` (سطر ۲۷۴-۲۹۰) هیچ پارامتر `language` نمی‌پذیرند. `document-ai.service.ts:classifyDocument` (سطر ۲۲۰-۲۵۱) و `redactDocument` (سطر ۱۸۷-۲۱۸) هیچ پارامتر language ندارند.
- **وضعیت**: ✅ تأیید شد

### ۷.۲ عدم نگارش نسخه (versioning) برای نتایج redact
- **اندپوینت**: `POST /document-ai/documents/:documentId/redact`
- **اشکال**: redact یک نسخه redacted برمی‌گرداند اما هیچ versioning ای برای ذخیره نسخه‌های مختلف redact وجود ندارد. اگر redact با تنظیمات مختلف اجرا شود، نسخه قبلی از دست می‌رود. برای audit و rollback، باید history نسخه‌های redact ذخیره شود.
- **کد**: `document-ai.service.ts:redactDocument` (سطر ۱۸۷-۲۱۸) — `doc.redactedText = redaction.redactedText` و `doc.redactedSpans = redaction.spans` مستقیماً overwrite می‌شوند (سطر ۱۹۹-۲۰۰). هیچ جدول history یا version number وجود ندارد. نسخه قبلی redactedText از دست می‌رود.
- **وضعیت**: ✅ تأیید شد

---

## ۸. ذینفعان و مصرف‌کنندگان

### ۸.۱ عدم دسترسی claims-service به نتایج extraction
- **اشکال**: claims-service برای پردازش claim به نتایج extraction و classification اسناد (مثلاً بیمه‌نامه، گزارش پزشکی) نیاز دارد اما هیچ BFF یا endpoint اختصاصی برای claims-service وجود ندارد. claims-service باید مستقیماً با document-ai-service ارتباط برقرار کند که مشخص نیست چه permission‌هایی نیاز دارد.
- **کد**: `permissions.ts:ROLE_TO_PERMISSIONS` (سطر ۵۰) — `claims_handler` فقط `document_ai:jobs:list`، `document_ai:jobs:view`، `document_ai:audit:list` و `document_ai:ocr:confirm` دارد. هیچ `document_ai:ocr:extract` یا دسترسی به نتایج extraction وجود ندارد. claims-service باید از طریق Kafka event `insurance.document.extracted` (که processor منتشر می‌کند) نتایج را دریافت کند، نه از طریق REST API.
- **وضعیت**: ✅ تأیید شد — claims_handler به نتایج extraction دسترسی مستقیم ندارد. باید از Kafka events استفاده کند.

### ۸.۲ عدم یکپارچه‌سازی با underwriting-service برای document validation
- **اشکال**: underwriting-service برای ارزیابی ریسک نیاز به validate و extract اسناد هویتی و پزشکی دارد. هیچ اندپوینتی برای batch validation یا cross-check نتایج extraction با داده‌های policy وجود ندارد. این باعث می‌شود underwriting-service نتواند به‌طور خودکار صحت اسناد را تایید کند.
- **کد**: `document-ai.processor.ts:validateExtractedFields` (سطر ۲۱۲-۲۶۱) — validation structural انجام می‌شود (بررسی `nationalId` با regex `^\d{10}$`، `invoiceNumber` طول >= ۳، `licenseNumber` طول >= ۵). در سطر ۲۲۳-۲۲۶ کامنت می‌گوید "In production, call claims-service or policy-service for ground truth" اما این پیاده‌سازی نشده است. هیچ cross-check با policy-service انجام نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۸.۳ عدم notification به fraud-service برای اسناد مشکوک
- **اشکال**: وقتی OCR نتایجی با confidence پایین یا متناقض است، هیچ event‌ای به fraud-service ارسال نمی‌شود. سند مشکوک باید به‌طور خودکار به fraud-service گزارش شود اما این یکپارچه‌سازی وجود ندارد.
- **کد**: `document-ai.processor.ts:processDocument` (سطر ۶۲۷-۶۶۱) — وقتی decision != 'extracted'، event `insurance.document.extraction.needs_review` از طریق OutboxPublisher منتشر می‌شود (سطر ۶۴۱) و به orchestrator-service `POST /work-items/document-ai-review` ارسال می‌شود (سطر ۲۸۰). اما هیچ event مستقیم به fraud-service ارسال نمی‌شود. fraud-service می‌تواند از Kafka event `needs_review` استفاده کند اما این یکپارچه‌سازی صریح نیست.
- **وضعیت**: ✅ تأیید شد — event needs_review منتشر می‌شود اما هیچ routing صریح به fraud-service وجود ندارد.

### ۸.۴ عدم دسترسی customer-portal به status extraction
- **اشکال**: customer-portal برای نمایش وضعیت اسناد آپلود شده (مثلاً "در حال پردازش"، "تایید شد"، "نیاز به review") به status job نیاز دارد اما هیچ endpoint عمومی یا BFF برای customer وجود ندارد.
- **کد**: هیچ endpoint با permission محدود برای customer وجود ندارد. `document_ai:jobs:view` فقط به `insurer_admin`، `head_office_ops`، `claims_handler` و `auditor` اختصاص دارد (permissions.ts). customer-portal باید از طریق claims-service یا BFF غیرمستقیم وضعیت را ببیند.
- **وضعیت**: ✅ تأیید شد

---

## ۹. نقص‌های جدید یافت‌شده در کد

### ۹.۱ عدم بررسی Kafka در health check
- **اندپوینت**: `GET /health`
- **اشکال**: health check فقط DB را بررسی می‌کند، نه Kafka را. با اینکه سرویس به Kafka consumer وابسته است (document-ai.consumer.ts)، اگر Kafka down باشد، health check همچنان `ok` برمی‌گرداند.
- **کد**: `health.controller.ts:health` (سطر ۸-۳۴) — فقط `dataSource.query('SELECT 1')` برای DB. هیچ چکی برای Kafka connectivity وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۹.۲ AbacGuard بسیار ضعیف — اجازه همه GET‌ها برای هر کاربر authenticated
- **اندپوینت**: تمام endpoint‌ها
- **اشکال**: AbacGuard برای تمام درخواست‌های GET هر کاربر authenticated را اجازه می‌دهد (سطر ۱۵: `if (method === 'GET') return true`). برای non-GET، فقط admin roles یا هر کاربر با role را اجازه می‌دهد. این ABAC واقعی نیست — هیچ attribute-based policy‌ای بررسی نمی‌شود.
- **کد**: `abac.guard.ts:canActivate` (سطر ۵-۲۷) — `if (method === 'GET') return true` (سطر ۱۵). برای non-GET: `adminRoles = ['insurer_admin', 'head_office_ops', 'system_admin']` (سطر ۱۸)، اگر hasAdmin باشد allow (سطر ۲۲)، در غیر این صورت `return roles.length > 0` (سطر ۲۶) — یعنی هر کاربر با هر role‌ای می‌تواند non-GET انجام دهد.
- **وضعیت**: ✅ تأیید شد

### ۹.۳ عدم validation documentId در endpoint‌های redact/classify/confirm
- **اندپوینت**: `POST /document-ai/documents/:documentId/redact`، `POST /document-ai/documents/:documentId/classify`، `POST /document-ai/documents/:documentId/confirm`
- **اشکال**: documentId از path param گرفته می‌شود اما هیچ validation‌ای بررسی نمی‌کند که آیا این documentId به tenant کاربر تعلق دارد یا خیر. TenantGuard روی request تنظیم می‌شود اما service از tenantId برای فیلتر در `findOne` استفاده نمی‌کند.
- **کد**: `document-ai.service.ts:redactDocument` (سطر ۱۹۳) — `this.documentRepo.findOne({ where: { documentId: params.documentId } })` — فقط `documentId` فیلتر می‌شود، نه `tenantId`. `classifyDocument` (سطر ۲۲۶) و `confirmDocumentFields` (سطر ۲۵۹) نیز همین‌طور. اگر `tenantId` از token استخراج شود (سطر ۲۷۹، ۲۹۷، ۳۱۵) اما در query استفاده نشود، یک tenant می‌تواند document tenant دیگر را redact/classify/confirm کند.
- **وضعیت**: ✅ تأیید شد

### ۹.۴ یکپارچه‌سازی با orchestrator-service بدون authentication
- **اندپوینت**: `POST /work-items/document-ai-review` (در orchestrator-service)
- **اشکال**: processor برای routing اسناد needs_review به orchestrator-service، `fetch` بدون authentication token انجام می‌دهد. اگر orchestrator-service authentication لازم داشته باشد، این درخواست reject می‌شود.
- **کد**: `document-ai.processor.ts:routeToWorkItem` (سطر ۲۶۳-۳۰۱) — `fetch(orchUrl + '/work-items/document-ai-review', { method: 'POST', headers: { 'content-type': 'application/json', 'x-correlation-id': ... } })` — هیچ Authorization header یا service token ارسال نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۹.۵ عدم DLQ management برای job‌های dead_letter
- **اندپوینت**: `GET /document-ai/jobs`
- **اشکال**: job‌ها می‌توانند به status `dead_letter` بروند (پس از `maxAttempts` retry) اما هیچ endpoint‌ای برای list، inspect یا replay job‌های dead_letter وجود ندارد. فقط `document_ai:jobs:dlq` permission در permissions.ts تعریف شده اما هیچ endpoint‌ای از آن استفاده نمی‌کند.
- **کد**: `document-ai.job-worker.ts:tick` (سطر ۱۳۰-۱۴۳) — اگر `job.attempt >= maxAttempts`، status به `'dead_letter'` با `dlqReason = 'MAX_ATTEMPTS_EXCEEDED'` تغییر می‌کند. `permissions.ts` (سطر ۵) `document_ai:jobs:dlq` تعریف شده اما هیچ endpoint در controller از این permission استفاده نمی‌کند.
- **وضعیت**: ✅ تأیید شد
