# Document Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: document-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/document-service/src/`

---

## ۱. آپلود و ذخیره‌سازی اسناد

### ۱.۱ عدم checksum/integrity verification هنگام آپلود
- **اندپوینت**: `POST /documents/upload`
- **اشکال**: آپلود فایل multipart انجام می‌شود اما هیچ checksum (SHA-256) برای verification integrity فایل ذخیره نمی‌شود. اگر فایل در storage خراب شود یا دستکاری شود، هیچ مکانیزمی برای تشخیص وجود ندارد. برای اسناد قانونی (بیمه‌نامه، گزارش پزشکی)، integrity hash الزامی است.
- **کد**: `documents.service.ts:createFromUpload` (سطر ۱۹۳-۲۷۴) — فایل از tempPath خوانده شده و در storage ذخیره می‌شود (با optional encryption) اما هیچ SHA-256 hash محاسبه و ذخیره نمی‌شود. entity `Document` (`entities/Document.ts` سطر ۱-۵۷) هیچ فیلد `checksum` یا `digest` ندارد. توجه: سرویس `DocumentNonRepudiationService` (`document-non-repudiation.service.ts` سطر ۴۱-۴۹) متد `computeDigest` برای SHA-256 دارد اما در flow آپلود فراخوانی نمی‌شود.
- **وضعیت**: ✅ تأیید شد — سرویس NonRepudiation وجود دارد اما در flow آپلود استفاده نمی‌شود.

### ۱.۲ عدم support برای آپلود چندفایلی (bulk upload)
- **اندپوینت**: `POST /documents/upload`
- **اشکال**: هر آپلود فقط یک `file` قبول می‌کند. برای claim‌هایی که چندین سند دارند (بیمه‌نامه + گواهی پزشکی + صورت‌حساب)، باید چند بار فراخوانی شود. یک اندپوینت bulk upload با multipart می‌تواند کارایی را به‌طور قابل توجهی افزایش دهد.
- **کد**: `documents.controller.ts:upload` (سطر ۶۳-۱۹۲) — در parse multipart، `if (part.type === 'file' && !tempPath)` (سطر ۱۱۱) فقط اولین file را پردازش می‌کند. file‌های بعدی با `part.file.resume()` (سطر ۱۲۳) drain می‌شوند.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم virus scan در flow آپلود
- **اندپوینت**: `POST /documents/upload`، `POST /documents/reinsurance-invoice/upload`
- **اشکال**: هیچ اشاره‌ای به virus scanning در flow آپلود وجود ندارد. فایل‌های آپلود شده (PDF، DOC، DOCX) می‌توانند حاوی malware باشند و قبل از ذخیره در storage باید scan شوند. این یک نقص امنیتی جدی است.
- **کد**: `documents.controller.ts:upload` (سطر ۹۹-۱۹۲) و `uploadReinsuranceInvoice` (سطر ۴۲۱-۵۵۱) — هیچ virus scan یا malware check وجود ندارد. `validateFile` (سطر ۲۳-۳۲) فقط mimeType و fileSize را بررسی می‌کند. `documents.service.ts:storeFile` (سطر ۱۵۷-۱۶۷) فایل را مستقیماً در storage می‌نویسد (با optional encryption).
- **وضعیت**: ✅ تأیید شد

### ۱.۴ عدم restriction روی تعداد اسناد per claim
- **اندپوینت**: `POST /documents/upload`
- **اشکال**: `claimId` اختیاری است و هیچ محدودیتی روی تعداد اسناد مرتبط با یک claim وجود ندارد. یک کاربر می‌تواند هزاران سند به یک claim متصل کند که به storage و performance فشار می‌آورد.
- **کد**: `documents.controller.ts:upload` (سطر ۱۰۲-۱۰۳) — `claimId` از multipart field خوانده می‌شود و اختیاری است. `documents.service.ts:createFromUpload` (سطر ۲۰۳-۲۱۷) — `claimId` در document ذخیره می‌شود بدون هیچ count check. هیچ query‌ای برای شمارش اسناد موجود claim قبل از آپلود وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۲. دسترسی و امنیت دانلود

### ۲.۱ عدم انقضای قابل پیکربندی برای signed URL
- **اندپوینت**: `GET /documents/:documentId/signed-url`، `GET /documents/:documentId/download`
- **اشکال**: signed URL تولید می‌شود و `downloadUrlExpiresAt` در response وجود دارد اما مدت زمان انقضا قابل پیکربندی توسط کلاینت نیست. برای اسناد حساس (identity، medical)، مدت انقضا باید کوتاه (مثلاً ۵ دقیقه) باشد، در حالی که برای اسناد عمومی می‌تواند طولانی‌تر باشد.
- **کد**: `documents.service.ts:generateSignedUrl` (سطر ۶۸۲-۶۹۸) — متد پارامتر `ttlSeconds` با پیش‌فرض `900` (۱۵ دقیقه) دارد (سطر ۶۸۳). اما `documents.controller.ts:sanitizeDocument` (سطر ۴۱-۴۳) و `getSignedUrl` (سطر ۲۹۷) هر دو `generateSignedUrl` را بدون `ttlSeconds` فراخوانی می‌کنند — یعنی TTL همیشه ۹۰۰ ثانیه است و کلاینت نمی‌تواند آن را تغییر دهد.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم audit log برای دسترسی دانلود
- **اندپوینت**: `GET /documents/:documentId/download`
- **اشکال**: download endpoint با token عمومی (بدون JWT) کار می‌کند. هیچ audit log‌ای ثبت نمی‌شود که چه کسی، چه زمانی، چه سندی را دانلود کرده. برای compliance (GDPR و HIPAA-like)، audit log دانلود الزامی است.
- **کد**: `documents.controller.ts:download` (سطر ۳۰۱-۳۳۶) — هیچ `@UseGuards` ندارد. token با `verifySignedUrl` بررسی می‌شود (سطر ۳۱۴) که `sub` (userId) را استخراج می‌کند. اما هیچ `auditLogger.info` یا audit record برای download ثبت نمی‌شود. در مقابل، سایر endpoint‌ها (upload، link، get) همگی audit log می‌نویسند.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم IP restriction برای signed URL
- **اندپوینت**: `GET /documents/:documentId/download`
- **اشکال**: signed token هیچ IP restriction‌ای ندارد. اگر token لو برود، هر کسی از هر IP می‌تواند فایل را دانلود کند. bind کردن token به IP کلاینت (یا حداقل IP range) امنیت را افزایش می‌دهد.
- **کد**: `documents.service.ts:generateSignedUrl` (سطر ۶۸۲-۶۹۸) — payload شامل `documentId`، `tenantId`، `sub`، `exp` و `signature` است. هیچ فیلد IP وجود ندارد. `verifySignedUrl` (سطر ۷۰۰-۷۳۱) نیز هیچ IP check انجام نمی‌دهد.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ عدم watermark برای اسناد حساس
- **اندپوینت**: `GET /documents/:documentId/download`
- **اشکال**: اسناد حساس (identity، medical) بدون watermark دانلود می‌شوند. watermark با userId و timestamp می‌تواند از نشت اطلاعات جلوگیری کند یا حداقل آن را قابل ردیابی کند.
- **کد**: `documents.controller.ts:download` (سطر ۳۲۸-۳۳۲) — `getDownloadStream` فایل را مستقیماً stream می‌کند. `documents.service.ts:getDownloadStream` (سطر ۱۷۵-۱۷۸) — buffer را مستقیماً از storage می‌خواند (با decrypt) و برمی‌گرداند. هیچ watermark logic وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۳. کنترل دسترسی و ABAC

### ۳.۱ عدم ABAC برای فیلتر بر اساس documentType
- **اندپوینت**: `GET /documents`
- **اشکال**: list documents فقط فیلتر `claimId` و `reconciliationId` را پشتیبانی می‌کند. فیلتر بر اساس `documentType` وجود ندارد. یک کاربر نمی‌تواند فقط اسناد medical یا identity را ببیند. همچنین AbacGuard در کاتالوگ ذکر نشده (فقط JwtAuthGuard + PermissionsGuard + TenantGuard) که نشان می‌دهد data isolation بر اساس attribute وجود ندارد.
- **کد**: `documents.controller.ts:list` (سطر ۳۳۸-۳۷۹) — query params: `claimId`، `reconciliationId`، `limit`، `offset`. هیچ `documentType` filter. `documents.service.ts:listDocuments` (سطر ۳۶۳-۳۸۷) — فقط فیلتر `tenantId`، `claimId`، `reconciliationId` در QueryBuilder. AbacGuard (`abac.guard.ts`) وجود دارد اما بسیار ضعیف است: `if (method === 'GET') return true` (اجازه همه GET‌ها).
- **وضعیت**: ✅ تأیید شد

### ۳.۲ عدم tenant isolation در download token
- **اندپوینت**: `GET /documents/:documentId/download`
- **اشکال**: download با token عمومی است و TenantGuard اعمال نمی‌شود. اگر token شامل tenantId نباشد، یک tenant می‌تواند سند tenant دیگر را با token معتبر (اما متعلق به tenant دیگر) دانلود کند. token باید به tenant bind شود.
- **کد**: `documents.service.ts:generateSignedUrl` (سطر ۶۸۵-۶۹۰) — token شامل `tenantId` است. `verifySignedUrl` (سطر ۷۰۰-۷۳۱) — `tenantId` از token استخراج می‌شود. `download` (سطر ۳۲۳) — `getDocument(verified.documentId, verified.tenantId)` با tenantId فیلتر می‌کند. بنابراین tenantId در token وجود دارد و در query استفاده می‌شود. اما download endpoint هیچ `@UseGuards` ندارد و token یک bearer token است — هر کسی که token را داشته باشد می‌تواند دانلود کند، مستقل از tenant فعلی‌اش. token به tenant bind شده است اما به user هم bind شده (`sub`) — اما هیچ validation‌ای بررسی نمی‌کند که آیا downloader همان `sub` است یا خیر.
- **وضعیت**: ✅ تأیید شد — token شامل tenantId است و document با tenantId فیلتر می‌شود، اما token bearer است و هیچ validation‌ای بین identity downloader و `sub` در token وجود ندارد.

### ۳.۳ عدم تفکیک permission بر اساس documentType
- **اندپوینت**: `POST /documents/upload` (perm: `documents:upload`)، `GET /documents/:documentId` (perm: `documents:view`)
- **اشکال**: تمام documentType‌ها از همان permission استفاده می‌کنند. یک کاربر با `documents:view` می‌تواند اسناد medical (حساس) و اسناد invoice (عمومی) را به‌طور مساوی ببیند. برای اسناد حساس باید permission جدا (مثلاً `documents:view_medical`) یا ABAC policy وجود داشته باشد.
- **کد**: `permissions.ts` (سطر ۱-۱۶) — فقط ۴ permission: `documents:upload`، `documents:link`، `documents:view`، `documents:list`. هیچ تفکیکی بر اساس documentType وجود ندارد. `DOCUMENT_TYPES` (`documents.service.ts` سطر ۱۲-۲۰) شامل `medical_report` و `police_report` (حساس) است اما همه با همان `documents:view` قابل دسترسی هستند.
- **وضعیت**: ✅ تأیید شد

---

## ۴. پردازش اسناد (Validate، Classify، Extract)

### ۴.۱ عدم idempotency در extract
- **اندپوینت**: `POST /documents/:documentId/extract`
- **اشکال**: extract هیچ idempotency key یا جلوگیری از اجرای مجدد ندارد. اگر کلاینت به دلیل timeout درخواست را retry کند، extract دوباره اجرا می‌شود که منابع پردازشی را هدر می‌دهد. باید بررسی شود که آیا extraction قبلاً انجام شده یا در حال انجام است.
- **کد**: `documents.service.ts:startExtraction` (سطر ۵۹۵-۶۱۳) — state check وجود دارد: `if (doc.status !== 'pending' && doc.status !== 'failed')` (سطر ۶۰۰) که `BadRequestException` throw می‌کند. سپس `doc.status = 'extracting'` و `await this.documentRepo.save(doc)` (سطر ۶۰۴-۶۰۵) قبل از async extraction. این یک idempotency نسبی فراهم می‌کند — retry در حالت `extracting` یا `extracted` رد می‌شود. اما race condition وجود دارد: اگر دو درخواست همزمان قبل از save برسند، هر دو status `pending` را می‌بینند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `documents.service.ts:startExtraction` (سطر ۶۰۰-۶۰۲) state check دارد که اگر document در حالت `extracting` یا `extracted` باشد، `BadRequestException` throw می‌کند. اما race condition در concurrent requests همچنان ممکن است.

### ۴.۲ عدم async برای extract و classify
- **اندپوینت**: `POST /documents/:documentId/extract`، `POST /documents/:documentId/classify`
- **اشکال**: extract و classify به‌صورت sync طراحی شده‌اند (response فوراً برمی‌گردد). برای اسناد بزرگ، این عملیات می‌تواند زمان‌بر باشد و timeout ایجاد کند. باید async با job tracking باشد (شبیه document-ai-service).
- **کد**: `documents.service.ts:startExtraction` (سطر ۵۹۵-۶۱۳) — extract در واقع async است: status به `extracting` تنظیم می‌شود، document ذخیره می‌شود، سپس `this.processExtraction(doc, correlationId).catch(...)` (سطر ۶۰۸) در background اجرا می‌شود و document فوراً برگردانده می‌شود. اما `classifyDocument` (سطر ۵۶۲-۵۹۳) sync است — فقط بر اساس mimeType یک confidence mapping دارد و فوراً برمی‌گرداند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `startExtraction` (سطر ۵۹۵-۶۱۳) async است و `processExtraction` در background اجرا می‌شود. اما `classifyDocument` (سطر ۵۶۲-۵۹۳) همچنان sync است (البته عملیات سبکی است — فقط mimeType-based mapping).

### ۴.۳ عدم ذخیره نتایج extract و classify
- **اندپوینت**: `POST /documents/:documentId/extract`، `POST /documents/:documentId/classify`
- **اشکال**: response extract فقط metadata document را برمی‌گرداند (نه متن استخراج شده). response classify فقط `documentType` و `confidence` را برمی‌گرداند. مشخص نیست نتایج کجا ذخیره می‌شوند و آیا قابل retrieve هستند. هیچ `GET /documents/:documentId/extracted-text` وجود ندارد.
- **کد**: `documents.controller.ts:extract` (سطر ۴۰۷-۴۱۸) — `sanitizeDocument(doc, req)` برمی‌گرداند که در زمان response، `status: 'extracting'` دارد (چون async است). `processExtraction` (سطر ۶۱۵-۶۷۲) — `extractedText` و `extractedFields` در document ذخیره می‌شوند (سطر ۶۴۵-۶۴۷). `getDocument` (سطر ۳۵۹-۳۶۱) — document با `extractedText` و `extractedFields` برمی‌گردد (در `sanitizeDocument` فقط `storageRef` حذف می‌شود). بنابراین نتایج extract از طریق `GET /documents/:documentId` قابل retrieve هستند. اما `classifyDocument` (سطر ۵۶۲-۵۹۳) نتایج را در document ذخیره نمی‌کند — فقط برمی‌گرداند.
- **وضعیت**: ✅ تأیید شد (جزئی) — نتایج extract در document ذخیره و از طریق GET قابل retrieve هستند، اما endpoint اختصاصی `GET /documents/:documentId/extracted-text` وجود ندارد. نتایج classify اصلاً ذخیره نمی‌شوند.

### ۴.۴ تکرار classify با document-ai-service
- **اندپوینت**: `POST /documents/:documentId/classify`
- **اشکال**: document-service و document-ai-service هر دو classify دارند. مشخص نیست کدام canonical است. اگر document-service classify را مستقیماً انجام می‌دهد (نه از طریق document-ai-service)، دو مسیر پردازش موازی وجود دارد که می‌تواند به نتایج متناقض منجر شود.
- **کد**: `documents.service.ts:classifyDocument` (سطر ۵۶۲-۵۹۳) — classify ساده بر اساس mimeType انجام می‌دهد (mapping از mimeType به confidence). هیچ AI/OCR استفاده نمی‌کند. `document-ai-service` classify با OCR و AI انجام می‌دهد. این دو مسیر متفاوت هستند و نتایج متناقض می‌دهند. document-service classify با perm `documents:view` و document-ai-service با perm `document_ai:ocr:classify`.
- **وضعیت**: ✅ تأیید شد — document-service classify فقط mimeType-based است (بدون AI) در حالی که document-ai-service classify با AI انجام می‌شود. دو مسیر متفاوت.

---

## ۵. Retention و چرخه حیات اسناد

### ۵.۱ عدم retention policy
- **اندپوینت**: `POST /documents/upload`، `GET /documents`
- **اشکال**: هیچ retention policy‌ای تعریف نشده. اسناد برای همیشه ذخیره می‌شوند. برای compliance و مدیریت storage، باید retention policy بر اساس documentType وجود داشته باشد (مثلاً اسناد identity: ۵ سال پس از انقضای بیمه‌نامه، اسناد medical: ۱۰ سال).
- **کد**: entity `Document` (`entities/Document.ts` سطر ۱-۵۷) — هیچ فیلد `retentionUntil` یا `expiresAt` وجود ندارد. هیچ cron job یا scheduler‌ای برای purge اسناد قدیمی در کل سرویس وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم legal hold
- **اندپوینت**: `DELETE /documents/:documentId` (وجود ندارد)
- **اشکال**: هیچ اندپوینت delete‌ای وجود ندارد که هم خوب است (جلوگیری از حذف تصادفی) و هم بد (عدم توانایی پاک کردن اسناد غیرقانونی). اما مهم‌تر، هیچ legal hold endpoint‌ای وجود ندارد که اسناد مرتبط با تحقیقات legal را از retention/deletion محافظت کند.
- **کد**: هیچ `DELETE` endpoint در `documents.controller.ts` وجود ندارد. هیچ فیلد `legalHold` در entity Document وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم soft-delete و recovery
- **اشکال**: هیچ مکانیزم soft-delete‌ای وجود ندارد. اگر سندی به‌اشتباه "حذف" شود (مثلاً از طریق storage admin)، هیچ راهی برای recovery وجود ندارد. soft-delete با retention period برای recovery الزامی است.
- **کد**: هیچ فیلد `deletedAt` یا `isDeleted` در entity Document وجود ندارد. هیچ soft-delete mechanism‌ای در service پیاده‌سازی نشده است.
- **وضعیت**: ✅ تأیید شد

---

## ۶. Reinsurance Invoice و Reconciliation

### ۶.۱ عدم validation reconciliationId با reinsurance-service
- **اندپوینت**: `POST /documents/reinsurance-invoice/upload`، `POST /documents/reinsurance-invoice/link`
- **اشکال**: `reconciliationId` در request body ارسال می‌شود اما هیچ validation‌ای بررسی نمی‌کند که آیا این reconciliationId در reinsurance-service وجود دارد یا خیر. می‌توان invoice را به reconciliation ناموجود متصل کرد.
- **کد**: `documents.controller.ts:uploadReinsuranceInvoice` (سطر ۴۲۱-۵۵۱) — `reconciliationId` از multipart field خوانده می‌شود (سطر ۴۵۹) و فقط بررسی غیرخالی بودن می‌شود (سطر ۴۹۳). `documents.service.ts:createReinsuranceInvoiceArtifact` (سطر ۳۸۹-۴۵۶) — `reconciliationId` مستقیماً در document ذخیره می‌شود بدون هیچ validation با reinsurance-service. هیچ fetch یا API call به reinsurance-service وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم pagination در GET reconciliation artifacts
- **اندپوینت**: `GET /documents/reconciliation/:reconciliationId`
- **اشکال**: این اندپوینت تمام artifacts را به‌صورت array برمی‌گرداند بدون pagination. اگر یک reconciliation صدها invoice داشته باشد، response بسیار بزرگ می‌شود. pagination لازم است.
- **کد**: `documents.controller.ts:getReconciliationArtifacts` (سطر ۶۰۶-۶۲۷) — `docs.map((doc) => this.sanitizeDocument(doc, req))` برمی‌گرداند. `documents.service.ts:getReconciliationArtifacts` (سطر ۵۲۵-۵۳۰) — `this.documentRepo.find({ where: { reconciliationId, tenantId }, order: { createdAt: 'DESC' } })` — تمام results بدون limit/offset.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم فیلتر artifacts بر اساس documentType و تاریخ
- **اندپوینت**: `GET /documents/reconciliation/:reconciliationId`
- **اشکال**: فیلتر بر اساس `documentType` یا بازه زمانی `fromDate`/`toDate` وجود ندارد. تمام artifacts بدون تفکیک برمی‌گردند.
- **کد**: `documents.service.ts:getReconciliationArtifacts` (سطر ۵۲۵-۵۳۰) — فقط `reconciliationId` و `tenantId` در `where` clause. هیچ فیلتر `documentType` یا `createdAt` range.
- **وضعیت**: ✅ تأیید شد

---

## ۷. Versioning و تاریخچه اسناد

### ۷.۱ عدم versioning برای اسناد
- **اندپوینت**: `POST /documents/upload`، `POST /documents/link`
- **اشکال**: اگر نسخه جدیدی از یک سند آپلود شود، سند جدید با documentId جدید ایجاد می‌شود. هیچ ارتباطی بین نسخه‌های مختلف یک سند وجود ندارد. برای اسناد قانونی، versioning (نسخه ۱، ۲، ۳) و link بین نسخه‌ها الزامی است.
- **کد**: `documents.service.ts:createFromUpload` (سطر ۲۰۳) — `documentId: uuidv4()` همیشه یک ID جدید تولید می‌کند. entity Document هیچ فیلد `parentDocumentId` یا `version` ندارد.
- **وضعیت**: ✅ تأیید شد

### ۷.۲ عدم history/metadata برای تغییرات
- **اندپوینت**: `GET /documents/:documentId`
- **اشکال**: document metadata فقط شامل `createdAt` است. هیچ `updatedAt` یا history تغییرات (مثلاً تغییر documentType، link به claim دیگر) وجود ندارد. audit trail تغییرات سند ذخیره نمی‌شود.
- **کد**: entity `Document` (سطر ۵۲-۵۶) — `@CreateDateColumn` و `@UpdateDateColumn` وجود دارد (یعنی `updatedAt` ذخیره می‌شود). اما هیچ جدول history یا audit trail برای تغییرات وجود ندارد. `sanitizeDocument` (سطر ۳۸-۵۱) — `updatedAt` در response نیست (فقط `...rest` بدون `updatedAt` — در واقع `...rest` شامل `updatedAt` است چون `@UpdateDateColumn` در entity است). اما هیچ history‌ای از تغییرات ذخیره نمی‌شود.
- **وضعیت**: ✅ تأیید شد — `updatedAt` وجود دارد اما history تغییرات ذخیره نمی‌شود.

---

## ۸. ذینفعان و مصرف‌کنندگان

### ۸.۱ عدم دسترسی claims-service به document lifecycle کامل
- **اشکال**: claims-service برای مدیریت claim نیاز به upload، list، download و validate اسناد دارد. اما هیچ BFF یا endpoint اختصاصی برای claims-service وجود ندارد. claims-service باید مستقیماً با document-service ارتباط برقرار کند و مشخص نیست آیا permission `documents:upload` و `documents:view` به claims-service اختصاص داده شده است یا خیر.
- **کد**: `permissions.ts` (سطر ۸) — `claims_handler` دارای `documents:upload`، `documents:link`، `documents:view`، `documents:list` است. بنابراین claims_handler دسترسی کامل دارد. اما هیچ endpoint اختصاصی یا BFF برای claims-service وجود ندارد — باید مستقیماً REST API را فراخوانی کند.
- **وضعیت**: ✅ تأیید شد — claims_handler permission‌های لازم را دارد اما هیچ BFF یا endpoint اختصاصی وجود ندارد.

### ۸.۲ عدم یکپارچه‌سازی با notification-service برای status extraction
- **اشکال**: وقتی extraction یا classification کامل می‌شود، باید customer یا agent مطلع شود. اما هیچ event‌ای به notification-service ارسال نمی‌شود (در کاتالوگ فقط kafka در health check ذکر شده اما event‌های business مشخص نیست).
- **کد**: `documents.service.ts:processExtraction` (سطر ۶۱۵-۶۷۲) — پس از تکمیل extraction، event `insurance.document.extraction_completed` از طریق `OutboxPublisher` به Kafka منتشر می‌شود (سطر ۶۵۶-۶۷۱). notification-service می‌تواند این event را consume کند. اما هیچ event مستقیم به notification-service ارسال نمی‌شود — فقط Kafka event.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `processExtraction` (سطر ۶۵۶-۶۷۱) event `insurance.document.extraction_completed` را از طریق OutboxPublisher به Kafka منتشر می‌کند. notification-service می‌تواند این event را consume کند.

### ۸.۳ عدم دسترسی customer-portal-bff به آپلود امن
- **اشکال**: customer-portal-bff برای آپلود اسناد توسط مشتری نیاز به endpoint امن دارد. اما `POST /documents/upload` با `documents:upload` permission است که احتمالاً به customer اختصاص ندارد. یک endpoint با scope محدود‌تر (مثلاً فقط documentType identity با virus scan اجباری) برای customer نیاز است.
- **کد**: `permissions.ts` (سطر ۱۰-۱۴) — `call_center`، `agency_owner`، `agency_staff`، `broker_owner`، `broker_staff` همگی `documents:upload` و `documents:link` دارند اما `documents:view` و `documents:list` ندارند. هیچ role `customer` یا `customer_portal` تعریف نشده است. بنابراین مشتری مستقیماً نمی‌تواند آپلود کند.
- **وضعیت**: ✅ تأیید شد — هیچ role برای customer تعریف نشده است.

### ۸.۴ عدم sync با document-ai-service برای نتایج OCR
- **اشکال**: document-service extract دارد و document-ai-service نیز OCR extract دارد. مشخص نیست آیا document-service نتایج extract را از document-ai-service می‌گیرد یا مستقل انجام می‌دهد. این عدم وضوح می‌تواند به data inconsistency منجر شود.
- **کد**: `documents.service.ts:processExtraction` (سطر ۶۱۵-۶۷۲) — `fetch(ocrUrl + '/extract', { method: 'POST', ... })` (سطر ۶۲۸) که `ocrUrl` از `OCR_ENGINE_URL` یا `DOCUMENT_AI_SERVICE_URL` گرفته می‌شود (سطر ۶۱۶). بنابراین document-service مستقیماً document-ai-service (یا OCR engine) را برای extraction فراخوانی می‌کند. اما document-ai-service endpoint `/extract` دارد که در controller با `/api/v1/ocr/extract` متفاوت است — ممکن است به یک OCR engine قدیمی اشاره کند. همچنین document-ai-service از طریق Kafka consumer همزمان پردازش می‌کند که می‌تواند به race condition منجر شود.
- **وضعیت**: ✅ تأیید شد — document-service از طریق HTTP fetch به OCR engine فراخوانی می‌کند، اما document-ai-service همزمان از طریق Kafka هم پردازش می‌کند. دو مسیر پردازش موازی وجود دارد.

---

## ۹. نقص‌های جدید یافت‌شده در کد

### ۹.۱ عدم audit log در endpoint download
- **اندپوینت**: `GET /documents/:documentId/download`
- **اشکال**: endpoint download هیچ audit log‌ای ثبت نمی‌کند. در حالی که سایر endpoint‌ها (upload، link، get) همگی audit log می‌نویسند، download که مهم‌ترین عملیات از نظر compliance است، no audit دارد.
- **کد**: `documents.controller.ts:download` (سطر ۳۰۱-۳۳۶) — هیچ `auditLogger.info` یا audit record وجود ندارد. در مقابل، `upload` (سطر ۷۴)، `link` (سطر ۲۰۱)، `get` (سطر ۲۶۴) همگی audit log می‌نویسند.
- **وضعیت**: ✅ تأیید شد

### ۹.۲ race condition در startExtraction
- **اندپوینت**: `POST /documents/:documentId/extract`
- **اشکال**: state check در `startExtraction` بین read و write race condition دارد. اگر دو درخواست همزمان برسند، هر دو status `pending` را می‌بینند و هر دو extraction را شروع می‌کنند.
- **کد**: `documents.service.ts:startExtraction` (سطر ۵۹۵-۶۱۳) — `getDocument` (سطر ۵۹۶) status را می‌خواند، `if (doc.status !== 'pending' && doc.status !== 'failed')` (سطر ۶۰۰) بررسی می‌کند، سپس `doc.status = 'extracting'; await this.documentRepo.save(doc)` (سطر ۶۰۴-۶۰۵). بین read و save، یک درخواست دیگر می‌تواند همان document را بخواند و در status `pending` ببیند. هیچ optimistic locking یا SELECT FOR UPDATE وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۹.۳ عدم authentication در فراخوانی OCR engine
- **اندپوینت**: `POST /documents/:documentId/extract` (داخلی)
- **اشکال**: `processExtraction` به OCR engine (یا document-ai-service) fetch می‌زند بدون هیچ authentication token. اگر OCR engine authentication لازم داشته باشد، درخواست reject می‌شود.
- **کد**: `documents.service.ts:processExtraction` (سطر ۶۲۵-۶۳۸) — `fetch(ocrUrl + '/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ... })` — هیچ Authorization header یا service token ارسال نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۹.۴ عدم validation storageRef در upload (فقط در link)
- **اندپوینت**: `POST /documents/upload`
- **اشکال**: `validateStorageRef` فقط در `linkDocument` فراخوانی می‌شود، نه در `createFromUpload`. در upload، storageRef توسط service تولید می‌شود که امن است، اما اگر در آینده مسیر upload تغییر کند، validation وجود ندارد.
- **کد**: `documents.service.ts:linkDocument` (سطر ۲۸۵) — `this.validateStorageRef(params.file.storageRef, params.tenantId)` فراخوانی می‌شود. `createFromUpload` (سطر ۱۹۳-۲۷۴) — هیچ `validateStorageRef` فراخوانی نمی‌شود (اما storageRef توسط `prepareUpload` تولید می‌شود که امن است).
- **وضعیت**: ✅ تأیید شد (ریسک پایین — storageRef در upload توسط service تولید می‌شود)

### ۹.۵ عدم encryption-at-rest به‌صورت پیش‌فرض
- **اندپوینت**: `POST /documents/upload`
- **اشکال**: encryption-at-rest فقط با env var `DOCUMENT_ENCRYPT_AT_REST=true` فعال می‌شود. پیش‌فرض غیرفعال است. اسناد حساس (medical، identity) به‌صورت plaintext در storage ذخیره می‌شوند.
- **کد**: `documents.service.ts:getEncryptionKey` (سطر ۷۱-۸۲) — `if (process.env.DOCUMENT_ENCRYPT_AT_REST !== 'true') return null`. `isEncryptedStorage` (سطر ۸۴-۸۶) — اگر key null باشد، `false` برمی‌گرداند. `storeFile` (سطر ۱۵۷-۱۶۷) — اگر encrypted نباشد، فایل مستقیماً ذخیره می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۹.۶ عدم استفاده از DocumentNonRepudiationService در flow آپلود
- **اندپوینت**: `POST /documents/upload`
- **اشکال**: سرویس `DocumentNonRepudiationService` با قابلیت SHA-256 digest و RS256 signature وجود دارد اما در flow آپلود استفاده نمی‌شود. این سرویس می‌تواند integrity verification را فراهم کند اما dead code است.
- **کد**: `document-non-repudiation.service.ts:computeDigest` (سطر ۴۱-۴۹) و `signDocument` (سطر ۵۱-۹۱) — پیاده‌سازی شده اما در `documents.controller.ts` یا `documents.service.ts` import یا فراخوانی نمی‌شوند.
- **وضعیت**: ✅ تأیید شد
